import { parseGitHubUrl, repositoryTargetKey } from './repositoryTarget';

function targetKey(value: string) {
  const target = parseGitHubUrl(value);
  return target ? repositoryTargetKey(target) : value;
}

export interface HistoryItem {
  fullName: string;
  repoUrl: string;
  score: number;
  grade: string;
  totalPackages: number;
  criticalCount: number;
  timestamp: string;
  isCustomJson?: boolean;
  isMultiScan?: boolean;
  analysisKey?: string;
  repositoryTargets?: string[];
  repositoryCount?: number;
}

const STORAGE_KEY = 'upcheck_recent_repos';

export function getRepoHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.fullName === 'string'
      && typeof item.repoUrl === 'string' && typeof item.timestamp === 'string' && Number.isFinite(Date.parse(item.timestamp))) : [];
  } catch {
    return [];
  }
}

export function saveRepoToHistory(item: Omit<HistoryItem, 'timestamp'>): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getRepoHistory();
    // Filter out duplicate
    const filtered = existing.filter(
      (h) => h.fullName.toLowerCase() !== item.fullName.toLowerCase() || h.repoUrl !== item.repoUrl || Boolean(h.isMultiScan) !== Boolean(item.isMultiScan)
    );

    const newItem: HistoryItem = {
      ...item,
      timestamp: new Date().toISOString(),
    };

    const updated = [newItem, ...filtered].slice(0, 10); // keep last 10
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function updateRepoHistoryItem(
  fullName: string,
  updates: Partial<Omit<HistoryItem, 'fullName' | 'timestamp'>>,
  isMultiScan = false,
  analysisKey?: string,
): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const normalizedName = fullName.toLowerCase();
    const updated = getRepoHistory().map((item) =>
      item.fullName.toLowerCase() === normalizedName && Boolean(item.isMultiScan) === isMultiScan
        && (!analysisKey || item.analysisKey === analysisKey)
        && (isMultiScan || updates.repoUrl === undefined || targetKey(item.repoUrl) === targetKey(updates.repoUrl))
        ? { ...item, ...updates, timestamp: new Date().toISOString() }
        : item,
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function removeRepoFromHistory(fullName: string): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getRepoHistory();
    const updated = existing.filter(
      (h) => h.fullName.toLowerCase() !== fullName.toLowerCase()
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearRepoHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
