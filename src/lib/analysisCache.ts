import { OwnerAnalysisResult, RepoAnalysisResult } from '@/types';

const STORAGE_KEY = 'upcheck_analysis_cache_v1';
const OWNER_STORAGE_KEY = 'upcheck_owner_analysis_cache_v1';
const MAX_ENTRIES = 10;
const MAX_OWNER_REPORTS = 3;

interface CachedAnalysis {
  key: string;
  result: RepoAnalysisResult;
  cachedAt: string;
}

interface CachedOwnerAnalysis {
  key: string;
  analysis: OwnerAnalysisResult;
}

function normalizeRepository(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^github\.com\//i, '')
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

function readCache(): CachedAnalysis[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCachedAnalysis(repository: string) {
  const key = normalizeRepository(repository);
  return readCache().find((entry) => entry.key === key)?.result ?? null;
}

export function saveAnalysisToCache(result: RepoAnalysisResult) {
  if (typeof window === 'undefined') return;
  try {
    const key = normalizeRepository(result.repoInfo.fullName);
    const entry: CachedAnalysis = { key, result, cachedAt: new Date().toISOString() };
    const updated = [entry, ...readCache().filter((current) => current.key !== key)].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Keep scanning functional if browser storage is unavailable or full.
  }
}

function readOwnerCache(): CachedOwnerAnalysis[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(OWNER_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOwnerAnalysisToCache(analysis: OwnerAnalysisResult) {
  if (typeof window === 'undefined') return null;
  try {
    const key = `${analysis.owner.toLowerCase()}:${analysis.analyzedAt}`;
    const entry: CachedOwnerAnalysis = { key, analysis };
    const updated = [entry, ...readOwnerCache().filter((current) => current.key !== key)].slice(0, MAX_OWNER_REPORTS);
    localStorage.setItem(OWNER_STORAGE_KEY, JSON.stringify(updated));
    return key;
  } catch {
    return null;
  }
}

export function getCachedOwnerAnalysis(key: string) {
  return readOwnerCache().find((entry) => entry.key === key)?.analysis ?? null;
}
