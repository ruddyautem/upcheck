import { OwnerAnalysisResult, RepoAnalysisResult } from '@/types';
import { isStoredAnalysis, isStoredOwnerAnalysis } from './reportValidation';

const STORAGE_PREFIX = 'upcheck_saved_report:';
const INDEX_KEY = 'upcheck_saved_report_ids';
const MAX_REPORTS = 10;

export interface LocalReport {
  result: RepoAnalysisResult;
  ownerAnalysis: OwnerAnalysisResult | null;
  createdAt: string;
}

function createReportId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function saveLocalReport(
  report: Omit<LocalReport, 'createdAt'>,
  reportId = createReportId(),
) {
  if (typeof window === 'undefined') return null;
  try {
    const previousIds = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
    const reportIds = Array.isArray(previousIds) ? previousIds.filter((id): id is string => typeof id === 'string' && id !== reportId) : [];
    const retainedIds = [reportId, ...reportIds].slice(0, MAX_REPORTS);
    localStorage.setItem(
      `${STORAGE_PREFIX}${reportId}`,
      JSON.stringify({ ...report, createdAt: new Date().toISOString() } satisfies LocalReport),
    );
    localStorage.setItem(INDEX_KEY, JSON.stringify(retainedIds));
    reportIds.slice(MAX_REPORTS - 1).forEach((id) => localStorage.removeItem(`${STORAGE_PREFIX}${id}`));
    return reportId;
  } catch {
    return null;
  }
}

export function getLocalReport(reportId: string) {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(`${STORAGE_PREFIX}${reportId}`);
    if (!value) return null;
    const report = JSON.parse(value) as Partial<LocalReport>;
    return isStoredAnalysis(report.result) && (report.ownerAnalysis === null || isStoredOwnerAnalysis(report.ownerAnalysis)) && typeof report.createdAt === 'string'
      ? report as LocalReport
      : null;
  } catch {
    return null;
  }
}

export function clearLocalReports() {
  if (typeof window === 'undefined') return;
  try {
    const reportIds = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
    if (Array.isArray(reportIds)) {
      reportIds.forEach((id) => {
        if (typeof id === 'string') localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
      });
    }
    localStorage.removeItem(INDEX_KEY);
  } catch {
    // Keep the app usable if local storage cannot be read.
  }
}
