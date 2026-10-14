'use client';

import React, { useState, useMemo } from 'react';
import { PackageAnalysis, UpdateCategory } from '@/types';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert, 
  AlertTriangle, 
  ArrowUpRight, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Zap, 
  Wrench,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { CATEGORY_CONFIGS } from '@/lib/categories';
import { useAppSettings } from '@/lib/settingsContext';

interface PackageTableProps {
  packages: PackageAnalysis[];
  selectedPackages: PackageAnalysis[];
  onToggleSelect: (pkg: PackageAnalysis) => void;
  onSelectMultiple: (pkgs: PackageAnalysis[]) => void;
  onClearSelection: () => void;
  onOpenDetailsModal: (pkg: PackageAnalysis) => void;
  externalTab?: TableFilterTab;
}

export type TableFilterTab = 'all' | 'needs_attention' | 'security' | 'major' | 'minor_patch' | 'up_to_date';

export function PackageTable({
  packages,
  selectedPackages,
  onToggleSelect,
  onSelectMultiple,
  onClearSelection,
  onOpenDetailsModal,
  externalTab,
}: PackageTableProps) {
  const { t } = useAppSettings();
  const [activeTab, setActiveTab] = useState<TableFilterTab>(externalTab || 'all');
  const [showUpToDate, setShowUpToDate] = useState(false);
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync external tab filter if changed
  React.useEffect(() => {
    if (externalTab) {
      setActiveTab(externalTab);
      setCurrentPage(1);
    }
  }, [externalTab]);

  // Selected names set for fast lookup
  const selectedNames = useMemo(
    () => new Set(selectedPackages.map((p) => p.name)),
    [selectedPackages]
  );

  // Filter packages based on activeTab
  const filteredPackages = useMemo(() => {
    let list = packages;

    if (activeTab === 'needs_attention') {
      list = list.filter((p) => p.category !== 'up_to_date');
    } else if (activeTab === 'security') {
      list = list.filter((p) => p.category === 'critical' || p.category === 'security');
    } else if (activeTab === 'major') {
      list = list.filter((p) => p.hasBreakingChanges);
    } else if (activeTab === 'minor_patch') {
      list = list.filter((p) => p.category === 'minor' || p.category === 'patch');
    } else if (activeTab === 'up_to_date') {
      list = list.filter((p) => p.category === 'up_to_date');
    }

    return !showUpToDate && activeTab !== 'up_to_date'
      ? list.filter((p) => p.category !== 'up_to_date')
      : list;
  }, [packages, activeTab, showUpToDate]);

  // Reset to page 1 on filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredPackages.length / pageSize));
  const paginatedPackages = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPackages.slice(start, start + pageSize);
  }, [filteredPackages, currentPage, pageSize]);

  // Quick multi-select buttons
  const togglePackageGroup = (group: PackageAnalysis[]) => {
    const allSelected = group.length > 0 && group.every((p) => selectedNames.has(p.name));
    onSelectMultiple(
      allSelected
        ? selectedPackages.filter((p) => !group.some((groupPkg) => groupPkg.name === p.name))
        : Array.from(new Map([...selectedPackages, ...group].map((p) => [p.name, p])).values())
    );
  };

  const handleCopyCmd = (pkgName: string) => {
    navigator.clipboard.writeText(`bun add ${pkgName}@latest`);
    setCopiedId(pkgName);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  const updateablePackages = packages.filter((p) => p.category !== 'up_to_date');
  const isAllSelected = updateablePackages.length > 0 && updateablePackages.every((p) => selectedNames.has(p.name));
  const securityPackages = packages.filter((p) => p.category === 'critical' || p.category === 'security');
  const majorPackages = packages.filter((p) => p.category === 'major');
  const minorPackages = packages.filter((p) => p.category === 'minor');
  const patchPackages = packages.filter((p) => p.category === 'patch');
  const isSecurityAllSelected = securityPackages.length > 0 && securityPackages.every((p) => selectedNames.has(p.name));
  const isMajorAllSelected = majorPackages.length > 0 && majorPackages.every((p) => selectedNames.has(p.name));
  const isMinorAllSelected = minorPackages.length > 0 && minorPackages.every((p) => selectedNames.has(p.name));
  const isPatchAllSelected = patchPackages.length > 0 && patchPackages.every((p) => selectedNames.has(p.name));
  const emptyRowCount = Math.max(0, pageSize - paginatedPackages.length);

  return (
    <div className="space-y-4">
      {/* Header bar: Clean Select Dropdown Menu instead of pills and search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <label htmlFor="package-filter-select" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 shrink-0">
            <span>{t('table.filter_label')}</span>
          </label>
          <div className="relative flex-1 sm:w-64">
            <select
              id="package-filter-select"
              value={activeTab}
              onChange={(e) => {
                const nextTab = e.target.value as TableFilterTab;
                setActiveTab(nextTab);
                if (nextTab === 'up_to_date') setShowUpToDate(true);
                setCurrentPage(1);
              }}
              className="w-full appearance-none pl-3.5 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans cursor-pointer shadow-sm"
            >
              {[
                { id: 'all', label: t('table.all'), count: packages.length },
                { 
                  id: 'needs_attention', 
                  label: t('table.needs_attention'), 
                  count: packages.filter(p => p.category !== 'up_to_date').length 
                },
                { 
                  id: 'security', 
                  label: t('table.security'), 
                  count: packages.filter(p => p.category === 'critical' || p.category === 'security').length 
                },
                { 
                  id: 'major', 
                  label: t('table.major'), 
                  count: packages.filter(p => p.hasBreakingChanges).length 
                },
                { 
                  id: 'minor_patch', 
                  label: t('table.minor_patch'), 
                  count: packages.filter(p => p.category === 'minor' || p.category === 'patch').length 
                },
                { 
                  id: 'up_to_date', 
                  label: t('table.up_to_date_tab'), 
                  count: packages.filter(p => p.category === 'up_to_date').length 
                },
              ].map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            type="button"
            onClick={() => {
              const nextValue = !showUpToDate;
              setShowUpToDate(nextValue);
              if (!nextValue && activeTab === 'up_to_date') setActiveTab('all');
              setCurrentPage(1);
            }}
            className="inline-flex w-full sm:w-56 shrink-0 items-center justify-center gap-1.5 px-2.5 py-2 border border-slate-700 bg-slate-900 text-slate-400 hover:text-emerald-300 hover:border-emerald-500/50 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap"
            aria-pressed={showUpToDate}
            aria-label={showUpToDate ? t('table.hide_up_to_date') : t('table.show_up_to_date')}
            title={showUpToDate ? t('table.hide_up_to_date') : t('table.show_up_to_date')}
          >
            {showUpToDate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showUpToDate ? t('table.hide_up_to_date') : t('table.show_up_to_date')}</span>
          </button>
        </div>
      </div>

      {/* Quick selection toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={() => togglePackageGroup(updateablePackages)}
              className="check-control check-control--all cursor-pointer"
            />
            <span className="text-slate-300 font-medium">{t('table.select_page')}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none text-red-300 hover:text-red-200 transition-colors">
            <input
              type="checkbox"
              checked={isSecurityAllSelected}
              onChange={() => togglePackageGroup(securityPackages)}
              className="check-control check-control--security cursor-pointer"
            />
            <span className="font-medium">{t('table.select_security')}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none text-amber-300 hover:text-amber-200 transition-colors">
            <input type="checkbox" checked={isMajorAllSelected} onChange={() => togglePackageGroup(majorPackages)} className="check-control check-control--major cursor-pointer" />
            <span className="font-medium">{t('table.select_major')}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none text-emerald-300 hover:text-emerald-200 transition-colors">
            <input type="checkbox" checked={isMinorAllSelected} onChange={() => togglePackageGroup(minorPackages)} className="check-control check-control--outdated cursor-pointer" />
            <span className="font-medium">{t('table.select_minor')}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none text-sky-300 hover:text-sky-200 transition-colors">
            <input type="checkbox" checked={isPatchAllSelected} onChange={() => togglePackageGroup(patchPackages)} className="check-control check-control--patch cursor-pointer" />
            <span className="font-medium">{t('table.select_patch')}</span>
          </label>

          {selectedPackages.length > 0 && (
            <button
              onClick={onClearSelection}
              className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
            >
              {t('table.deselect_all')} ({selectedPackages.length})
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="report-surface bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="package-table w-full text-left border-separate border-spacing-y-1">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900 text-[11px] font-extrabold tracking-wider text-slate-300 uppercase">
                <th className="py-3 px-4 w-10">
                  <span className="sr-only">{t('table.select_page')}</span>
                </th>
                <th className="py-3 px-4">{t('table.col_package')}</th>
                <th className="py-3 px-4">{t('table.col_current')}</th>
                <th className="py-3 px-4">{t('table.col_latest')}</th>
                <th className="py-3 px-4">{t('table.col_status')}</th>
                <th className="hidden py-3 px-4 text-right">{t('table.col_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 text-xs">
              {paginatedPackages.length > 0 ? (
                <>
                {paginatedPackages.map((pkg) => {
                  const isSelected = selectedNames.has(pkg.name);
                  const isExpanded = expandedPackage === pkg.name;
                  const config = CATEGORY_CONFIGS[pkg.category];
                  const isUpdateable = pkg.category !== 'up_to_date';

                  return (
                    <React.Fragment key={pkg.name}>
                      <tr
                        onClick={() => onOpenDetailsModal(pkg)}
                        className={`group text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#083c35] hover:bg-[#0b4a41] outline outline-1 outline-[#1d927f] outline-offset-[-1px]'
                            : pkg.category === 'critical'
                            ? 'bg-red-950/20 hover:bg-red-950/40'
                            : 'hover:bg-slate-750/70'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isUpdateable}
                            onChange={() => {
                              if (isUpdateable) onToggleSelect(pkg);
                            }}
                            className={`check-control check-control--all ${isUpdateable ? 'cursor-pointer' : 'cursor-not-allowed opacity-35'}`}
                            aria-label={isUpdateable ? `${t('table.select_page')} ${pkg.name}` : `${pkg.name} is already up to date`}
                          />
                        </td>

                        {/* Package Name & Type */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {/* Avatar initial */}
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs uppercase font-mono border ${getAvatarColor(
                                pkg.name
                              )}`}
                            >
                              {pkg.name.charAt(0)}
                            </div>

                            <div>
                              <div className="font-mono font-bold text-xs text-white group-hover:text-blue-300 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                                <span>{pkg.name}</span>
                                {pkg.hasBreakingChanges && (
                                  <span className="shrink-0 text-[8px] leading-none font-sans px-1 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 font-black tracking-wide" title="Major version migration risk">
                                    {t('table.breaks_code')}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-sans whitespace-nowrap">
                                {pkg.isDevDependency ? 'DevDependency' : 'Dependency'} • package.json
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Current Version */}
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {pkg.currentVersion}
                        </td>

                        {/* Latest Version */}
                        <td className="py-3 px-4 font-mono">
                          <span
                            className={
                                pkg.category === 'up_to_date'
                                ? 'text-emerald-400 font-semibold'
                                : pkg.category === 'critical'
                                ? 'text-red-400 font-bold'
                                : pkg.category === 'major'
                                ? 'text-blue-400 font-bold'
                                : 'text-cyan-400 font-semibold'
                            }
                          >
                            {pkg.latestVersion}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex h-6 w-28 items-center justify-center gap-1 px-1 rounded text-[10px] leading-none font-semibold whitespace-nowrap ${config.badgeClass}`}
                          >
                            {pkg.category === 'critical' && <ShieldAlert className="w-3 h-3 text-red-400" />}
                            {pkg.category === 'security' && <ShieldAlert className="w-3 h-3 text-orange-400" />}
                            {pkg.category === 'deprecated' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                            {pkg.category === 'major' && <ArrowUpRight className="w-3 h-3 text-blue-400" />}
                            {pkg.category === 'minor' && <Zap className="w-3 h-3 text-sky-400" />}
                            {pkg.category === 'patch' && <Wrench className="w-3 h-3 text-slate-400" />}
                            {pkg.category === 'up_to_date' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                            <span>
                              {pkg.category === 'critical'
                                ? (pkg.advisories.some((advisory) => advisory.severity === 'CRITICAL') ? t('category.critical') : t('category.high_risk'))
                                : t(`category.${pkg.category}`)}
                            </span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="hidden py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleCopyCmd(pkg.name)}
                              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Copy Bun update command"
                            >
                              {copiedId === pkg.name ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={() => setExpandedPackage(isExpanded ? null : pkg.name)}
                              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Drawer Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/70 border-b border-slate-800/80">
                          <td colSpan={6} className="p-4 space-y-3">
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
                                  <p className="text-slate-300 mt-0.5 font-mono text-[11px] leading-relaxed">
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
                                          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold">
                                            {adv.severity}
                                          </span>
                                        </div>
                                        {adv.fixedIn && (
                                          <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                                            {t('inspector.fixed_in')} {adv.fixedIn}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-slate-300">{adv.title}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action links */}
                            <div className="flex items-center justify-between pt-1 text-xs">
                              <button
                                onClick={() => onOpenDetailsModal(pkg)}
                                className="text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
                              >
                                View Full Vulnerability & Package Details →
                              </button>

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
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {Array.from({ length: emptyRowCount }).map((_, index) => (
                  <tr key={`empty-row-${index}`} aria-hidden="true">
                    <td colSpan={5} className="h-[54px] py-3 px-4">&nbsp;</td>
                  </tr>
                ))}
                </>
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    {t('table.no_match')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredPackages.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              {t('table.showing')}{' '}
              <strong className="text-slate-200">
                {(currentPage - 1) * pageSize + 1}
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
          </div>
        )}
      </div>
    </div>
  );
}
