import semver from 'semver';
import { 
  PackageAnalysis, 
  RepoAnalysisResult, 
  RepoMeta, 
  SecurityAdvisory, 
  UpdateCategory, 
  HealthScore,
  AdvisorySeverity,
  SemverDiffInfo,
  RawPackageJson
} from '@/types';
import { CATEGORY_CONFIGS } from './categories';

// Helper to clean version strings like "^18.2.0", "~1.0.0", ">=2.0.0"
export function cleanSemver(spec: string): string {
  if (!spec) return '0.0.0';
  const trimmed = spec.trim();
  const coerced = semver.coerce(trimmed);
  if (coerced) return coerced.version;
  const match = trimmed.match(/\d+\.\d+\.\d+/);
  return match ? match[0] : '0.0.0';
}

// Helper to determine semver diff
export function computeSemverDiff(current: string, latest: string): SemverDiffInfo {
  const currentClean = cleanSemver(current);
  const latestClean = cleanSemver(latest);

  const curObj = semver.parse(currentClean);
  const latObj = semver.parse(latestClean);

  if (!curObj || !latObj) {
    return {
      type: 'unknown',
      majorDiff: 0,
      minorDiff: 0,
      patchDiff: 0,
    };
  }

  const majorDiff = Math.max(0, latObj.major - curObj.major);
  const minorDiff = Math.max(0, latObj.minor - curObj.minor);
  const patchDiff = Math.max(0, latObj.patch - curObj.patch);

  if (majorDiff > 0) {
    return { type: 'major', majorDiff, minorDiff, patchDiff };
  }
  if (minorDiff > 0) {
    return { type: 'minor', majorDiff, minorDiff, patchDiff };
  }
  if (patchDiff > 0) {
    return { type: 'patch', majorDiff, minorDiff, patchDiff };
  }

  return { type: 'none', majorDiff: 0, minorDiff: 0, patchDiff: 0 };
}

// In-memory cache for OSV vulnerability details
const vulnDetailCache = new Map<string, any>();

async function fetchVulnDetail(id: string): Promise<any | null> {
  if (vulnDetailCache.has(id)) {
    return vulnDetailCache.get(id);
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      vulnDetailCache.set(id, data);
      return data;
    }
  } catch {
    // ignore
  }
  return null;
}

// Query OSV in batch for vulnerabilities
async function queryOSVBatch(
  packages: Array<{ name: string; version: string }>
): Promise<Map<string, SecurityAdvisory[]>> {
  const resultMap = new Map<string, SecurityAdvisory[]>();
  if (packages.length === 0) return resultMap;

  try {
    const queries = packages.map((pkg) => ({
      package: {
        name: pkg.name,
        ecosystem: 'npm',
      },
      version: cleanSemver(pkg.version),
    }));

    // OSV allows batch queries
    const res = await fetch('https://api.osv.dev/v1/querybatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries }),
    });

    if (!res.ok) {
      throw new Error(`OSV returned ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const results = data.results || [];

    // Collect unique vulnerability IDs to fetch full details
    const uniqueVulnIds = new Set<string>();
    for (let i = 0; i < packages.length; i++) {
      const osvItem = results[i];
      const vulns = osvItem?.vulns || [];
      // Take up to 5 per package to keep response snappy
      for (const v of vulns.slice(0, 5)) {
        if (v.id) uniqueVulnIds.add(v.id);
      }
    }

    // Fetch full details in parallel (capped concurrency)
    const idList = Array.from(uniqueVulnIds).slice(0, 40);
    const detailMap = new Map<string, any>();
    await Promise.all(
      idList.map(async (id) => {
        const detail = await fetchVulnDetail(id);
        if (detail) {
          detailMap.set(id, detail);
        }
      })
    );

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      if (!pkg) continue;
      const osvItem = results[i];
      const vulns = osvItem?.vulns || [];

      const advisories: SecurityAdvisory[] = vulns.map((v: any) => {
        const detail = detailMap.get(v.id);
        let severity: AdvisorySeverity = 'UNKNOWN';
        let cvssScore: number | undefined;

        // Extract severity from OSV database_specific or severity field
        const dbSev = (detail?.database_specific?.severity || v.database_specific?.severity)?.toUpperCase();
        if (dbSev === 'CRITICAL' || dbSev === 'HIGH' || dbSev === 'MODERATE' || dbSev === 'LOW') {
          severity = dbSev;
        }

        const sevArr = detail?.severity || v.severity;
        if (Array.isArray(sevArr)) {
          const cvssEntry = sevArr.find((s: any) => s.type === 'CVSS_V3' || s.type === 'CVSS_V4');
          if (cvssEntry?.score) {
            if (severity === 'UNKNOWN') {
              if (cvssEntry.score.includes('/C:H') || cvssEntry.score.includes('/I:H') || cvssEntry.score.includes('/A:H')) {
                severity = 'HIGH';
              } else {
                severity = 'MODERATE';
              }
            }
          }
        }

        // Search for fixed version in affected ranges
        let fixedIn: string | undefined;
        let affectedRange = '';
        const affectedArr = detail?.affected || v.affected;
        if (Array.isArray(affectedArr)) {
          for (const aff of affectedArr) {
            if (Array.isArray(aff.ranges)) {
              for (const r of aff.ranges) {
                if (Array.isArray(r.events)) {
                  const fixedEvent = r.events.find((e: any) => e.fixed);
                  if (fixedEvent) {
                    fixedIn = fixedEvent.fixed;
                  }
                  const introducedEvent = r.events.find((e: any) => e.introduced);
                  if (introducedEvent) {
                    affectedRange = `>= ${introducedEvent.introduced}` + (fixedIn ? ` < ${fixedIn}` : '');
                  }
                }
              }
            }
          }
        }

        const advisoryUrl = v.id.startsWith('GHSA')
          ? `https://github.com/advisories/${v.id}`
          : `https://osv.dev/vulnerability/${v.id}`;

        const title = detail?.summary || v.summary || v.id;
        const summary = detail?.details || detail?.summary || v.details || v.summary || 'Security advisory identified for this package.';

        return {
          id: v.id,
          title,
          summary,
          severity,
          cvssScore,
          affectedRange: affectedRange || 'Affected version range',
          fixedIn,
          advisoryUrl,
          publishedAt: detail?.published || v.published,
        };
      });

      const severityRank: Record<AdvisorySeverity, number> = {
        CRITICAL: 4,
        HIGH: 3,
        MODERATE: 2,
        LOW: 1,
        UNKNOWN: 0,
      };
      advisories.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
      resultMap.set(pkg.name, advisories);
    }
  } catch (err) {
    console.error('Error querying OSV:', err);
    throw new Error('Security advisory lookup is unavailable. The scan was stopped because its results could not be verified. Please try again.');
  }

  return resultMap;
}

// Fetch single package metadata from NPM Registry with timeout and cache
async function fetchNpmMetadata(packageName: string): Promise<{
  latestVersion: string;
  deprecatedReason: string | null;
  homepage?: string;
  repositoryUrl?: string;
  publishedAt?: string;
  latestPublishedAt?: string;
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const distTags = data['dist-tags'] || {};
    const latestVersion = distTags.latest || Object.keys(data.versions || {}).pop() || '1.0.0';

    // Maintainer announcements / deprecation notice
    let deprecatedReason: string | null = null;
    if (typeof data.deprecated === 'string') {
      deprecatedReason = data.deprecated;
    } else if (data.versions && data.versions[latestVersion]?.deprecated) {
      deprecatedReason = data.versions[latestVersion].deprecated;
    }

    // Repository URL
    let repositoryUrl: string | undefined;
    if (typeof data.repository === 'string') {
      repositoryUrl = data.repository;
    } else if (data.repository?.url) {
      repositoryUrl = data.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
    }

    return {
      latestVersion,
      deprecatedReason,
      homepage: data.homepage,
      repositoryUrl,
      publishedAt: data.time?.[latestVersion],
      latestPublishedAt: data.time?.[latestVersion],
    };
  } catch {
    return null;
  }
}

// Concurrency helper for fetching NPM metadata
async function fetchAllNpmMetadata(
  packageNames: string[],
  concurrency = 12
): Promise<Map<string, Awaited<ReturnType<typeof fetchNpmMetadata>>>> {
  const results = new Map<string, Awaited<ReturnType<typeof fetchNpmMetadata>>>();
  const queue = [...packageNames];

  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const name = queue.shift();
      if (!name) break;
      const data = await fetchNpmMetadata(name);
      results.set(name, data);
    }
  });

  await Promise.all(workers);
  return results;
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

  const rawScore = Math.max(0, Math.round(100 - penalty));

  let grade: HealthScore['grade'] = 'F';
  let label = 'Critical Risks';
  let color = 'text-red-400';
  let description = 'Urgent vulnerabilities and outdated dependencies present high risk.';

  if (rawScore >= 95) {
    grade = 'A+';
    label = 'Pristine';
    color = 'text-emerald-400';
    description = 'All dependencies are completely up-to-date and secure.';
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

// Primary analysis function
export async function analyzeDependencies(
  packageJson: RawPackageJson,
  repoInfo: RepoMeta
): Promise<RepoAnalysisResult> {
  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};
  const peerDependencies = packageJson.peerDependencies || {};

  const allEntries: Array<{
    name: string;
    spec: string;
    isDev: boolean;
    isPeer: boolean;
  }> = [];

  for (const [name, spec] of Object.entries(dependencies)) {
    allEntries.push({ name, spec, isDev: false, isPeer: false });
  }

  for (const [name, spec] of Object.entries(devDependencies)) {
    // avoid duplicates if listed in both
    if (!dependencies[name]) {
      allEntries.push({ name, spec, isDev: true, isPeer: false });
    }
  }

  for (const [name, spec] of Object.entries(peerDependencies)) {
    if (!dependencies[name] && !devDependencies[name]) {
      allEntries.push({ name, spec, isDev: false, isPeer: true });
    }
  }

  const packageNames = allEntries.map((e) => e.name);

  // Parallel fetch: NPM Registry metadata & OSV batch vulnerability query
  const [npmMetadataMap, osvAdvisoriesMap] = await Promise.all([
    fetchAllNpmMetadata(packageNames),
    queryOSVBatch(
      allEntries.map((e) => ({
        name: e.name,
        version: cleanSemver(e.spec),
      }))
    ),
  ]);

  if (packageNames.length > 0 && packageNames.every((name) => !npmMetadataMap.get(name))) {
    throw new Error('The npm registry is unavailable. The scan was stopped because package versions could not be verified. Please try again.');
  }

  const packages: PackageAnalysis[] = [];
  const summaryCounts = {
    critical: 0,
    security: 0,
    deprecated: 0,
    major: 0,
    minor: 0,
    patch: 0,
    up_to_date: 0,
  };

  for (const entry of allEntries) {
    const currentVersion = cleanSemver(entry.spec);
    const npmData = npmMetadataMap.get(entry.name);
    const latestVersion = npmData?.latestVersion || currentVersion;
    const advisories = osvAdvisoriesMap.get(entry.name) || [];

    const updateDiff = computeSemverDiff(currentVersion, latestVersion);
    const deprecatedReason = npmData?.deprecatedReason || null;

    // Categorization logic
    let category: UpdateCategory = 'up_to_date';
    let urgencyScore = 0;

    const hasCriticalVuln = advisories.some(
      (a) => a.severity === 'CRITICAL' || a.severity === 'HIGH' || (a.cvssScore && a.cvssScore >= 7)
    );
    const hasOtherVuln = advisories.length > 0;

    if (hasCriticalVuln) {
      category = 'critical';
      urgencyScore = 5;
      summaryCounts.critical++;
    } else if (hasOtherVuln) {
      category = 'security';
      urgencyScore = 4;
      summaryCounts.security++;
    } else if (deprecatedReason) {
      category = 'deprecated';
      urgencyScore = 4;
      summaryCounts.deprecated++;
    } else if (updateDiff.type === 'major') {
      category = 'major';
      urgencyScore = 3;
      summaryCounts.major++;
    } else if (updateDiff.type === 'minor') {
      category = 'minor';
      urgencyScore = 2;
      summaryCounts.minor++;
    } else if (updateDiff.type === 'patch') {
      category = 'patch';
      urgencyScore = 1;
      summaryCounts.patch++;
    } else {
      category = 'up_to_date';
      urgencyScore = 0;
      summaryCounts.up_to_date++;
    }

    const config = CATEGORY_CONFIGS[category];
    const breakingWarning = getBreakingWarning(entry.name, currentVersion, latestVersion, updateDiff.majorDiff);
    // TypeScript 7 is intentionally visible but held out of generated plans for now.
    const isUpdateDeferred = entry.name === 'typescript'
      && category === 'major'
      && semver.major(latestVersion) >= 7;

    packages.push({
      name: entry.name,
      currentSpec: entry.spec,
      currentVersion,
      latestVersion,
      category,
      categoryLabel: config.label,
      urgencyScore,
      isDevDependency: entry.isDev,
      isPeerDependency: entry.isPeer,
      deprecatedReason,
      homepage: npmData?.homepage,
      repositoryUrl: npmData?.repositoryUrl,
      npmUrl: `https://www.npmjs.com/package/${encodeURIComponent(entry.name)}`,
      publishedAt: npmData?.publishedAt,
      latestPublishedAt: npmData?.latestPublishedAt,
      advisories,
      hasBreakingChanges: updateDiff.majorDiff > 0,
      breakingWarning,
      isUpdateDeferred,
      updateDiff,
    });
  }

  // Sort by urgencyScore descending (critical first), then by name
  packages.sort((a, b) => {
    if (b.urgencyScore !== a.urgencyScore) {
      return b.urgencyScore - a.urgencyScore;
    }
    return a.name.localeCompare(b.name);
  });

  const totalPackages = packages.length;
  const healthScore = calculateHealthScore(summaryCounts, totalPackages);

  return {
    repoInfo,
    totalPackages,
    dependenciesCount: Object.keys(dependencies).length,
    devDependenciesCount: Object.keys(devDependencies).length,
    summaryCounts,
    healthScore,
    packages,
    analyzedAt: new Date().toISOString(),
  };
}
