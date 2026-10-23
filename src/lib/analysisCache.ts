import type { RepoAnalysisResult } from '@/types';
import { getRepositoryTarget, parseGitHubUrl, repositoryTargetKey } from './repositoryTarget';
import { isStoredAnalysis } from './reportValidation';

const STORAGE_KEY = 'upcheck_analysis_cache_v2';
const MAX_ENTRIES = 10;
export const ANALYSIS_CACHE_TTL = 15 * 60 * 1000;
interface CachedAnalysis { keys: string[]; result: RepoAnalysisResult; cachedAt: string }

function readCache(): CachedAnalysis[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is CachedAnalysis => entry && Array.isArray(entry.keys)
      && entry.keys.every((key: unknown) => typeof key === 'string') && isStoredAnalysis(entry.result)
      && Number.isFinite(Date.parse(entry.cachedAt)) && Date.now() - Date.parse(entry.cachedAt) < ANALYSIS_CACHE_TTL);
  } catch { return []; }
}

export function getCachedAnalysis(repository: string) {
  const target = parseGitHubUrl(repository);
  if (!target) return null;
  const key = repositoryTargetKey(target);
  return readCache().find((entry) => entry.keys.includes(key))?.result ?? null;
}

export function saveAnalysisToCache(result: RepoAnalysisResult, requestedUrl?: string) {
  if (typeof window === 'undefined' || result.repoInfo.isCustomJson) return;
  try {
    const target = getRepositoryTarget(result.repoInfo);
    const keys = [repositoryTargetKey(target)];
    const requested = requestedUrl ? parseGitHubUrl(requestedUrl) : null;
    if (requested) keys.push(repositoryTargetKey(requested));
    // A scan of the default branch can also satisfy an unqualified root request.
    if (target.path === 'package.json' && target.branch === result.repoInfo.defaultBranch && !requested?.branch) {
      keys.push(repositoryTargetKey({ ...target, branch: undefined }));
    }
    const entry: CachedAnalysis = { keys: Array.from(new Set(keys)), result, cachedAt: new Date().toISOString() };
    const updated = [entry, ...readCache().filter((old) => !old.keys.some((key) => entry.keys.includes(key)))].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* Storage is optional. */ }
}

export function clearAnalysisCache() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('upcheck_analysis_cache_v1');
  } catch { /* Storage is optional. */ }
}
