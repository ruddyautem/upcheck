'use client';

import React, { useState, useMemo } from 'react';
import { PackageAnalysis } from '@/types';
import { 
  ChevronDown, 
  ShieldAlert, 
  AlertTriangle, 
  ArrowUpRight, 
  CheckCircle2, 
  ExternalLink, 
  Zap, 
  Wrench,
  Minus,
  Megaphone,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { isPackageUpdateDeferred, isTypeScript7Update, UpdateOptions } from '@/lib/updateCommands';
import { CATEGORY_CONFIGS } from '@/lib/categories';
import { useAppSettings } from '@/lib/settingsContext';

interface PackageTableProps {
  packages: PackageAnalysis[];
  updateOptions?: UpdateOptions;
  onToggleTypeScript7?: () => void;
  externalTab?: TableFilterTab;
}

export type TableFilterTab = 'all' | 'needs_attention' | 'security' | 'major' | 'minor_patch' | 'up_to_date';

function getResponsivePageSize() {
  if (typeof window === 'undefined') return 10;

  const { innerWidth, innerHeight } = window;
  if (innerWidth < 1280) return 0;
  if (innerHeight < 820) return 4;
  if (innerWidth < 1536 || innerHeight < 1024) return 5;
  return 10;
}

export function PackageTable({
  packages,
  externalTab,
  updateOptions = {},
  onToggleTypeScript7,
}: PackageTableProps) {
  const { t } = useAppSettings();
  const activeTab = externalTab || 'all';
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);
  const [closingPackage, setClosingPackage] = useState<string | null>(null);
  const [requestedPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  React.useEffect(() => {
    const updatePageSize = () => setPageSize(getResponsivePageSize());
    updatePageSize();
    window.addEventListener('resize', updatePageSize);
    return () => window.removeEventListener('resize', updatePageSize);
  }, []);

  // Filter packages based on activeTab
  const filteredPackages = useMemo(() => {
    let list = packages;

    if (activeTab === 'needs_attention') {
      list = list.filter((p) => p.category !== 'up_to_date');
    } else if (activeTab === 'security') {
      list = list.filter((p) => p.category === 'critical' || p.category === 'security');
    } else if (activeTab === 'major') {
      list = list.filter((p) => p.category === 'major');
    } else if (activeTab === 'minor_patch') {
      list = list.filter((p) => p.category === 'minor' || p.category === 'patch');
    } else if (activeTab === 'up_to_date') {
      list = list.filter((p) => p.category === 'up_to_date');
    }

    return list;
  }, [packages, activeTab]);

  // Pagination
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filteredPackages.length / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const paginatedPackages = useMemo(() => {
    if (pageSize === 0) return filteredPackages;
    const start = (currentPage - 1) * pageSize;
    return filteredPackages.slice(start, start + pageSize);
  }, [filteredPackages, currentPage, pageSize]);

  // Avatar pastel color generator based on package initial
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500/20 text-red-300 border-red-500/30',
      'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'bg-sky-500/20 text-sky-300 border-sky-500/30',
      'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const emptyRowCount = pageSize === 0 ? 0 : Math.max(0, pageSize - Math.max(paginatedPackages.length, 1));
  const compactTable = pageSize > 0 && pageSize < 10;

  return (
    <div className="min-w-0 w-full xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      {/* Table Container */}
      <div className="report-surface w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-2xl overflow-hidden shadow-xl xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
        <div className="min-w-0 overflow-x-auto sm:px-1.5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
          <table className="package-table w-full text-left border-separate border-spacing-y-1">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900 text-[0.6875rem] font-extrabold tracking-wider text-slate-300 uppercase">
                <th className={compactTable ? 'px-3 py-2' : 'px-4 py-3'}>{t('table.col_package')}</th>
                <th className={compactTable ? 'px-3 py-2' : 'px-4 py-3'}>{t('table.col_current')}</th>
                <th className={compactTable ? 'px-3 py-2' : 'px-4 py-3'}>{t('table.col_latest')}</th>
                <th className={`package-status-header pl-0 text-right ${compactTable ? 'py-2 pr-3' : 'py-3 pr-4'}`}><span className="inline-block w-40 text-left">{t('table.col_status')}</span></th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {paginatedPackages.length > 0 ? (
                <>
                {paginatedPackages.map((pkg) => {
                  const isExpanded = expandedPackage === pkg.name;
                  const isDeferred = isPackageUpdateDeferred(pkg, updateOptions);
                  const hasTypeScriptToggle = isTypeScript7Update(pkg) && Boolean(onToggleTypeScript7);
                  const config = CATEGORY_CONFIGS[pkg.category];
                  const hasDetails = Boolean(pkg.breakingWarning?.trim() || pkg.deprecatedReason?.trim() || pkg.advisories.length);
                  const latestVersionClass = isDeferred
                    ? 'text-slate-500 font-semibold'
                    : pkg.category === 'up_to_date'
                    ? 'text-emerald-400 font-semibold'
                    : pkg.category === 'critical'
                    ? 'text-red-400 font-bold'
                    : pkg.category === 'major'
                    ? 'text-blue-400 font-bold'
                    : 'text-cyan-400 font-semibold';
                  const statusContent = (
                    <span className="flex flex-1 items-center justify-center gap-1 px-1">
                      {isDeferred && <Minus className="w-3 h-3 text-slate-400" />}
                      {pkg.category === 'critical' && <ShieldAlert className="w-3 h-3 text-red-400" />}
                      {pkg.category === 'security' && <ShieldAlert className="w-3 h-3 text-orange-400" />}
                      {pkg.category === 'deprecated' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                      {pkg.category === 'major' && <ArrowUpRight className="w-3 h-3 text-blue-400" />}
                      {pkg.category === 'minor' && <Zap className="w-3 h-3 text-sky-400" />}
                      {pkg.category === 'patch' && <Wrench className="w-3 h-3 text-slate-400" />}
                      {pkg.category === 'up_to_date' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      <span>
                        {isDeferred
                          ? <>
                              <span className="sm:hidden">{t('category.deferred_short')}</span>
                              <span className="hidden sm:inline">{t('category.deferred')}</span>
                            </>
                          : pkg.category === 'critical'
                          ? (pkg.advisories.some((advisory) => advisory.severity === 'CRITICAL') ? t('category.critical') : t('category.high_risk'))
                          : t(`category.${pkg.category}`)}
                      </span>
                    </span>
                  );

                  return (
                    <React.Fragment key={pkg.name}>
                      <tr
                        onClick={hasDetails ? () => {
                          setClosingPackage(expandedPackage);
                          setExpandedPackage(isExpanded ? null : pkg.name);
                        } : undefined}
                        className={`package-row group text-xs transition-colors ${hasDetails ? 'cursor-pointer' : ''} ${pkg.category === 'critical' ? 'package-row--critical' : ''} ${isDeferred && !hasTypeScriptToggle ? 'opacity-65' : ''}`}
                      >
                        {/* Package Name & Type */}
                        <td className={compactTable ? 'px-3 py-2' : 'px-4 py-3'}>
                          <div className={compactTable ? 'flex items-center gap-2' : 'flex items-center gap-3'}>
                            {/* Avatar initial */}
                            <div
                              className={`${compactTable ? 'h-6 w-6 text-[0.625rem]' : 'h-7 w-7 text-xs'} shrink-0 rounded-lg flex items-center justify-center font-bold uppercase font-mono border ${getAvatarColor(
                                pkg.name
                              )}`}
                            >
                              {pkg.name.charAt(0)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="font-mono font-bold text-xs text-white group-hover:text-blue-300 transition-colors flex flex-wrap items-center gap-1.5 sm:whitespace-nowrap">
                                <span className="min-w-0 break-all sm:break-normal">{pkg.name}</span>

                                {pkg.hasBreakingChanges && (
                                  <span className="shrink-0 text-[0.5rem] leading-none font-sans px-1 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 font-black tracking-wide" title="Major version migration risk">
                                    {t('table.breaks_code')}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 text-[0.625rem] text-slate-400 font-sans" style={hasTypeScriptToggle ? { contain: 'inline-size' } : undefined}>
                                {hasTypeScriptToggle ? (
                                  <button
                                    type="button"
                                    onClick={(event) => { event.stopPropagation(); onToggleTypeScript7?.(); }}
                                    aria-pressed={Boolean(updateOptions.allowTypeScript7)}
                                    aria-label={t('scripts.include_typescript7')}
                                    title={t('scripts.typescript7_help')}
                                    className={`inline-flex max-w-full cursor-pointer items-center gap-1.5 text-left leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${updateOptions.allowTypeScript7 ? 'text-amber-200' : 'text-slate-400 hover:text-amber-200'}`}
                                  >
                                    <span className="min-w-0 whitespace-normal">{t('scripts.typescript7_anyway')}</span>
                                    <span aria-hidden="true" className={`relative h-4 w-7 shrink-0 transition-colors ${updateOptions.allowTypeScript7 ? 'bg-amber-500' : 'bg-slate-700'}`}>
                                      <span className={`absolute left-0.5 top-0.5 h-3 w-3 bg-white transition-transform ${updateOptions.allowTypeScript7 ? 'translate-x-3' : ''}`} />
                                    </span>
                                  </button>
                                ) : (
                                  <span>{pkg.isPeerDependency ? 'PeerDependency' : pkg.isDevDependency ? 'DevDependency' : 'Dependency'} • package.json</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Current Version */}
                        <td className={`package-version-cell package-version-cell--current font-mono text-slate-300 ${compactTable ? 'px-3 py-2' : 'px-4 py-3'}`}>
                          <span className="hidden sm:inline">{pkg.currentVersion}</span>
                          <span className="package-version-pair sm:hidden">
                            <span className="sr-only">{t('table.col_current')}: {pkg.currentVersion}. {t('table.col_latest')}: {pkg.latestVersion || '—'}</span>
                            <span aria-hidden="true">{pkg.currentVersion}</span>
                            <span aria-hidden="true" className="text-slate-400">→</span>
                            <span aria-hidden="true" className={latestVersionClass}>{pkg.latestVersion || '—'}</span>
                          </span>
                        </td>

                        {/* Latest Version */}
                        <td className={`package-version-cell package-version-cell--latest font-mono ${compactTable ? 'px-3 py-2' : 'px-4 py-3'}`} aria-label={`${t('table.col_latest')}: ${pkg.latestVersion || '—'}`}>
                          <span className="sr-only sm:hidden">{t('table.col_latest')}</span>
                          <span className={latestVersionClass}>
                            {pkg.latestVersion || '—'}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className={`package-status-cell pl-0 text-right ${compactTable ? 'py-2 pr-3' : 'py-3 pr-4'}`}>
                          {hasDetails ? <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setClosingPackage(expandedPackage);
                              setExpandedPackage(isExpanded ? null : pkg.name);
                            }}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? `Close advisories for ${pkg.name}` : `Show advisories for ${pkg.name}`}
                            className={`group/status inline-flex w-40 shrink-0 items-stretch overflow-hidden rounded border text-[0.625rem] leading-none font-semibold whitespace-nowrap transition-colors cursor-pointer ${compactTable ? 'h-7' : 'h-8'} ${isDeferred ? 'border-slate-600 bg-slate-800/60 text-slate-400' : config.badgeClass}`}
                          >
                            {statusContent}
                            <span className="flex w-8 items-center justify-center border-l border-current/20 bg-slate-950/25 transition-colors group-hover/status:bg-slate-950/45">
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${isExpanded ? 'rotate-180' : ''}`} />
                            </span>
                          </button> : <span className={`inline-flex w-40 items-stretch justify-center rounded border text-[0.625rem] leading-none font-semibold whitespace-nowrap ${compactTable ? 'h-7' : 'h-8'} ${isDeferred ? 'border-slate-600 bg-slate-800/60 text-slate-400' : config.badgeClass}`}>
                            {statusContent}
                          </span>}
                        </td>
                      </tr>

                      {/* Expanded Drawer Row */}
                      {hasDetails && (isExpanded || closingPackage === pkg.name) && (
                      <tr data-package-details-row className="bg-slate-950/70 border-b border-slate-800/80">
                          <td colSpan={4} className="p-0">
                            <div
                              className={`package-accordion-shell ${isExpanded ? 'package-accordion-shell--open' : 'package-accordion-shell--close'}`}
                              onAnimationEnd={(event) => {
                                if (event.target === event.currentTarget && !isExpanded) {
                                  setClosingPackage((current) => current === pkg.name ? null : current);
                                }
                              }}
                            >
                              <div className="package-accordion-clip">
                                <div className="package-accordion-content p-4 space-y-3">
                            {/* Breaking Changes Warning Banner */}
                            {pkg.breakingWarning && (
                              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/50 text-amber-200 text-xs flex items-start gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-amber-300">{t('inspector.breaking_banner')}:</span>
                                  <p className="text-slate-300 mt-0.5 leading-relaxed font-sans">
                                    {pkg.breakingWarning}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Maintainer Deprecation Notice */}
                            {pkg.deprecatedReason && (
                              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
                                <Megaphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-amber-300">{t('inspector.deprecate_banner')}:</span>
                                  <p className="text-slate-300 mt-0.5 font-mono text-[0.6875rem] leading-relaxed">
                                    {pkg.deprecatedReason}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Security Advisories List */}
                            {pkg.advisories.length > 0 && (
                              <div className="vulnerability-panel p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 space-y-2 text-xs">
                                <div className="flex items-center gap-2 font-bold text-red-400">
                                  <ShieldAlert className="w-3 h-4" />
                                  <span>{pkg.advisories.length} {t('table.known_vulns')}</span>
                                </div>
                                <div className="vulnerability-list space-y-2">
                                  {pkg.advisories.map((adv) => (
                                    <div key={adv.id} className="vulnerability-item p-2.5 rounded-lg bg-black/40 border border-red-900/30 space-y-1">
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2 font-mono">
                                          <span className="font-bold text-red-400">{adv.id}</span>
                                          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[0.625rem] font-bold">
                                            {adv.severity}
                                          </span>
                                        </div>
                                        {adv.fixedIn && (
                                          <span className="text-[0.6875rem] font-mono text-emerald-400 font-semibold">
                                            {t('inspector.fixed_in')} {adv.fixedIn}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[0.6875rem] text-slate-300">{adv.title}</p>
                                      <a href={adv.advisoryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[0.6875rem] text-cyan-300 hover:text-cyan-200 hover:underline">
                                        <span>{t('inspector.ref_link')}</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex justify-end pt-1 text-xs">
                              <div className="flex items-center gap-3">
                                <a
                                  href={pkg.npmUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                                >
                                  <span>NPM</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                {pkg.repositoryUrl && (
                                  <a
                                    href={pkg.repositoryUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                                  >
                                    <span>Repo</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {Array.from({ length: emptyRowCount }).map((_, index) => (
                  <tr key={`empty-row-${index}`} aria-hidden="true">
                    <td colSpan={4} className="h-14 select-none" />
                  </tr>
                ))}
                </>
              ) : (
                <>
                  <tr>
                    <td colSpan={4} className="h-14 px-4 text-center text-slate-500">
                      {t('table.no_match')}
                    </td>
                  </tr>
                  {Array.from({ length: emptyRowCount }).map((_, index) => (
                    <tr key={`empty-row-${index}`} aria-hidden="true">
                      <td colSpan={4} className="h-14 select-none" />
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pageSize > 0 && <div className={`${compactTable ? 'p-3' : 'p-4'} shrink-0 border-t border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400`}>
            <div>
              {t('table.showing')}{' '}
              <strong className="text-slate-200">
                {filteredPackages.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{' '}
              {t('table.to')}{' '}
              <strong className="text-slate-200">
                {Math.min(currentPage * pageSize, filteredPackages.length)}
              </strong>{' '}
              {t('table.of')} <strong className="text-slate-200">{filteredPackages.length}</strong> {t('table.packages')}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{t('table.previous')}</span>
              </button>

              <span className="px-2 font-mono text-slate-400">
                {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors cursor-pointer"
              >
                <span>{t('table.next')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>}
      </div>
    </div>
  );
}
