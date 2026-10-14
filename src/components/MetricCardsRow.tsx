'use client';

import React from 'react';
import { RepoAnalysisResult } from '@/types';
import { Package, ShieldAlert, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useAppSettings } from '@/lib/settingsContext';

interface MetricCardsRowProps {
  result: RepoAnalysisResult;
  onFilterSecurity: () => void;
  onFilterOutdated: () => void;
  onFilterUpToDate: () => void;
  onFilterAll: () => void;
}

export function MetricCardsRow({
  result,
  onFilterSecurity,
  onFilterOutdated,
  onFilterUpToDate,
  onFilterAll,
}: MetricCardsRowProps) {
  const { t } = useAppSettings();
  const { totalPackages, dependenciesCount, summaryCounts } = result;

  const totalSecurity = summaryCounts.critical + summaryCounts.security;
  const needUpdate = result.packages.filter((pkg) => pkg.category !== 'up_to_date').length;
  const breakingUpdates = result.packages.filter((pkg) => pkg.hasBreakingChanges).length;
  const upToDate = summaryCounts.up_to_date;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Packages Checked */}
      <button
        onClick={onFilterAll}
        className="metric-card report-surface p-5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-lg transition-all text-left flex flex-col justify-between group cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-300">{t('metrics.packages_checked')}</span>
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-900/40 group-hover:scale-105 transition-transform">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-sans">
            {totalPackages}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-medium">
            — {dependenciesCount} {t('metrics.direct_deps')}
          </div>
        </div>
      </button>

      {/* 2. Security Alerts */}
      <button
        onClick={onFilterSecurity}
        className="metric-card report-surface p-5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-lg transition-all text-left flex flex-col justify-between group cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-300">{t('metrics.security_alerts')}</span>
          <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-900/40 group-hover:scale-105 transition-transform">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-black text-red-400 tracking-tight font-sans">
            {String(totalSecurity).padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-medium">
            — {totalSecurity === 1 ? `1 ${t('metrics.active_advisory')}` : `${totalSecurity} ${t('metrics.active_advisories')}`}
          </div>
        </div>
      </button>

      {/* 3. Need an Update */}
      <button
        onClick={onFilterOutdated}
        className="metric-card report-surface p-5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-lg transition-all text-left flex flex-col justify-between group cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-300">{t('metrics.need_update')}</span>
          <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-900/40 group-hover:scale-105 transition-transform">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-black text-amber-300 tracking-tight font-sans">
            {String(needUpdate).padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-medium">
            — <strong className="text-amber-300">{breakingUpdates} {t('metrics.major_breaks')}</strong> • {summaryCounts.minor + summaryCounts.patch} {t('metrics.minor_patch')}
          </div>
        </div>
      </button>

      {/* 4. Up to Date */}
      <button
        onClick={onFilterUpToDate}
        className="metric-card report-surface p-5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-lg transition-all text-left flex flex-col justify-between group cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-300">{t('metrics.up_to_date')}</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-900/40 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight font-sans">
            {String(upToDate).padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-medium">
            — {t('metrics.fully_up_to_date')}
          </div>
        </div>
      </button>
    </div>
  );
}
