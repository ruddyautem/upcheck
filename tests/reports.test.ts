import { afterEach, beforeEach, expect, test } from 'bun:test';
import { ANALYSIS_CACHE_TTL, clearAnalysisCache, getCachedAnalysis, saveAnalysisToCache } from '../src/lib/analysisCache';
import { getLocalReport, saveLocalReport } from '../src/lib/localReports';
import { parseGitHubUrl, repositoryTargetKey, repositoryTargetUrl } from '../src/lib/repositoryTarget';
import { report } from './fixtures';
import { getRepoHistory, saveRepoToHistory, updateRepoHistoryItem } from '../src/lib/history';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
let items: Map<string, string>;
beforeEach(() => {
  items = new Map();
  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); },
    removeItem: (key: string) => { items.delete(key); },
  } });
});
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

test('validates GitHub origins and preserves case-sensitive branch/path identity', () => {
  expect(parseGitHubUrl('https://evil.test/github.com/owner/repo')).toBeNull();
  expect(parseGitHubUrl('https://github.com.evil.test/owner/repo')).toBeNull();
  expect(parseGitHubUrl('https://github.com/owner/repo?path=../package.json')).toBeNull();
  const target = { owner: 'Owner', repo: 'Repo', branch: 'feature/fix', path: 'packages/App/package.json' };
  const parsed = parseGitHubUrl(repositoryTargetUrl(target))!;
  expect(repositoryTargetKey(parsed)).toBe(repositoryTargetKey(target));
  expect(repositoryTargetKey(parsed)).not.toBe(repositoryTargetKey({ ...target, path: target.path.toLowerCase() }));
});

test('isolates root, branch, and subdirectory caches and expires stale results', () => {
  const result = report();
  const target = { owner: 'owner', repo: 'repo', branch: 'feature/fix', path: 'packages/app/package.json' };
  result.repoInfo.target = target;
  const url = repositoryTargetUrl(target);
  saveAnalysisToCache(result, url);
  expect(getCachedAnalysis(url)?.repoInfo.target).toEqual(target);
  expect(getCachedAnalysis('owner/repo')).toBeNull();
  expect(getCachedAnalysis('https://github.com/owner/repo?ref=feature%2Ffix')).toBeNull();
  const saved = JSON.parse(items.get('upcheck_analysis_cache_v2')!);
  saved[0].cachedAt = new Date(Date.now() - ANALYSIS_CACHE_TTL - 1000).toISOString();
  items.set('upcheck_analysis_cache_v2', JSON.stringify(saved));
  expect(getCachedAnalysis(url)).toBeNull();
});

test('root requests reuse only default-branch root results', () => {
  saveAnalysisToCache(report(), 'owner/repo');
  expect(getCachedAnalysis('OWNER/REPO')).not.toBeNull();
  clearAnalysisCache();
  const result = report();
  result.repoInfo.target!.branch = 'feature';
  saveAnalysisToCache(result);
  expect(getCachedAnalysis('owner/repo')).toBeNull();
});

test('rejects corrupted reports and retains existing reports when quota prevents a write', () => {
  const id = saveLocalReport({ result: report(), ownerAnalysis: null }, 'retained');
  expect(getLocalReport(id!)?.result.repoInfo.fullName).toBe('owner/repo');
  items.set('upcheck_saved_report:corrupt', JSON.stringify({ result: { packages: [] }, createdAt: 'bad' }));
  expect(getLocalReport('corrupt')).toBeNull();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => items.get(key) ?? null, removeItem: (key: string) => items.delete(key),
    setItem: () => { throw new Error('Quota exceeded'); },
  } });
  expect(saveLocalReport({ result: report(), ownerAnalysis: null })).toBeNull();
  expect(getLocalReport('retained')).not.toBeNull();
});

test('storage denial does not throw from cache or report operations', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('Storage denied'); } });
  expect(() => saveAnalysisToCache(report())).not.toThrow();
  expect(getCachedAnalysis('owner/repo')).toBeNull();
  expect(saveLocalReport({ result: report(), ownerAnalysis: null })).toBeNull();
  expect(getLocalReport('any')).toBeNull();
});

test('history updates preserve separate branch and subdirectory reports', () => {
  const entry = { fullName: 'owner/repo', repoUrl: 'https://github.com/owner/repo?ref=main', score: 90, grade: 'A', totalPackages: 1, criticalCount: 0 };
  saveRepoToHistory({ ...entry, analysisKey: 'root' });
  saveRepoToHistory({ ...entry, repoUrl: 'https://github.com/owner/repo?ref=main&path=packages%2Fapp%2Fpackage.json', analysisKey: 'subdirectory' });
  updateRepoHistoryItem('owner/repo', { repoUrl: entry.repoUrl, score: 80 });
  expect(getRepoHistory()).toHaveLength(2);
  expect(getRepoHistory().find((item) => item.analysisKey === 'root')?.score).toBe(80);
  expect(getRepoHistory().find((item) => item.analysisKey === 'subdirectory')?.score).toBe(90);
});
