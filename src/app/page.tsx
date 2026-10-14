'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { RepoInput } from '@/components/RepoInput';
import { RepoOverviewHeader } from '@/components/RepoOverviewHeader';
import { ReportAlerts } from '@/components/ReportAlerts';
import { MetricCardsRow } from '@/components/MetricCardsRow';
import { PackageTable, TableFilterTab } from '@/components/PackageTable';
import { PackageResultsPanel } from '@/components/PackageResultsPanel';
import { UpcheckScanner } from '@/components/UpcheckScanner';
import { UpdateSelectionCartPanel } from '@/components/UpdateSelectionCartPanel';
import { RemediationModal } from '@/components/RemediationModal';
import { ExportModal } from '@/components/ExportModal';
import { TokenModal } from '@/components/TokenModal';
import { InfoModal } from '@/components/InfoModal';
import { RepoAnalysisResult, PackageAnalysis, RawPackageJson, PackageManager } from '@/types';
import { getRepoHistory, saveRepoToHistory, HistoryItem } from '@/lib/history';
import { triggerCelebration } from '@/lib/confetti';
import { useAppSettings } from '@/lib/settingsContext';
import { 
  AlertCircle, 
  ShieldAlert, 
  Layers, 
  Terminal,
  ArrowDownRight,
  ArrowUpRight,
  ScanSearch
} from 'lucide-react';

export default function Home() {
  const { t } = useAppSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RepoAnalysisResult | null>(null);
  const [isScanOpen, setIsScanOpen] = useState(true);

  // Recent scans history
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Filter for table synced with metric cards
  const [tableFilter, setTableFilter] = useState<TableFilterTab>('all');

  // Multi-package selection & package manager
  const [selectedPackages, setSelectedPackages] = useState<PackageAnalysis[]>([]);
  const [packageManager, setPackageManager] = useState<PackageManager>('bun');

  // Inspected Package on the right side
  const [inspectedPackage, setInspectedPackage] = useState<PackageAnalysis | null>(null);

  // Modals
  const [showRemediation, setShowRemediation] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // GitHub token
  const [githubToken, setgithubToken] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Measure table section height to limit package inspector height
  const tableSectionRef = useRef<HTMLElement>(null);
  const [tableHeight, setTableHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!tableSectionRef.current) return;
    const updateHeight = () => {
      if (tableSectionRef.current) {
        const height = tableSectionRef.current.offsetHeight;
        if (height > 100) {
          // Reserve precisely the inspector kicker and its vertical gap so both panels share a bottom edge.
          setTableHeight(Math.max(300, height - 28));
        }
      }
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(tableSectionRef.current);
    window.addEventListener('resize', updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [result]);

  useEffect(() => {
    const savedToken = localStorage.getItem('upcheck_github_token');
    if (savedToken) {
      setgithubToken(savedToken);
    }
    setHistory(getRepoHistory());
  }, []);

  const handleSaveToken = (token: string) => {
    setgithubToken(token);
    if (token) {
      localStorage.setItem('upcheck_github_token', token);
    } else {
      localStorage.removeItem('upcheck_github_token');
    }
  };

  const handleAnalyzeRepo = async (repoUrl: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedPackages([]);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          githubToken: githubToken || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze repository dependencies.');
      }

      setResult(data.data);
      setIsScanOpen(false);
      if (data.data.packages.length > 0) {
        setInspectedPackage(data.data.packages[0]);
      }

      const updatedHistory = saveRepoToHistory({
        fullName: data.data.repoInfo.fullName,
        repoUrl,
        score: data.data.healthScore.score,
        grade: data.data.healthScore.grade,
        totalPackages: data.data.totalPackages,
        criticalCount: data.data.summaryCounts.critical,
      });
      setHistory(updatedHistory);

      if (data.data.healthScore.score >= 85) {
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
    setSelectedPackages([]);

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
      setIsScanOpen(false);
      if (data.data.packages.length > 0) {
        setInspectedPackage(data.data.packages[0]);
      }

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
    if (item.repoUrl) handleAnalyzeRepo(item.repoUrl);
  };

  // Selection handlers
  const handleToggleSelect = (pkg: PackageAnalysis) => {
    if (pkg.category === 'up_to_date') return;
    setSelectedPackages((prev) => {
      const exists = prev.some((p) => p.name === pkg.name);
      return exists ? prev.filter((p) => p.name !== pkg.name) : [...prev, pkg];
    });
  };

  const handleSelectMultiple = (pkgs: PackageAnalysis[]) => {
    setSelectedPackages(pkgs.filter((pkg) => pkg.category !== 'up_to_date'));
  };

  const handleRemovePackage = (pkgName: string) => {
    setSelectedPackages((prev) => prev.filter((p) => p.name !== pkgName));
  };

  const handleClearSelection = () => {
    setSelectedPackages([]);
  };

  const handleSelectAllOutdated = () => {
    if (!result) return;
    const updateable = result.packages.filter((p) => p.category !== 'up_to_date');
    setSelectedPackages(updateable);
  };

  const isInspectedSelected = inspectedPackage
    ? selectedPackages.some((p) => p.name === inspectedPackage.name)
    : false;

  const scrollToRight = () => {
    document.getElementById('update-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const inspectPackage = (pkg: PackageAnalysis) => {
    setInspectedPackage(pkg);
  };

  return (
    <div className="app-shell min-h-screen text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white antialiased">
      {/* Top Header */}
      <Header
        onOpenTokenModal={() => setShowTokenModal(true)}
        hasCustomToken={Boolean(githubToken)}
        onOpenInfoModal={() => setShowInfoModal(true)}
        selectedCount={selectedPackages.length}
        onOpenRightPanel={scrollToRight}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1480px] w-full mx-auto px-4 sm:px-7 lg:px-10 py-8 lg:py-12 space-y-8 lg:space-y-10">
        {(!result || isScanOpen) && (
          <section className={`w-full transition-all ${result ? 'p-4 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800' : ''}`}>
            <UpcheckScanner
              onAnalyzeRepo={handleAnalyzeRepo}
              onAnalyzeCustomJson={handleAnalyzeCustomJson}
              isLoading={isLoading}
              history={history}
              onSelectHistoryItem={handleSelectHistoryItem}
              onOpenTokenModal={() => setShowTokenModal(true)}
              onOpenInfoModal={() => setShowInfoModal(true)}
              compact={Boolean(result)}
            />
          </section>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-red-300">{t('error.analysis_title')}</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Scanned report */}
        {result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="report-heading">
              <div>
                <div className="section-kicker">{t('report.kicker')} <span>/</span> {result.repoInfo.fullName}</div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2">{t('report.title')}</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="report-status"><span /> {t('report.complete')}</span>
                <button
                  type="button"
                  onClick={() => setIsScanOpen((open) => !open)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:border-sky-500/50 hover:text-white transition-colors cursor-pointer"
                  aria-expanded={isScanOpen}
                >
                  <ScanSearch className="w-4 h-4 text-sky-400" />
                  {isScanOpen ? t('report.close_scan') : t('report.open_scan')}
                </button>
              </div>
            </div>
            <RepoOverviewHeader
              result={result}
              onOpenExport={() => setShowExport(true)}
              onOpenRemediation={() => setShowRemediation(true)}
            />
            <MetricCardsRow
              result={result}
              onFilterAll={() => setTableFilter('all')}
              onFilterSecurity={() => setTableFilter('security')}
              onFilterOutdated={() => setTableFilter('needs_attention')}
              onFilterUpToDate={() => setTableFilter('up_to_date')}
            />
            <ReportAlerts packages={result.packages} onInspect={inspectPackage} />

            <div className="report-workspace report-workspace--three-col">
              {/* LEFT COLUMN: Update Terminal & Queue (on the left of everything) */}
              <aside className="min-w-0 space-y-4 report-workspace__left" aria-label="Update Terminal & Queue">
                <div id="update-queue" className="space-y-3 sticky top-20">
                  <div className="section-kicker">
                    01 / {t('cart.title')}
                  </div>
                  <UpdateSelectionCartPanel
                    selectedPackages={selectedPackages}
                    packageManager={packageManager}
                    onChangePackageManager={setPackageManager}
                    onRemovePackage={handleRemovePackage}
                    onClearSelection={handleClearSelection}
                    onSelectAllOutdated={handleSelectAllOutdated}
                    onInspect={inspectPackage}
                  />
                </div>
              </aside>

              {/* CENTER COLUMN: Package breakdown */}
              <section 
                ref={tableSectionRef}
                className="min-w-0 space-y-4 report-workspace__center" 
                aria-label="Package breakdown"
              >
                <div className="workspace-heading">
                  <div className="min-w-0">
                    <div className="section-kicker">02 / {t('report.inventory')}</div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2 mt-1.5">
                      <span>{t('table.title')}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold shrink-0">
                        {result.packages.length}
                      </span>
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {t('table.subtitle')}
                    </p>
                  </div>
                  <ArrowDownRight className="w-5 h-5 text-slate-600 hidden sm:block" />
                </div>

                <PackageTable
                  packages={result.packages}
                  selectedPackages={selectedPackages}
                  onToggleSelect={handleToggleSelect}
                  onSelectMultiple={handleSelectMultiple}
                  onClearSelection={handleClearSelection}
                  onOpenDetailsModal={inspectPackage}
                  externalTab={tableFilter}
                />
              </section>

              {/* RIGHT COLUMN: Package Inspector */}
              <aside className="min-w-0 space-y-4 report-workspace__right" aria-label="Package inspector">
                <div id="package-inspector" className="space-y-3 sticky top-20">
                  <div className="section-kicker">
                    03 / {t('inspector.title')}
                  </div>
                  <PackageResultsPanel
                    pkg={inspectedPackage}
                    isSelected={isInspectedSelected}
                    onToggleSelect={handleToggleSelect}
                    maxHeight={tableHeight}
                  />
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500 mt-12">
        <p>Upcheck — Fast dependency auditor & CVE inspector. Powered by Bun & Next.js.</p>
      </footer>

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
    </div>
  );
}
