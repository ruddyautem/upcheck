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
    return Array.isArray(parsed) ? parsed : [];
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
      (h) => h.fullName.toLowerCase() !== item.fullName.toLowerCase()
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
