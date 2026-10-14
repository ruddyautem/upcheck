'use client';

import { useState } from 'react';
import { 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  ShieldAlert, 
  ArrowRight 
} from 'lucide-react';
import { PackageAnalysis } from '@/types';
import { useAppSettings } from '@/lib/settingsContext';
import { getMigrationUrl } from '@/lib/i18nFormatters';

interface ReportAlertsProps {
  packages: PackageAnalysis[];
  onInspect: (pkg: PackageAnalysis) => void;
}

export function ReportAlerts({ packages, onInspect }: ReportAlertsProps) {
  const { t } = useAppSettings();
  const [expandedCriticalPackage, setExpandedCriticalPackage] = useState<string | null>(null);
  const critical = packages.filter((pkg) => pkg.category === 'critical');
  const breaking = packages.filter((pkg) => pkg.hasBreakingChanges);

  if (critical.length === 0 && breaking.length === 0) return null;

  return (
    <section 
      aria-label={t('alerts.priority')} 
      className={`grid grid-cols-1 gap-4 ${critical.length && breaking.length ? 'xl:grid-cols-2' : ''}`}
    >
      {/* CRITICAL & HIGH SECURITY RISKS */}
      {critical.length > 0 && (
        <div className="priority-alert priority-alert--critical">
          <div className="priority-alert-header">
            <span className="priority-alert-icon">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <p className="priority-alert-kicker">{t('alerts.immediate')}</p>
              <h3>
                {t('alerts.critical_title')} <span>{critical.length}</span>
              </h3>
            </div>
          </div>
          <p className="priority-alert-description">{t('alerts.critical_desc')}</p>

          <div className="priority-alert-list">
            {critical.slice(0, 3).map((pkg) => {
              const isExpanded = expandedCriticalPackage === pkg.name;
              const primaryAdvisory = pkg.advisories[0];
              const isCritical = pkg.advisories.some((a) => a.severity === 'CRITICAL');

              return (
                <div key={pkg.name} className="priority-alert-item space-y-2">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setExpandedCriticalPackage(isExpanded ? null : pkg.name);
                      onInspect(pkg);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedCriticalPackage(isExpanded ? null : pkg.name);
                        onInspect(pkg);
                      }
                    }}
                    aria-expanded={isExpanded}
                    aria-controls={`priority-advisories-${pkg.name}`}
                    className="priority-alert-card priority-alert-card--critical"
                  >
                    {/* Header Row: ID / Name + Severity Badge (Screenshot 2) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-mono font-bold text-xs sm:text-sm text-red-400">
                          {primaryAdvisory?.id || pkg.name}
                        </span>
                        <span className="font-mono text-[10px] text-red-300 bg-red-950/70 border border-red-800/60 px-1.5 py-0.5 rounded">
                          {pkg.name}@{pkg.currentVersion}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase border shrink-0 ${
                          isCritical
                            ? 'bg-[#3b1218] text-red-300 border-red-600/50'
                            : 'bg-[#381c13] text-amber-300 border-amber-600/50'
                        }`}
                      >
                        {isCritical ? 'CRITICAL' : 'HIGH'}
                      </span>
                    </div>

                    {/* Description Row (Screenshot 2) */}
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mt-2">
                      {primaryAdvisory?.title || t('alerts.review_advisory')}
                    </p>

                    {/* Fixed In Row (Screenshot 2) */}
                    <div className="text-emerald-400 font-mono text-xs font-semibold flex items-center gap-1.5 mt-2">
                      <span>
                        {t('alerts.fixed_in')}{' '}
                        {primaryAdvisory?.fixedIn || pkg.latestVersion}
                      </span>
                    </div>

                    {/* Footer / Links Row (Screenshot 2) */}
                    <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-red-500/20">
                      {primaryAdvisory?.advisoryUrl ? (
                        <a
                          href={primaryAdvisory.advisoryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 hover:underline"
                        >
                          <span>{t('alerts.advisory_ref')}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-cyan-400 font-medium inline-flex items-center gap-1">
                          <span>{t('alerts.advisory_ref')}</span>
                          <ChevronRight className="h-3 w-3" />
                        </span>
                      )}

                      {pkg.advisories.length > 1 && (
                        <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                          <span>{isExpanded ? t('alerts.hide_osv_details') : `+${pkg.advisories.length - 1} ${t('alerts.view_all_advisories')}`}</span>
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Multi-advisory expanded list matching Screenshot 2 */}
                  {isExpanded && pkg.advisories.length > 1 && (
                    <div id={`priority-advisories-${pkg.name}`} className="priority-advisories">
                      {pkg.advisories.slice(1).map((advisory) => (
                        <article
                          key={advisory.id}
                          className="priority-alert-card priority-alert-card--critical"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-xs text-red-400">
                              {advisory.id}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase border shrink-0 ${
                                advisory.severity === 'CRITICAL'
                                  ? 'bg-[#3b1218] text-red-300 border-red-600/50'
                                  : 'bg-[#381c13] text-amber-300 border-amber-600/50'
                              }`}
                            >
                              {advisory.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mt-1.5">
                            {advisory.title}
                          </p>
                          <div className="text-emerald-400 font-mono text-xs font-semibold flex items-center gap-1.5 mt-1.5">
                            {advisory.fixedIn && (
                              <span>{t('alerts.fixed_in')} {advisory.fixedIn}</span>
                            )}
                          </div>
                          <div className="pt-1.5 mt-1.5 border-t border-red-500/20">
                            <a
                              href={advisory.advisoryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 hover:underline"
                            >
                              <span>{t('alerts.advisory_ref')}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {critical.length > 3 && (
            <p className="priority-alert-more">
              +{critical.length - 3} {t('alerts.more')}
            </p>
          )}
        </div>
      )}

      {/* MAJOR VERSION CHANGES (MIGRATION REVIEW - SAME STYLE AS SCREENSHOT 2) */}
      {breaking.length > 0 && (
        <div className="priority-alert priority-alert--breaking">
          <div className="priority-alert-header">
            <span className="priority-alert-icon">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="priority-alert-kicker">{t('alerts.migration')}</p>
              <h3>
                {t('alerts.breaking_title')} <span>{breaking.length}</span>
              </h3>
            </div>
          </div>
          <p className="priority-alert-description">{t('alerts.breaking_desc')}</p>

          <div className="priority-alert-list">
            {breaking.slice(0, 3).map((pkg) => (
              <div key={pkg.name} className="priority-alert-item">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onInspect(pkg)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onInspect(pkg);
                    }
                  }}
                  className="priority-alert-card priority-alert-card--breaking group"
                >
                  {/* Header Row: Package Name + Major Badge (Screenshot 2 pattern) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-mono font-bold text-xs sm:text-sm text-amber-400">
                        {pkg.name}
                      </span>
                      <span className="font-mono text-[10px] text-amber-300 bg-amber-950/70 border border-amber-800/60 px-1.5 py-0.5 rounded">
                        v{pkg.currentVersion} → v{pkg.latestVersion}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase border border-amber-600/50 bg-[#382410] text-amber-300 shrink-0">
                      MAJOR
                    </span>
                  </div>

                  {/* Description Row (Screenshot 2 pattern) */}
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mt-2">
                    {pkg.breakingWarning || t('alerts.breaking_item')}
                  </p>

                  {/* Target Version Row (Screenshot 2 pattern) */}
                  <div className="text-emerald-400 font-mono text-xs font-semibold flex items-center gap-1.5 mt-2">
                    <span>{t('alerts.target_ver')} {pkg.latestVersion}</span>
                  </div>

                  {/* Footer / Links Row (Matching Screenshot) */}
                  <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-amber-500/20">
                    <a
                      href={getMigrationUrl(pkg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>{t('alerts.migration_ref')}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <span className="text-[10px] font-mono text-amber-300/80">
                      +{pkg.updateDiff.majorDiff} {pkg.updateDiff.majorDiff > 1 ? t('alerts.majors') : t('alerts.major')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {breaking.length > 3 && (
            <p className="priority-alert-more">
              +{breaking.length - 3} {t('alerts.more')}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
