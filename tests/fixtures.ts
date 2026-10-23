import type { PackageAnalysis, RepoAnalysisResult } from '../src/types';
import { spyOn } from 'bun:test';

export function spyOnFetch() {
  // Only mock the callable API, not Bun's additional fetch.preconnect method.
  return spyOn(globalThis as { fetch: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch> }, 'fetch');
}

export function pkg(overrides: Partial<PackageAnalysis> = {}): PackageAnalysis {
  return { name: 'example', currentSpec: '^1.0.0', currentVersion: '1.0.0', latestVersion: '1.2.0',
    category: 'minor', categoryLabel: 'Minor', urgencyScore: 2, isDevDependency: false, isPeerDependency: false,
    npmUrl: 'https://www.npmjs.com/package/example', advisories: [], hasBreakingChanges: false,
    updateDiff: { type: 'minor', majorDiff: 0, minorDiff: 2, patchDiff: 0 }, ...overrides };
}

export function report(overrides: Partial<RepoAnalysisResult> = {}): RepoAnalysisResult {
  return { repoInfo: { owner: 'owner', repo: 'repo', fullName: 'owner/repo', defaultBranch: 'main',
    target: { owner: 'owner', repo: 'repo', branch: 'main', path: 'package.json' } },
    totalPackages: 1, dependenciesCount: 1, devDependenciesCount: 0,
    summaryCounts: { critical: 0, security: 0, deprecated: 0, major: 0, minor: 1, patch: 0, up_to_date: 0 },
    healthScore: { score: 99, grade: 'A+', label: 'Healthy', color: '', description: '' },
    packages: [pkg()], analyzedAt: new Date().toISOString(), ...overrides };
}
