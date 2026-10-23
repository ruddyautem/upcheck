import type { OwnerAnalysisResult, RepoAnalysisResult } from '@/types';
import { CATEGORY_CONFIGS } from './categories';

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function isStoredAnalysis(value: unknown): value is RepoAnalysisResult {
  if (!record(value) || !record(value.repoInfo) || !record(value.healthScore) || !record(value.summaryCounts) || !Array.isArray(value.packages)) return false;
  if (typeof value.repoInfo.fullName !== 'string' || typeof value.repoInfo.owner !== 'string' || typeof value.repoInfo.repo !== 'string'
    || typeof value.analyzedAt !== 'string' || !Number.isFinite(Date.parse(value.analyzedAt))
    || typeof value.healthScore.score !== 'number' || typeof value.healthScore.grade !== 'string') return false;
  return value.packages.every((pkg) => record(pkg) && typeof pkg.name === 'string' && typeof pkg.currentVersion === 'string'
    && typeof pkg.latestVersion === 'string' && typeof pkg.category === 'string' && Object.hasOwn(CATEGORY_CONFIGS, pkg.category)
    && Array.isArray(pkg.advisories) && pkg.advisories.every((advisory: unknown) => record(advisory)
      && typeof advisory.id === 'string' && typeof advisory.severity === 'string' && typeof advisory.advisoryUrl === 'string')
    && record(pkg.updateDiff));
}

export function isStoredOwnerAnalysis(value: unknown): value is OwnerAnalysisResult {
  return record(value) && typeof value.owner === 'string' && Array.isArray(value.results) && value.results.every(isStoredAnalysis)
    && Array.isArray(value.skipped) && value.skipped.every((item) => record(item) && typeof item.fullName === 'string' && typeof item.reason === 'string');
}
