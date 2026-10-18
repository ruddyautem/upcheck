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
import { getRepoHistory, saveRepoToHistory, updateRepoHistoryItem, HistoryItem } from '@/lib/history';
import { getCachedAnalysis, getCachedOwnerAnalysis, saveAnalysisToCache, saveOwnerAnalysisToCache } from '@/lib/analysisCache';
import { triggerCelebration } from '@/lib/confetti';
import { useAppSettings } from '@/lib/settingsContext';
import { AlertCircle, ArrowUpRight, Check, Download, RefreshCw, ScanSearch, ShieldAlert, Terminal } from 'lucide-react';

export default function Home() {
  const { t, locale } = useAppSettings();
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
  const inventoryContentRef = useRef<HTMLDivElement>(null);
  const [inventoryHeight, setInventoryHeight] = useState<number | null>(null);

  // Modals
  const [showRemediation, setShowRemediation] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showMultiRepoPrompt, setShowMultiRepoPrompt] = useState(false);

  // GitHub token
  const [githubToken, setgithubToken] = useState('');

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
  }, []);

  useEffect(() => {
    if (!result || !inventoryViewportRef.current || !inventoryContentRef.current) return;
    const viewport = inventoryViewportRef.current;
    const content = inventoryContentRef.current;
    const updateHeight = () => {
      const table = content.querySelector('table.package-table');
      const rowSpacing = table ? Number.parseFloat(getComputedStyle(table).borderSpacing.split(' ')[1] || '0') : 0;
      const expandedHeight = Array.from(content.querySelectorAll<HTMLElement>('[data-package-details-row]'))
        .reduce((height, row) => height + row.getBoundingClientRect().height + rowSpacing, 0);
      setInventoryHeight(Math.min(viewport.clientHeight, content.getBoundingClientRect().height - expandedHeight));
    };
    const observer = new ResizeObserver(updateHeight);
    observer.observe(viewport);
    observer.observe(content);
    updateHeight();
    return () => observer.disconnect();
  }, [result]);

  const handleSaveToken = (token: string) => {
    setgithubToken(token);
  };

  const handleAnalyzeRepo = async (target: string | string[], forceRefresh = false) => {
    if (!forceRefresh && !Array.isArray(target)) {
      const cachedResult = getCachedAnalysis(target);
      if (cachedResult) {
        setOwnerAnalysis(null);
        setResult(cachedResult);
        setHistory(updateRepoHistoryItem(cachedResult.repoInfo.fullName, {
          repoUrl: cachedResult.repoInfo.fullName,
          score: cachedResult.healthScore.score,
          grade: cachedResult.healthScore.grade,
          totalPackages: cachedResult.totalPackages,
          criticalCount: cachedResult.summaryCounts.critical,
        }));
        setTableFilter('needs_attention');
        setIsScanOpen(false);
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
      const reportKey = batch ? saveOwnerAnalysisToCache(batch) : null;
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
      });
      setHistory(updatedHistory);

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

      setResult(data.data);
      setOwnerAnalysis(null);
      setTableFilter('needs_attention');
      setIsScanOpen(false);

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
    if (item.isMultiScan) {
      const cachedReport = item.analysisKey ? getCachedOwnerAnalysis(item.analysisKey) : null;
      if (cachedReport?.results.length) {
        setOwnerAnalysis(cachedReport);
        setResult(cachedReport.results[0]);
        setTableFilter('needs_attention');
        setIsScanOpen(false);
        return;
      }
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
      const reportKey = saveOwnerAnalysisToCache(refreshedOwnerAnalysis);
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
    <div className={`app-shell text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white antialiased ${result && !isScanOpen ? 'min-h-screen lg:h-screen lg:overflow-hidden' : !result && !error ? 'min-h-screen lg:h-dvh lg:overflow-hidden' : 'min-h-screen'}`}>
      {/* Top Header */}
      <Header
        onOpenTokenModal={() => setShowTokenModal(true)}
        hasCustomToken={Boolean(githubToken)}
        onOpenInfoModal={() => setShowInfoModal(true)}
      />

      {/* Main Container */}
      <main className={`flex-1 min-h-0 max-w-[1480px] w-full mx-auto px-4 sm:px-7 lg:px-10 ${result && !isScanOpen ? 'py-4 lg:overflow-hidden' : !result && !error ? 'flex flex-col py-8 lg:overflow-hidden lg:py-4' : 'py-8 lg:py-12'} space-y-8 lg:space-y-10`}>
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
          <div className="h-full min-h-0 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <section className="shrink-0 border border-slate-800 bg-slate-900/80 px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-4 min-w-0">
                  <span className={`shrink-0 inline-flex flex-col items-center justify-center w-16 h-16 border ${getGradeBadgeClass(result.healthScore.grade)}`}>
                    <span className="text-3xl font-black leading-none">{result.healthScore.grade}</span>
                    <span className="mt-1.5 text-[9px] font-bold tracking-[0.14em] leading-none text-white">SCORE</span>
                  </span>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="min-w-0 truncate font-mono text-sm text-emerald-300">{result.repoInfo.fullName}</div>
                      <span aria-hidden="true" className="h-3 border-l border-slate-700" />
                      <time
                        dateTime={result.analyzedAt}
                        className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-slate-400 whitespace-nowrap"
                      >
                        <span>{t('overview.last_scan')} · {new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(result.analyzedAt))}</span>
                      </time>
                    </div>
                    <div className="mt-0.5 text-sm text-slate-400">
                      <span><strong className={`${getScoreTextClass(result.healthScore.grade)} text-xl`}>{result.healthScore.score}</strong> / 100</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                 <button type="button" onClick={handleRescan} disabled={isLoading} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-700 text-slate-200 hover:text-white hover:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                   <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
                   {t('overview.rescan')}
                 </button>
                <button type="button" onClick={() => setShowRemediation(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-700 text-slate-200 hover:text-white hover:border-emerald-500/50 cursor-pointer">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" /> {t('overview.package_json')}
                </button>
                <button type="button" onClick={() => setShowExport(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-700 text-slate-200 hover:text-white hover:border-emerald-500/50 cursor-pointer">
                  <Download className="w-3.5 h-3.5 text-emerald-400" /> {t('overview.export')}
                </button>
                <button type="button" onClick={() => setIsScanOpen((open) => !open)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer" aria-expanded={isScanOpen}>
                  <ScanSearch className="w-3.5 h-3.5" /> {isScanOpen ? t('report.close_scan') : t('report.open_scan')}
                </button>
              </div>
            </section>

            <section className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Report metrics">
              <button type="button" onClick={() => setTableFilter('all')} className="text-left border border-slate-800 bg-slate-900/60 px-3 py-2.5 hover:border-emerald-500/50 transition-colors cursor-pointer">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{t('metrics.packages_checked')}</div>
                <div className="mt-1 flex items-end justify-between gap-2"><strong className="text-2xl text-white">{result.totalPackages}</strong><span className="text-[11px] text-slate-500">{result.dependenciesCount} deps</span></div>
              </button>
              <button type="button" onClick={() => setTableFilter('security')} className="text-left border border-slate-800 bg-slate-900/60 px-3 py-2.5 hover:border-red-500/50 transition-colors cursor-pointer">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{t('metrics.security_alerts')}</div>
                <div className="mt-1 flex items-end justify-between gap-2"><strong className="text-2xl text-red-400">{result.summaryCounts.critical + result.summaryCounts.security}</strong><ShieldAlert className="w-4 h-4 text-red-400" /></div>
              </button>
              <button type="button" onClick={() => setTableFilter('needs_attention')} className="text-left border border-slate-800 bg-slate-900/60 px-3 py-2.5 hover:border-amber-500/50 transition-colors cursor-pointer">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{t('metrics.need_update')}</div>
                <div className="mt-1 flex items-end justify-between gap-2"><strong className="text-2xl text-amber-300">{result.packages.filter((pkg) => pkg.category !== 'up_to_date' && !pkg.isUpdateDeferred).length}</strong><ArrowUpRight className="w-4 h-4 text-amber-400" /></div>
              </button>
              <button type="button" onClick={() => setTableFilter('up_to_date')} className="text-left border border-slate-800 bg-slate-900/60 px-3 py-2.5 hover:border-emerald-500/50 transition-colors cursor-pointer">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{t('metrics.up_to_date')}</div>
                <div className="mt-1 flex items-end justify-between gap-2"><strong className="text-2xl text-emerald-400">{result.summaryCounts.up_to_date}</strong><Check className="mb-1 h-4 w-4 text-emerald-400" aria-hidden="true" /></div>
              </button>
            </section>

            <div className="min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_480px] lg:grid-rows-[minmax(0,1fr)] gap-4">
              <section className="h-full min-h-0 flex flex-col" aria-label="Package breakdown">
                <div className="shrink-0 flex items-center justify-between gap-3 pb-3">
                  <h3 className="text-sm font-bold text-white">{t('table.title')}</h3>
                  <span className="text-xs font-mono text-slate-400">{result.packages.length}</span>
                </div>
                <div ref={inventoryViewportRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <div ref={inventoryContentRef}>
                    <PackageTable
                      packages={result.packages}
                      externalTab={tableFilter}
                    />
                  </div>
                </div>
              </section>

              <aside className="min-h-0 flex flex-col self-start" aria-label={t('scripts.title')}>
                <div className="shrink-0 flex items-center gap-2 pb-3">
                  <h3 className="text-sm font-bold text-white">{t('scripts.title')}</h3>
                </div>
                <div className="min-h-0 max-lg:h-auto!" style={inventoryHeight === null ? undefined : { height: inventoryHeight }}>
                  <UpdateScriptsPanel
                    key={result.repoInfo.fullName}
                    packages={result.packages}
                    packageManager={packageManager}
                    onChangePackageManager={setPackageManager}
                    onSelectPreset={handleSelectUpdatePreset}
                  />
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>

      {!result && (
        <footer className="mt-0 shrink-0 border-t border-slate-800/60 px-4 py-6 text-center text-xs text-slate-400 lg:py-3">
          <p>© {new Date().getFullYear()} upcheck.autem.dev — {t('footer.rights')}</p>
          <nav className="mt-2 flex justify-center gap-4" aria-label="Legal">
            <a href="/privacy" className="hover:text-emerald-300">Privacy</a>
            <a href="/terms" className="hover:text-emerald-300">Terms</a>
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
