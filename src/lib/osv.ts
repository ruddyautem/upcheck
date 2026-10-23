import semver from 'semver';
import type { AdvisorySeverity, SecurityAdvisory } from '@/types';
import { fetchJson, mapConcurrent } from './http';

interface OsvRange {
  type: string;
  events: Array<{ introduced?: string; fixed?: string; last_affected?: string; limit?: string }>;
}
export interface OsvDetail {
  id: string;
  modified?: string;
  summary?: string;
  details?: string;
  published?: string;
  database_specific?: { severity?: string };
  affected?: Array<{ package?: { name?: string; ecosystem?: string }; ranges?: OsvRange[] }>;
}
interface OsvBatchResult { vulns?: Array<{ id: string; modified?: string }>; next_page_token?: string }
const detailCache = new Map<string, { value: OsvDetail; expiresAt: number; bytes: number }>();
let cachedBytes = 0;
const CACHE_TTL = 15 * 60 * 1000;
const MAX_DETAILS = 1000;

async function getDetail(id: string, modified: string | undefined, signal?: AbortSignal) {
  const cached = detailCache.get(id);
  if (cached && cached.expiresAt > Date.now() && (!modified || cached.value.modified === modified)) return cached.value;
  const value = await fetchJson<OsvDetail>(`https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`, { signal }, 256 * 1024);
  if (value.id !== id) throw new Error('Invalid security advisory response.');
  const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
  const previous = detailCache.get(id);
  if (previous) { cachedBytes -= previous.bytes; detailCache.delete(id); }
  while (detailCache.size && (detailCache.size >= 500 || cachedBytes + bytes > 8 * 1024 * 1024)) {
    const oldest = detailCache.keys().next().value!;
    cachedBytes -= detailCache.get(oldest)!.bytes;
    detailCache.delete(oldest);
  }
  detailCache.set(id, { value, bytes, expiresAt: Date.now() + CACHE_TTL });
  cachedBytes += bytes;
  return value;
}

// Match the interval containing this version, rather than picking a fix from another
// package or release line. Unfixed intervals intentionally have no suggested fix.
export function getAffectedRange(detail: OsvDetail, name: string, version: string) {
  const intervals: Array<{ range: string; fixedIn?: string }> = [];
  for (const affected of detail.affected || []) {
    if (affected.package?.name !== name || affected.package.ecosystem !== 'npm') continue;
    for (const range of affected.ranges || []) {
      if (range.type !== 'SEMVER') continue;
      let introduced = '0';
      for (const event of range.events) {
        if (event.introduced !== undefined) introduced = event.introduced;
        const end = event.fixed || event.last_affected || event.limit;
        if (!end) continue;
        if (!semver.valid(end) || (introduced !== '0' && !semver.valid(introduced))) continue;
        const lower = introduced === '0' ? '' : `>=${introduced}`;
        const interval = `${lower} ${event.last_affected ? '<=' : '<'}${end}`.trim();
        if (semver.satisfies(version, interval, { includePrerelease: true })) {
          intervals.push({ range: interval, fixedIn: event.fixed });
        }
        introduced = '';
      }
      if (introduced && (introduced === '0' || semver.valid(introduced))) {
        const interval = introduced === '0' ? '*' : `>=${introduced}`;
        if (semver.satisfies(version, interval, { includePrerelease: true })) intervals.push({ range: interval });
      }
    }
  }
  return {
    affectedRange: intervals.map((item) => item.range).join(' || ') || 'See advisory for affected versions',
    fixedIn: intervals.length && intervals.every((item) => item.fixedIn)
      ? intervals.map((item) => item.fixedIn!).sort(semver.rcompare)[0] : undefined,
  };
}

export async function queryOSVBatch(packages: Array<{ name: string; version: string }>, signal?: AbortSignal) {
  const result = new Map<string, SecurityAdvisory[]>();
  if (!packages.length) return result;
  const records = packages.map(() => new Map<string, { id: string; modified?: string }>());
  let pending = packages.map((pkg, index) => ({ ...pkg, index, page_token: undefined as string | undefined }));
  for (let page = 0; pending.length; page++) {
    signal?.throwIfAborted();
    if (page >= 5) throw new Error('Security lookup exceeded its page limit. Try a smaller manifest.');
    const data = await fetchJson<{ results: OsvBatchResult[] }>('https://api.osv.dev/v1/querybatch', {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries: pending.map((pkg) => ({ package: { name: pkg.name, ecosystem: 'npm' }, version: pkg.version, page_token: pkg.page_token })) }),
    });
    if (!Array.isArray(data.results) || data.results.length !== pending.length) throw new Error('Incomplete security lookup response.');
    const next: typeof pending = [];
    data.results.forEach((entry, index) => {
      const pkg = pending[index];
      if (!entry || (entry.vulns !== undefined && !Array.isArray(entry.vulns))) throw new Error('Invalid security lookup response.');
      for (const vuln of entry.vulns || []) {
        if (!vuln || typeof vuln.id !== 'string') throw new Error('Invalid advisory identifier.');
        records[pkg.index].set(vuln.id, vuln);
      }
      if (entry.next_page_token) next.push({ ...pkg, page_token: entry.next_page_token });
    });
    pending = next;
  }
  const unique = new Map(records.flatMap((record) => Array.from(record.entries())));
  // Stop explicitly if the workload is excessive; never silently omit severity.
  if (unique.size > MAX_DETAILS) throw new Error('Too many advisories for one scan. Try a smaller manifest.');
  const details = new Map(await mapConcurrent(Array.from(unique.values()), 6, async (vuln) => {
    signal?.throwIfAborted();
    return [vuln.id, await getDetail(vuln.id, vuln.modified, signal)] as const;
  }));
  const rank: Record<AdvisorySeverity, number> = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1, UNKNOWN: 0 };
  packages.forEach((pkg, index) => {
    const advisories = Array.from(records[index].keys()).map((id): SecurityAdvisory => {
      const detail = details.get(id)!;
      const declared = detail.database_specific?.severity?.toUpperCase();
      const severity: AdvisorySeverity = declared === 'MEDIUM' ? 'MODERATE'
        : declared && Object.hasOwn(rank, declared) ? declared as AdvisorySeverity : 'UNKNOWN';
      return {
        id, title: detail.summary || id, summary: detail.details || detail.summary || id, severity,
        ...getAffectedRange(detail, pkg.name, pkg.version),
        advisoryUrl: id.startsWith('GHSA') ? `https://github.com/advisories/${encodeURIComponent(id)}` : `https://osv.dev/vulnerability/${encodeURIComponent(id)}`,
        publishedAt: detail.published,
      };
    });
    advisories.sort((a, b) => rank[b.severity] - rank[a.severity]);
    result.set(`${pkg.name}@${pkg.version}`, advisories);
  });
  return result;
}
