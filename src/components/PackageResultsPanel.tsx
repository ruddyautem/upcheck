'use client';

import React, { useState } from 'react';
import { PackageAnalysis } from '@/types';
import { CATEGORY_CONFIGS } from '@/lib/categories';
import { useAppSettings } from '@/lib/settingsContext';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Megaphone, 
  ExternalLink, 
  Copy, 
  Check, 
  Plus, 
  X,
  Info
} from 'lucide-react';
import { GithubIcon } from '@/components/GithubIcon';
import { getMigrationUrl } from '@/lib/i18nFormatters';

interface PackageResultsPanelProps {
  pkg: PackageAnalysis | null;
  isSelected: boolean;
  onToggleSelect: (pkg: PackageAnalysis) => void;
  maxHeight?: number;
}

export function PackageResultsPanel({
  pkg,
  isSelected,
  onToggleSelect,
  maxHeight,
}: PackageResultsPanelProps) {
  const { t } = useAppSettings();
  const [copied, setCopied] = useState(false);

  if (!pkg) {
    return (
      <div 
        style={{ height: maxHeight ? `${maxHeight}px` : undefined }}
        className="report-surface p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center justify-center min-h-[220px] space-y-2"
      >
        <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <Info className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-semibold text-slate-200">{t('inspector.title')}</h4>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          {t('inspector.click_hint')}
        </p>
      </div>
    );
  }

  const config = CATEGORY_CONFIGS[pkg.category];
  const isUpdateable = pkg.category !== 'up_to_date';

  const handleCopyInstall = () => {
    const devFlag = pkg.isDevDependency ? ' -d' : '';
    navigator.clipboard.writeText(`bun add${devFlag} ${pkg.name}@latest`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      style={{ height: maxHeight ? `${maxHeight}px` : undefined }}
      className="report-surface p-5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl flex flex-col overflow-hidden"
    >
      {/* Header - Fixed top */}
      <div className="flex items-start justify-between gap-3 shrink-0 pb-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold font-mono text-white">{pkg.name}</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.badgeClass}`}>
              {pkg.category === 'critical'
                ? (pkg.advisories.some((advisory) => advisory.severity === 'CRITICAL') ? t('category.critical') : t('category.high_risk'))
                : t(`category.${pkg.category}`)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('inspector.declared')}{' '}<code className="text-slate-300 font-mono">{pkg.currentSpec}</code>
          </p>
        </div>

        <button
          onClick={() => {
            if (isUpdateable) onToggleSelect(pkg);
          }}
          disabled={!isUpdateable}
          title={isUpdateable ? undefined : t('category.up_to_date')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
            isUpdateable ? 'cursor-pointer' : 'cursor-not-allowed opacity-45'
          } ${
            isSelected
              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
          }`}
        >
          {isSelected ? (
            <>
              <X className="w-3.5 h-3.5" />
              <span>{t('inspector.queued_btn')}</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>{t('inspector.queue_btn')}</span>
            </>
          )}
        </button>
      </div>

      {/* Scrollable Content (capped at table height, scrolls cleanly inside if tall) */}
      <div className="package-inspector-scroll flex-1 min-h-0 overflow-y-scroll space-y-4 pr-1 my-3">
        {/* Version Comparison Row */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">{t('inspector.current')}</span>
            <div className="font-mono font-bold text-sm text-slate-200">{pkg.currentVersion}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">{t('inspector.latest')}</span>
            <div className="font-mono font-bold text-sm text-cyan-400">{pkg.latestVersion}</div>
          </div>
        </div>

        {/* Definitive Breaking Changes Alert */}
        {pkg.breakingWarning && (
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{t('inspector.breaking_banner')}</span>
              </div>
              <a
                href={getMigrationUrl(pkg)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-cyan-400 hover:text-cyan-300 text-[11px] inline-flex items-center gap-1 hover:underline font-medium cursor-pointer"
              >
                <span>{t('alerts.migration_ref')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">{pkg.breakingWarning}</p>
          </div>
        )}

        {/* Maintainer Deprecation Notice */}
        {pkg.deprecatedReason && (
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{t('inspector.deprecate_banner')}</span>
            </div>
            <p className="text-slate-300 font-mono text-[11px] leading-relaxed break-words">
              {pkg.deprecatedReason}
            </p>
          </div>
        )}

        {/* Security Advisories (OSV) */}
        {pkg.advisories.length > 0 && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-red-400">
              <ShieldAlert className="w-4 h-4" />
              <span>{t('inspector.known_advisories')} ({pkg.advisories.length})</span>
            </div>

            <div className="vulnerability-list space-y-2 pr-1">
              {pkg.advisories.map((adv) => (
                <div key={adv.id} className="vulnerability-item p-2.5 rounded-xl bg-red-950/20 border border-red-500/30 space-y-1">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className="font-mono font-bold text-red-400">{adv.id}</span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      adv.severity === 'CRITICAL' ? 'bg-red-500/30 text-red-300' :
                      adv.severity === 'HIGH' ? 'bg-orange-500/30 text-orange-300' :
                      'bg-amber-500/30 text-amber-300'
                    }`}>
                      {adv.severity}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{adv.title}</p>
                  {adv.fixedIn && (
                    <div className="text-[11px] font-mono text-emerald-400 font-medium">
                      {t('inspector.fixed_in')} {adv.fixedIn}
                    </div>
                  )}
                  <a
                    href={adv.advisoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 text-[11px] inline-flex items-center gap-1 hover:underline"
                  >
                    <span>{t('inspector.ref_link')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Action & Links - Pinned at bottom */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0 mt-auto">
        <button
          onClick={handleCopyInstall}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors font-mono text-[11px] cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? t('cart.copied') : t('inspector.copy_install')}</span>
        </button>

        <div className="flex items-center gap-3">
          <a
            href={pkg.npmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white flex items-center gap-1"
          >
            <span>{t('inspector.npm_page')}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          {pkg.repositoryUrl && (
            <a
              href={pkg.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white flex items-center gap-1"
            >
              <GithubIcon className="w-3 h-3" />
              <span>{t('inspector.repo_page')}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
