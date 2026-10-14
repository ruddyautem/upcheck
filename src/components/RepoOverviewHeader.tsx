'use client';

import React from 'react';
import { RepoAnalysisResult } from '@/types';
import { GithubIcon } from '@/components/GithubIcon';
import { Download, ExternalLink, Terminal, ShieldAlert, CheckCircle2, AlertTriangle, ArrowUpCircle } from 'lucide-react';
import { useAppSettings } from '@/lib/settingsContext';

interface RepoOverviewHeaderProps {
  result: RepoAnalysisResult;
  onOpenExport: () => void;
  onOpenRemediation: () => void;
}

export function RepoOverviewHeader({
  result,
  onOpenExport,
  onOpenRemediation,
}: RepoOverviewHeaderProps) {
  const { t, language } = useAppSettings();
  const { repoInfo, analyzedAt, healthScore, summaryCounts, totalPackages } = result;
  const breakingUpdates = result.packages.filter((pkg) => pkg.hasBreakingChanges).length;

  const formattedDate = new Date(analyzedAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const getGradeTheme = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return {
          badge: 'bg-emerald-600 text-white ring-4 ring-emerald-500/30 shadow-lg shadow-emerald-900/50',
          text: 'text-emerald-300',
          bar: 'bg-emerald-500',
          bg: 'health-score-panel',
        };
      case 'B':
        return {
          badge: 'bg-sky-600 text-white ring-4 ring-sky-500/30 shadow-lg shadow-sky-900/50',
          text: 'text-sky-300',
          bar: 'bg-sky-500',
          bg: 'health-score-panel',
        };
      case 'C':
        return {
          badge: 'bg-amber-600 text-white ring-4 ring-amber-500/30 shadow-lg shadow-amber-900/50',
          text: 'text-amber-300',
          bar: 'bg-amber-500',
          bg: 'health-score-panel',
        };
      case 'D':
        return {
          badge: 'bg-orange-600 text-white ring-4 ring-orange-500/30 shadow-lg shadow-orange-900/50',
          text: 'text-orange-300',
          bar: 'bg-orange-500',
          bg: 'health-score-panel',
        };
      default:
        return {
          badge: 'bg-red-600 text-white ring-4 ring-red-500/30 shadow-lg shadow-red-900/50 animate-pulse',
          text: 'text-red-300',
          bar: 'bg-red-500',
          bg: 'health-score-panel',
        };
    }
  };

  const theme = getGradeTheme(healthScore.grade);

  return (
    <div className="space-y-3">
      {/* Top title & Action buttons */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
            {t('overview.badge')}
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
            {t('overview.title')}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenRemediation}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold shadow-md shadow-blue-900/40 transition-colors cursor-pointer"
            title="Generate Update Script"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('overview.update_script')}</span>
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
            title="Export Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('overview.export')}</span>
          </button>
        </div>
      </div>

      {/* Target Repo & Prominent Health Score Card */}
      <div className="report-surface p-4 sm:p-6 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-xl grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)] gap-5 lg:gap-8 items-center">
        {/* Repo Information */}
        <div className="space-y-3 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white border border-slate-800 shrink-0 shadow-inner">
              <GithubIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-base sm:text-lg text-white font-mono truncate max-w-[240px]">
                  {repoInfo.fullName}
                </span>
                {!repoInfo.isCustomJson && (
                  <a
                    href={`https://github.com/${repoInfo.fullName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                    title="Open on GitHub"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <div className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-0.5 font-medium flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-200 border border-slate-700 font-mono text-[10px]">
                  {repoInfo.defaultBranch || 'main'}
                </span>
                <span>•</span>
                <span>{t('overview.manifest')}</span>
                <span>•</span>
                <span className="text-slate-400">{t('overview.scanned')} {formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Quick status summary chips */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-200 border border-slate-700 font-medium text-[11px]">
              {totalPackages} {t('overview.deps')}
            </span>
            {summaryCounts.critical + summaryCounts.security > 0 ? (
              <span className="px-2 py-0.5 rounded-lg bg-red-600 text-white font-bold flex items-center gap-1 shadow-sm text-[11px]">
                <ShieldAlert className="w-3 h-3" />
                <span>{summaryCounts.critical + summaryCounts.security} {t(summaryCounts.critical + summaryCounts.security === 1 ? 'overview.security_alert' : 'overview.security_alerts')}</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1 shadow-sm text-[11px]">
                <CheckCircle2 className="w-3 h-3" />
                <span>{t('overview.zero_cves')}</span>
              </span>
            )}
            {summaryCounts.deprecated > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-amber-600 text-white font-bold flex items-center gap-1 shadow-sm text-[11px]">
                <AlertTriangle className="w-3 h-3" />
                <span>{summaryCounts.deprecated} {t('overview.deprecated')}</span>
              </span>
            )}
            {breakingUpdates > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-bold flex items-center gap-1 shadow-sm text-[11px]">
                <ArrowUpCircle className="w-3 h-3" />
                <span>{breakingUpdates} {t('overview.breaking_updates')}</span>
              </span>
            )}
          </div>
        </div>

        {/* PROMINENT HIGH-VISIBILITY HEALTH SCORE PANEL */}
        <div className={`p-3.5 sm:p-4 rounded-xl border shadow-lg flex items-center gap-4 ${theme.bg}`}>
          {/* Large Vibrant Grade Box */}
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex flex-col items-center justify-center shrink-0 ${theme.badge}`}>
            <span className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
              {healthScore.grade}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 opacity-90">
              {t('overview.grade')}
            </span>
          </div>

          {/* Numerical Score & Progress */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {healthScore.score}
                </span>
                <span className="text-xs font-bold text-slate-300">/ 100</span>
              </div>
              <div className={`text-[11px] font-extrabold uppercase tracking-wider ${theme.text}`}>
                {healthScore.label}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-700/60">
              <div
                className={`h-full transition-all duration-500 rounded-full ${theme.bar}`}
                style={{ width: `${healthScore.score}%` }}
              />
            </div>

            <p className="text-[10px] text-slate-300 leading-tight">
              {healthScore.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
