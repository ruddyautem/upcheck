import semver from 'semver';
import type { PackageAnalysis, RepoAnalysisResult, RepoMeta, UpdateCategory, HealthScore, SemverDiffInfo, RawPackageJson, DependencyGroup } from '@/types';
import { CATEGORY_CONFIGS } from './categories';
import { DEPENDENCY_GROUPS, isValidPackageManifest, resolvePackageSpec } from './manifest';
import { fetchJson, mapConcurrent } from './http';
import { queryOSVBatch } from './osv';

export function cleanSemver(spec: string): string {
  return resolvePackageSpec('package', spec)?.version || '';
}

export function computeSemverDiff(current: string, latest: string): SemverDiffInfo {
  const cur = semver.parse(current);
  const lat = semver.parse(latest);
  const empty = { majorDiff: 0, minorDiff: 0, patchDiff: 0 };
  if (!cur || !lat) return { type: 'unknown', ...empty };
  if (!semver.gt(lat, cur)) return { type: 'none', ...empty };
  const type = lat.major > cur.major ? 'major' : lat.minor > cur.minor ? 'minor' : lat.patch > cur.patch ? 'patch' : 'prerelease';
  return { type, majorDiff: Math.max(0, lat.major - cur.major), minorDiff: Math.max(0, lat.minor - cur.minor), patchDiff: Math.max(0, lat.patch - cur.patch) };
}

interface NpmMetadata {
  version?: string;
  deprecated?: string;
  homepage?: string;
  repository?: string | { url?: string };
  time?: Record<string, string>;
}

function safeRepositoryUrl(repository: NpmMetadata['repository']) {
  const raw = typeof repository === 'string' ? repository : repository?.url;
  if (typeof raw !== 'string') return undefined;
  try {
    const url = new URL(raw.replace(/^git\+/, '').replace(/\.git$/, ''));
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch { return undefined; }
}

async function fetchNpmMetadata(name: string, signal?: AbortSignal) {
  try {
    // A single version document avoids downloading every historical release.
    const data = await fetchJson<NpmMetadata>('https://registry.npmjs.org/' + encodeURIComponent(name) + '/latest', {
      signal, headers: { Accept: 'application/json' },
    }, 512 * 1024);
    const latestVersion = data.version;
    if (!latestVersion || !semver.valid(latestVersion)) return null;
    return { latestVersion, deprecatedReason: typeof data.deprecated === 'string' ? data.deprecated : null,
      repositoryUrl: safeRepositoryUrl(data.repository), publishedAt: data.time?.[latestVersion] };
  } catch { signal?.throwIfAborted(); return null; }
}

// Calculate Health Score (0-100) & Letter Grade
export function calculateHealthScore(counts: RepoAnalysisResult['summaryCounts'], total: number): HealthScore {
  if (total === 0) {
    return {
      score: 100,
      grade: 'A+',
      label: 'Perfect',
      color: 'text-emerald-400',
      description: 'No dependencies to audit.',
    };
  }

  let penalty = 0;
  // Critical vulnerabilities are severe
  penalty += counts.critical * 25;
  // Moderate security advisories
  penalty += counts.security * 12;
  // Deprecated packages (maintainer abandoned)
  penalty += counts.deprecated * 10;
  // Major updates (technical debt & breaking changes)
  penalty += counts.major * 4;
  // Minor updates
  penalty += counts.minor * 1.5;
  // Patch updates
  penalty += counts.patch * 0.5;
  penalty += (counts.unknown || 0) * 10;

  const rawScore = Math.max(0, Math.round(100 - penalty));

  let grade: HealthScore['grade'] = 'F';
  let label = 'Critical Risks';
  let color = 'text-red-400';
  let description = 'Urgent vulnerabilities and outdated dependencies present high risk.';

  if (rawScore >= 95) {
    grade = 'A+';
    label = 'Pristine';
    color = 'text-emerald-400';
    description = 'No significant issues were found in the analyzed dependency declarations.';
  } else if (rawScore >= 85) {
    grade = 'A';
    label = 'Healthy';
    color = 'text-emerald-400';
    description = 'Repository dependencies are actively maintained with minimal debt.';
  } else if (rawScore >= 70) {
    grade = 'B';
    label = 'Good';
    color = 'text-sky-400';
    description = 'Good health with a few minor or patch upgrades available.';
  } else if (rawScore >= 55) {
    grade = 'C';
    label = 'Needs Work';
    color = 'text-amber-400';
    description = 'Moderate technical debt with multiple major updates or warnings.';
  } else if (rawScore >= 40) {
    grade = 'D';
    label = 'Degraded';
    color = 'text-orange-400';
    description = 'Substantial security or major version lag requires refactoring.';
  }

  return {
    score: rawScore,
    grade,
    label,
    color,
    description,
  };
}

// A major version jump signals migration risk, but the exact API changes require
// the package's release notes. Avoid asserting package-specific breaks without them.
export function getBreakingWarning(
  packageName: string,
  currentVer: string,
  latestVer: string,
  majorDiff: number
): string | undefined {
  if (majorDiff <= 0) return undefined;

  return `${packageName} ${currentVer} → ${latestVer} crosses ${majorDiff} major version${majorDiff > 1 ? 's' : ''}. Imports, APIs, configuration, or runtime requirements may change. Review this package's migration notes before updating.`;
}


export async function analyzeDependencies(packageJson: RawPackageJson, repoInfo: RepoMeta, signal?: AbortSignal): Promise<RepoAnalysisResult> {
  const controller = new AbortController();
  const workSignal = AbortSignal.any([controller.signal, AbortSignal.timeout(60_000), ...(signal ? [signal] : [])]);
  try { return await analyzeManifest(packageJson, repoInfo, workSignal); }
  finally { controller.abort(); }
}

async function analyzeManifest(packageJson: RawPackageJson, repoInfo: RepoMeta, signal: AbortSignal): Promise<RepoAnalysisResult> {
  if (!isValidPackageManifest(packageJson)) throw new Error('Invalid package.json dependency declarations.');
  const entries = new Map<string, { name: string; spec: string; groups: DependencyGroup[] }>();
  for (const group of DEPENDENCY_GROUPS) {
    for (const [name, spec] of Object.entries(packageJson[group] || {})) {
      const existing = entries.get(name);
      if (existing) existing.groups.push(group);
      else entries.set(name, { name, spec, groups: [group] });
    }
  }
  const all = Array.from(entries.values()).map((entry) => {
    const declaredSpecs = Object.fromEntries(entry.groups.map((group) => [group, packageJson[group]![entry.name]]));
    const resolutions = Object.values(declaredSpecs).map((spec) => resolvePackageSpec(entry.name, spec));
    const valid = resolutions.filter((item) => item !== null).sort((a, b) => semver.compare(a.version, b.version));
    const conflicting = valid.length !== resolutions.length || new Set(valid.map((item) => item.registryName)).size > 1;
    return { ...entry, declaredSpecs, resolutions: valid, resolved: conflicting ? null : valid[0] ?? null };
  });
  const supported = Array.from(new Map(all.flatMap((entry) => entry.resolutions.map((item) => [item.registryName + '@' + item.version, { name: item.registryName, version: item.version }] as const))).values());
  const names = Array.from(new Set(supported.map((pkg) => pkg.name)));
  const [metadataEntries, advisoriesMap] = await Promise.all([
    mapConcurrent(names, 8, async (name) => [name, await fetchNpmMetadata(name, signal)] as const),
    queryOSVBatch(supported, signal),
  ]);
  const metadata = new Map(metadataEntries);
  const counts = { critical: 0, security: 0, deprecated: 0, major: 0, minor: 0, patch: 0, up_to_date: 0, unknown: 0 };
  const packages: PackageAnalysis[] = all.map((entry) => {
    const resolved = entry.resolved;
    const npm = resolved ? metadata.get(resolved.registryName) : null;
    const currentVersion = resolved?.version || entry.spec;
    const latestVersion = npm?.latestVersion || '';
    const advisories = Array.from(new Map(entry.resolutions.flatMap((item) => (advisoriesMap.get(item.registryName + '@' + item.version) || []).map((advisory) => [advisory.id, advisory] as const))).values());
    const updateDiff = computeSemverDiff(currentVersion, latestVersion);
    let category: UpdateCategory;
    if (advisories.some((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH')) category = 'critical';
    else if (advisories.length) category = 'security';
    else if (!npm || !resolved) category = 'unknown';
    else if (npm.deprecatedReason) category = 'deprecated';
    else if (updateDiff.type === 'major') category = 'major';
    else if (updateDiff.type === 'minor') category = 'minor';
    else if (updateDiff.type === 'patch' || updateDiff.type === 'prerelease') category = 'patch';
    else category = 'up_to_date';
    counts[category]++;
    const urgency = { critical: 5, security: 4, deprecated: 4, unknown: 3, major: 3, minor: 2, patch: 1, up_to_date: 0 };
    // Keep the TypeScript 7 hold even when security/deprecation takes precedence.
    const isUpdateDeferred = resolved?.registryName === 'typescript' && Boolean(latestVersion && semver.major(latestVersion) >= 7);
    return {
      name: entry.name, currentSpec: entry.spec, currentVersion, latestVersion,
      category, categoryLabel: CATEGORY_CONFIGS[category].label, urgencyScore: urgency[category],
      isDevDependency: entry.groups.includes('devDependencies'), isPeerDependency: entry.groups.includes('peerDependencies'),
      dependencyGroups: entry.groups, declaredSpecs: entry.declaredSpecs,
      registryName: resolved?.registryName, versionSource: resolved?.source || 'unsupported',
      deprecatedReason: npm?.deprecatedReason, repositoryUrl: npm?.repositoryUrl,
      npmUrl: 'https://www.npmjs.com/package/' + encodeURIComponent(resolved?.registryName || entry.name),
      latestPublishedAt: npm?.publishedAt, advisories, updateDiff,
      hasBreakingChanges: updateDiff.majorDiff > 0,
      breakingWarning: getBreakingWarning(entry.name, currentVersion, latestVersion, updateDiff.majorDiff), isUpdateDeferred,
    };
  });
  packages.sort((a, b) => b.urgencyScore - a.urgencyScore || a.name.localeCompare(b.name));
  const isIncomplete = all.some((entry) => !entry.resolved || !metadata.get(entry.resolved.registryName))
    || packages.some((pkg) => pkg.advisories.some((advisory) => advisory.severity === 'UNKNOWN'));
  return {
    repoInfo, originalManifest: packageJson, isIncomplete,
    isEstimated: all.some((entry) => entry.resolutions.some((item) => item.source === 'range') || new Set(entry.resolutions.map((item) => item.version)).size > 1),
    packages, totalPackages: packages.length,
    dependenciesCount: Object.keys(packageJson.dependencies || {}).length,
    devDependenciesCount: Object.keys(packageJson.devDependencies || {}).length,
    summaryCounts: counts, healthScore: calculateHealthScore(counts, packages.length), analyzedAt: new Date().toISOString(),
  };
}
