'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { PackageTable, TableFilterTab } from '@/components/PackageTable';
import { UpcheckScanner } from '@/components/UpcheckScanner';
import { UpdateScriptsPanel } from '@/components/UpdateScriptsPanel';
import { UpdatePreset } from '@/lib/updateCommands';
import { RemediationModal } from '@/components/RemediationModal';
import { ExportModal } from '@/components/ExportModal';
import { TokenModal } from '@/components/TokenModal';
import { InfoModal } from '@/components/InfoModal';
import { OwnerScanSummary } from '@/components/OwnerScanSummary';
import { MultiRepoPromptModal } from '@/components/MultiRepoPromptModal';
import { OwnerAnalysisResult, RepoAnalysisResult, RawPackageJson, PackageManager } from '@/types';
import { clearRepoHistory, getRepoHistory, saveRepoToHistory, updateRepoHistoryItem, HistoryItem } from '@/lib/history';
import { clearAnalysisCache, getCachedAnalysis, saveAnalysisToCache } from '@/lib/analysisCache';
import { clearLocalReports, getLocalReport, saveLocalReport } from '@/lib/localReports';
import { triggerCelebration } from '@/lib/confetti';
import { useAppSettings } from '@/lib/settingsContext';
import { Link, useRouter } from '@/i18n/navigation';
import { AlertCircle, ArrowUpRight, Check, Download, RefreshCw, ScanSearch, ShieldAlert, Terminal } from 'lucide-react';

export default function Home({ reportId }: { reportId?: string }) {
  const { t, locale } = useAppSettings();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RepoAnalysisResult | null>(null);
  const [ownerAnalysis, setOwnerAnalysis] = useState<OwnerAnalysisResult | null>(null);
  const [isScanOpen, setIsScanOpen] = useState(true);

  // Recent scans history
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Filter for table synced with metric cards
  const [tableFilter, setTableFilter] = useState<TableFilterTab>('needs_attention');

  // Script package manager
  const [packageManager, setPackageManager] = useState<PackageManager>('bun');
  const inventoryViewportRef = useRef<HTMLDivElement>(null);

  // Modals
  const [showRemediation, setShowRemediation] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showMultiRepoPrompt, setShowMultiRepoPrompt] = useState(false);

  // GitHub token
  const [githubToken, setgithubToken] = useState('');

  const openReport = (
    nextResult: RepoAnalysisResult,
    nextOwnerAnalysis: OwnerAnalysisResult | null,
    existingReportId?: string | null,
  ) => {
    const nextReportId = existingReportId ?? saveLocalReport({ result: nextResult, ownerAnalysis: nextOwnerAnalysis });
    if (nextReportId) {
      router.push(`/report/${nextReportId}`);
    }
  };

  const getGradeBadgeClass = (grade: string) => {
    if (grade === 'A+' || grade === 'A') return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300';
    if (grade === 'B') return 'bg-sky-500/20 border-sky-500/50 text-sky-300';
    if (grade === 'C') return 'bg-amber-500/20 border-amber-500/50 text-amber-300';
    if (grade === 'D') return 'bg-orange-500/20 border-orange-500/50 text-orange-300';
    return 'bg-red-500/20 border-red-500/50 text-red-300';
  };

  const getScoreTextClass = (grade: string) => {
    if (grade === 'A+' || grade === 'A') return 'text-emerald-300';
    if (grade === 'B') return 'text-cyan-300';
    if (grade === 'C') return 'text-amber-300';
    return 'text-red-300';
  };

  useEffect(() => {
    // Tokens used by older versions are removed rather than kept in persistent storage.
    localStorage.removeItem('upcheck_github_token');
    setHistory(getRepoHistory());
    if (!reportId) return;

    const storedReport = getLocalReport(reportId);
    if (!storedReport) {
      setError(t('report.expired'));
      return;
    }

    setResult(storedReport.result);
    setOwnerAnalysis(storedReport.ownerAnalysis);
    setTableFilter('needs_attention');
    setIsScanOpen(false);
  }, [reportId]);

  const handleSaveToken = (token: string) => {
    setgithubToken(token);
  };

  const handleAnalyzeRepo = async (target: string | string[], forceRefresh = false) => {
    if (!forceRefresh && !Array.isArray(target)) {
      const cachedResult = getCachedAnalysis(target);
      if (cachedResult) {
        const cachedReportId = saveLocalReport({ result: cachedResult, ownerAnalysis: null });
        setHistory(updateRepoHistoryItem(cachedResult.repoInfo.fullName, {
          repoUrl: cachedResult.repoInfo.fullName,
          score: cachedResult.healthScore.score,
          grade: cachedResult.healthScore.grade,
          totalPackages: cachedResult.totalPackages,
          criticalCount: cachedResult.summaryCounts.critical,
          analysisKey: cachedReportId || undefined,
        }));
        openReport(cachedResult, null, cachedReportId);
        return;
      }
    }
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Array.isArray(target) ? {
          repoUrls: target,
          githubToken: githubToken || undefined,
        } : {
          repoUrl: target,
          githubToken: githubToken || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze repository dependencies.');
      }

      if (data.mode === 'owner') {
        const batch = data.data as OwnerAnalysisResult;
        const firstResult = batch.results[0];
        if (!firstResult) {
          throw new Error('No JavaScript repositories with dependencies could be scanned.');
        }
        setOwnerAnalysis(batch);
        setResult(firstResult);
        batch.results.forEach(saveAnalysisToCache);
      } else {
        setOwnerAnalysis(null);
        setResult(data.data);
        saveAnalysisToCache(data.data as RepoAnalysisResult);
      }
      setTableFilter('needs_attention');
      setIsScanOpen(false);
      const activeResult = data.mode === 'owner'
        ? (data.data as OwnerAnalysisResult).results[0]
        : data.data as RepoAnalysisResult;
      const batch = data.mode === 'owner' ? data.data as OwnerAnalysisResult : null;
      const reportKey = saveLocalReport({ result: activeResult, ownerAnalysis: batch });
      const updatedHistory = saveRepoToHistory(batch ? {
        fullName: batch.owner,
        repoUrl: '',
        score: activeResult.healthScore.score,
        grade: activeResult.healthScore.grade,
        totalPackages: batch.results.reduce((total, repository) => total + repository.totalPackages, 0),
        criticalCount: batch.results.reduce((total, repository) => total + repository.summaryCounts.critical, 0),
        isMultiScan: true,
        analysisKey: reportKey || undefined,
        repositoryTargets: Array.isArray(target) ? target : undefined,
        repositoryCount: batch.results.length,
      } : {
        fullName: activeResult.repoInfo.fullName,
        repoUrl: target as string,
        score: activeResult.healthScore.score,
        grade: activeResult.healthScore.grade,
        totalPackages: activeResult.totalPackages,
        criticalCount: activeResult.summaryCounts.critical,
        analysisKey: reportKey || undefined,
      });
      setHistory(updatedHistory);

      openReport(activeResult, batch, reportKey);

      if (activeResult.healthScore.score >= 85) {
        triggerCelebration();
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with analysis server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeCustomJson = async (customPackageJson: RawPackageJson, title: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customPackageJson,
          customRepoName: title,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze package.json dependencies.');
      }

      const reportResult = data.data as RepoAnalysisResult;
      saveAnalysisToCache(reportResult);
      const reportKey = saveLocalReport({ result: reportResult, ownerAnalysis: null });
      setHistory(saveRepoToHistory({
        fullName: title,
        repoUrl: '',
        score: reportResult.healthScore.score,
        grade: reportResult.healthScore.grade,
        totalPackages: reportResult.totalPackages,
        criticalCount: reportResult.summaryCounts.critical,
        isCustomJson: true,
        analysisKey: reportKey || undefined,
      }));
      openReport(reportResult, null, reportKey);

      if (data.data.healthScore.score >= 85) {
        triggerCelebration();
      }
    } catch (err: any) {
      setError(err.message || 'Error analyzing package.json.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    if (item.analysisKey) {
      router.push(`/report/${item.analysisKey}`);
      return;
    }
    if (item.isMultiScan) {
      if (item.repositoryTargets?.length) {
        void handleAnalyzeRepo(item.repositoryTargets, true);
      }
      return;
    }
    if (item.repoUrl) handleAnalyzeRepo(item.repoUrl);
  };

  const handleRescan = async () => {
    if (!result?.repoInfo.fullName) return;
    if (!ownerAnalysis) {
      await handleAnalyzeRepo(result.repoInfo.fullName, true);
      return;
    }

    // A rescan from a multi-repository report refreshes only the active repository.
    // Keep the owner report and replace that repository's previous result in-place.
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: result.repoInfo.fullName, githubToken: githubToken || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || data.mode !== 'repository') {
        throw new Error(data.error || 'Failed to rescan repository dependencies.');
      }

      const refreshedResult = data.data as RepoAnalysisResult;
      const refreshedOwnerAnalysis: OwnerAnalysisResult = {
        ...ownerAnalysis,
        analyzedAt: new Date().toISOString(),
        results: ownerAnalysis.results.map((repository) =>
          repository.repoInfo.fullName === refreshedResult.repoInfo.fullName ? refreshedResult : repository
        ),
      };
      setResult(refreshedResult);
      setOwnerAnalysis(refreshedOwnerAnalysis);
      saveAnalysisToCache(refreshedResult);
      const reportKey = reportId
        ? saveLocalReport({ result: refreshedResult, ownerAnalysis: refreshedOwnerAnalysis }, reportId)
        : saveLocalReport({ result: refreshedResult, ownerAnalysis: refreshedOwnerAnalysis });
      const activeOwnerResult = refreshedOwnerAnalysis.results[0];
      const historyAfterOwnerUpdate = updateRepoHistoryItem(ownerAnalysis.owner, {
        analysisKey: reportKey || undefined,
        score: activeOwnerResult?.healthScore.score,
        grade: activeOwnerResult?.healthScore.grade,
        totalPackages: refreshedOwnerAnalysis.results.reduce((total, repository) => total + repository.totalPackages, 0),
        criticalCount: refreshedOwnerAnalysis.results.reduce((total, repository) => total + repository.summaryCounts.critical, 0),
        repositoryCount: refreshedOwnerAnalysis.results.length,
      }, true);
      const historyAfterScoreUpdate = updateRepoHistoryItem(refreshedResult.repoInfo.fullName, {
        repoUrl: refreshedResult.repoInfo.fullName,
        score: refreshedResult.healthScore.score,
        grade: refreshedResult.healthScore.grade,
        totalPackages: refreshedResult.totalPackages,
        criticalCount: refreshedResult.summaryCounts.critical,
      });
      setHistory(historyAfterScoreUpdate.length > 0 ? historyAfterScoreUpdate : historyAfterOwnerUpdate);
      setTableFilter('needs_attention');
    } catch (err: any) {
      setError(err.message || 'Error communicating with analysis server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOwnerRepository = (fullName: string) => {
    const nextResult = ownerAnalysis?.results.find((repository) => repository.repoInfo.fullName === fullName);
    if (!nextResult) return;
    setResult(nextResult);
    setTableFilter('needs_attention');
  };

  const handleRescanAll = () => {
    if (!ownerAnalysis) return;
    void handleAnalyzeRepo(ownerAnalysis.results.map((repository) => repository.repoInfo.fullName), true);
  };

  const handleClearLocalReports = () => {
    clearLocalReports();
    clearRepoHistory();
    clearAnalysisCache();
    setHistory([]);
  };

  const handleSelectUpdatePreset = (preset: UpdatePreset) => {
    const filters: Record<UpdatePreset, TableFilterTab> = {
      security: 'security',
      safe: 'minor_patch',
      major: 'major',
      all: 'needs_attention',
    };
    setTableFilter(filters[preset]);
    inventoryViewportRef.current?.scrollTo({ top: 0 });
  };

  return (
    <div className={`app-shell text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white antialiased ${result && !isScanOpen && !error ? 'report-fit-shell' : ''} ${!result && !error ? 'min-h-screen lg:h-dvh lg:overflow-hidden' : 'min-h-screen'}`}>
      {/* Top Header */}
      <Header
        onOpenTokenModal={() => setShowTokenModal(true)}
        hasCustomToken={Boolean(githubToken)}
        onOpenInfoModal={() => setShowInfoModal(true)}
      />

      {/* Main Container */}
      <main className={`flex-1 min-h-0 max-w-[1480px] w-full mx-auto px-4 sm:px-7 lg:px-10 ${!result && !error ? 'flex flex-col py-8 lg:overflow-hidden lg:py-4' : 'py-8 lg:py-12'} space-y-8 lg:space-y-10`}>
        {(!result || isScanOpen) && (
          <section className={`w-full transition-all ${result ? 'p-4 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800' : 'flex flex-1 flex-col lg:min-h-0'}`}>
            <UpcheckScanner
              onAnalyzeRepo={(repoUrl) => handleAnalyzeRepo(repoUrl)}
              onAnalyzeRepos={(repoUrls) => handleAnalyzeRepo(repoUrls)}
              onAnalyzeCustomJson={handleAnalyzeCustomJson}
              isLoading={isLoading}
              githubToken={githubToken}
              history={history}
              onSelectHistoryItem={handleSelectHistoryItem}
              onClearHistory={handleClearLocalReports}
              onOpenTokenModal={() => setShowTokenModal(true)}
              compact={Boolean(result)}
            />
          </section>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-start gap-3 shadow-lg" role="alert">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-red-300">{t('error.analysis_title')}</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {ownerAnalysis && result && (
          <OwnerScanSummary
            analysis={ownerAnalysis}
            activeRepository={result.repoInfo.fullName}
            isLoading={isLoading}
            onSelectRepository={handleSelectOwnerRepository}
            onRescanAll={handleRescanAll}
            onOpenAiPrompt={() => setShowMultiRepoPrompt(true)}
          />
        )}

        {/* Scanned report */}
        {result && (
          <div className="report-results h-full min-h-0 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <section className="shrink-0 border border-slate-800 bg-slate-900/80 px-4 py-4 sm:px-5 flex flex-col xl:flex-row xl:items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3 sm:items-center sm:gap-4 min-w-0">
                  <span className={`shrink-0 inline-flex flex-col items-center justify-center w-16 h-16 border ${getGradeBadgeClass(result.healthScore.grade)}`}>
                    <span className="text-3xl font-black leading-none">{result.healthScore.grade}</span>
                    <span className="mt-1.5 text-[0.5625rem] font-bold tracking-[0.14em] leading-none text-white">SCORE</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <div className="min-w-0 break-all font-mono text-xs text-emerald-300 sm:text-sm">{result.repoInfo.fullName}</div>
                      <span aria-hidden="true" className="hidden h-3 border-l border-slate-700 sm:block" />
                      <time
                        dateTime={result.analyzedAt}
                        className="inline-flex min-w-0 max-w-full items-center text-[0.5625rem] text-slate-400 whitespace-normal sm:text-[0.6875rem]"
                        title={`${t('overview.last_scan')} · ${new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(result.analyzedAt))}`}
                      >
                        <span className="sm:hidden">
                          {new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(result.analyzedAt))}
                        </span>
                        <span className="hidden sm:inline">
                          {t('overview.last_scan')} · {new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(result.analyzedAt))}
                        </span>
                      </time>
                    </div>
                    <div className="mt-0.5 text-sm text-slate-400">
                      <span><strong className={`${getScoreTextClass(result.healthScore.grade)} text-xl`}>{result.healthScore.score}</strong> / 100</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 max-[480px]:grid max-[480px]:grid-cols-2">
                 <button type="button" onClick={handleRescan} disabled={isLoading} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-emerald-600 bg-emerald-600 text-white hover:border-emerald-500 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer max-[480px]:w-full max-[480px]:justify-center">
                   <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                   {t('overview.rescan')}
                 </button>
                <button type="button" onClick={() => setShowRemediation(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-700 text-slate-200 hover:text-white hover:border-emerald-500/50 cursor-pointer max-[480px]:w-full max-[480px]:justify-center">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" /> {t('overview.package_json')}
                </button>
                <button type="button" onClick={() => setShowExport(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-700 text-slate-200 hover:text-white hover:border-emerald-500/50 cursor-pointer max-[480px]:w-full max-[480px]:justify-center">
                  <Download className="w-3.5 h-3.5 text-emerald-400" /> {t('overview.export')}
                </button>
                <button type="button" onClick={() => setIsScanOpen((open) => !open)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-700 text-slate-200 hover:text-white hover:border-emerald-500/50 cursor-pointer max-[480px]:w-full max-[480px]:justify-center" aria-expanded={isScanOpen}>
                  <ScanSearch className="w-3.5 h-3.5" /> {isScanOpen ? t('report.close_scan') : <><span className="max-[480px]:hidden">{t('report.open_scan')}</span><span className="hidden max-[480px]:inline">{t('report.open_scan_short')}</span></>}
                </button>
              </div>
            </section>

            <section className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3" aria-label="Report metrics">
              <button type="button" onClick={() => setTableFilter('all')} className="min-w-0 min-h-[5rem] text-left border border-slate-800 bg-slate-900/60 px-2.5 py-2 sm:px-3 sm:py-2.5 hover:border-emerald-500/50 transition-colors cursor-pointer">
                <div className="break-words text-[0.5625rem] uppercase tracking-wide text-slate-400 sm:text-[0.625rem] sm:tracking-wider">{t('metrics.packages_checked')}</div>
                <div className="mt-1 flex items-end justify-between gap-2"><strong className="text-2xl text-white">{result.totalPackages}</strong><span className="text-[0.6875rem] text-slate-500">{result.dependenciesCount} deps</span></div>
              </button>
              <button type="button" onClick={() => setTableFilter('security')} className="min-w-0 min-h-[5rem] text-left border border-slate-800 bg-slate-900/60 px-2.5 py-2 sm:px-3 sm:py-2.5 hover:border-red-500/50 transition-colors cursor-pointer">
                <div className="break-words text-[0.5625rem] uppercase tracking-wide text-slate-400 sm:text-[0.625rem] sm:tracking-wider">{t('metrics.security_alerts')}</div>
                <div className="mt-1 flex items-end justify-between gap-2"><strong className="text-2xl text-red-400">{result.summaryCounts.critical + result.summaryCounts.security}</strong><ShieldAlert className="w-4 h-4 text-red-400" /></div>
              </button>
              <button type="button" onClick={() => setTableFilter('needs_attention')} className="min-w-0 min-h-[5rem] text-left border border-slate-800 bg-slate-900/60 px-2.5 py-2 sm:px-3 sm:py-2.5 hover:border-amber-500/50 transition-colors cursor-pointer">
                <div className="break-words text-[0.5625rem] uppercase tracking-wide text-slate-400 sm:text-[0.625rem] sm:tracking-wider">{t('metrics.need_update')}</div>
                <div className="mt-1 flex items-end justify-between gap-2"><strong className="text-2xl text-amber-300">{result.packages.filter((pkg) => pkg.category !== 'up_to_date' && !pkg.isUpdateDeferred).length}</strong><ArrowUpRight className="w-4 h-4 text-amber-400" /></div>
              </button>
              <button type="button" onClick={() => setTableFilter('up_to_date')} className="min-w-0 min-h-[5rem] text-left border border-slate-800 bg-slate-900/60 px-2.5 py-2 sm:px-3 sm:py-2.5 hover:border-emerald-500/50 transition-colors cursor-pointer">
                <div className="break-words text-[0.5625rem] uppercase tracking-wide text-slate-400 sm:text-[0.625rem] sm:tracking-wider">{t('metrics.up_to_date')}</div>
                <div className="mt-1 flex items-end justify-between gap-2"><strong className="text-2xl text-emerald-400">{result.summaryCounts.up_to_date}</strong><Check className="mb-1 h-4 w-4 text-emerald-400" aria-hidden="true" /></div>
              </button>
            </section>

            <div className="report-panels content-start min-h-0 grid flex-1 grid-cols-1 gap-4 xl:[--report-panel-height:clamp(24rem,48dvh,32rem)] 2xl:[--report-panel-height:clamp(34rem,76dvh,48rem)] xl:grid-cols-[minmax(0,1fr)_clamp(13rem,24vw,22rem)] xl:grid-rows-[3.25rem_var(--report-panel-height)]">
              <UpdateScriptsPanel
                key={result.repoInfo.fullName}
                packages={result.packages}
                packageManager={packageManager}
                onChangePackageManager={setPackageManager}
                onSelectPreset={handleSelectUpdatePreset}
              />
              <section className="package-breakdown order-2 min-h-0 flex flex-col xl:col-start-1 xl:row-start-2 xl:order-none xl:h-[var(--report-panel-height)]" aria-label="Package breakdown">
                <div className="shrink-0 flex items-center justify-between gap-3 pb-3">
                  <h3 className="text-sm font-bold text-white">{t('table.title')}</h3>
                  <span className="text-xs font-mono text-slate-400">{result.packages.length}</span>
                </div>
                <div ref={inventoryViewportRef} className="package-breakdown-viewport min-h-0 flex-1 overflow-y-auto">
                  <div className="package-breakdown-content xl:h-full">
                    <PackageTable
                      packages={result.packages}
                      externalTab={tableFilter}
                    />
                  </div>
                </div>
              </section>

            </div>
          </div>
        )}
      </main>

      {!result && (
        <footer className="mt-0 shrink-0 border-t border-slate-800/60 px-4 py-6 text-center text-xs text-slate-400 lg:py-3">
          <p>© {new Date().getFullYear()} upcheck.autem.dev — {t('footer.rights')}</p>
          <nav className="mt-2 flex justify-center gap-4" aria-label="Legal">
            <Link href="/privacy" className="hover:text-emerald-300">{t('footer.privacy')}</Link>
            <Link href="/terms" className="hover:text-emerald-300">{t('footer.terms')}</Link>
          </nav>
        </footer>
      )}

      {/* Modals */}
      {showRemediation && result && (
        <RemediationModal
          result={result}
          onClose={() => setShowRemediation(false)}
        />
      )}

      {showExport && result && (
        <ExportModal
          result={result}
          onClose={() => setShowExport(false)}
        />
      )}

      {showTokenModal && (
        <TokenModal
          token={githubToken}
          onSaveToken={handleSaveToken}
          onClose={() => setShowTokenModal(false)}
        />
      )}

      {showInfoModal && (
        <InfoModal onClose={() => setShowInfoModal(false)} />
      )}

      {showMultiRepoPrompt && ownerAnalysis && (
        <MultiRepoPromptModal
          repositories={ownerAnalysis.results}
          packageManager={packageManager}
          onChangePackageManager={setPackageManager}
          onClose={() => setShowMultiRepoPrompt(false)}
        />
      )}
    </div>
  );
}
