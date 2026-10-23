'use client';

import { Bot, CircleAlert, Clock, FolderGit2, RefreshCw } from 'lucide-react';
import { OwnerAnalysisResult } from '@/types';
import { getUpdatePresetPackages, UpdateOptions } from '@/lib/updateCommands';
import { useAppSettings } from '@/lib/settingsContext';
import { getRepositoryTarget, repositoryTargetKey } from '@/lib/repositoryTarget';

interface OwnerScanSummaryProps {
  analysis: OwnerAnalysisResult;
  updateOptions?: UpdateOptions;
  activeRepository: string;
  isLoading: boolean;
  onSelectRepository: (fullName: string) => void;
  onRescanAll: () => void;
  onOpenAiPrompt: () => void;
}

export function OwnerScanSummary({
  analysis,
  updateOptions = {},
  activeRepository,
  isLoading,
  onSelectRepository,
  onRescanAll,
  onOpenAiPrompt,
}: OwnerScanSummaryProps) {
  const { t, locale } = useAppSettings();
  const formatCheckedAt = (timestamp: string) => {
    const checkedAt = new Date(timestamp);
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(checkedAt);
  };

  return (
    <section className="report-owner-summary rounded-2xl border border-slate-800 bg-slate-900/60 p-3 space-y-2.5 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-300 flex items-center justify-center">
            <FolderGit2 className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">{t('owner_scan.title')} {analysis.owner}</h3>
            <p className="text-xs text-slate-400">{analysis.results.length} {t('owner_scan.scanned')}</p>
          </div>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 self-start sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <button type="button" onClick={onRescanAll} disabled={isLoading} className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap border border-emerald-600 bg-emerald-600 px-2.5 py-1.5 text-[0.6875rem] font-semibold text-white hover:border-emerald-500 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-1">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t('overview.rescan')} {t('owner_scan.all')}
          </button>
          {analysis.results.length > 1 && (
            <button type="button" onClick={onOpenAiPrompt} aria-label={t('owner_scan.ai_prompt_all')} className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap border border-violet-400/50 bg-violet-500/15 px-2.5 py-2 text-[0.625rem] font-semibold text-violet-200 hover:bg-violet-500/25 sm:w-auto sm:py-1 sm:text-[0.6875rem]">
              <Bot className="h-3.5 w-3.5 shrink-0" />
              <span className="sm:hidden">{t('owner_scan.ai_prompt_all_short')}</span>
              <span className="hidden sm:inline">{t('owner_scan.ai_prompt_all')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {analysis.results.map((repository) => {
          const targetKey = repositoryTargetKey(getRepositoryTarget(repository.repoInfo));
          const isActive = targetKey === activeRepository;
          const updates = getUpdatePresetPackages(repository.packages, 'all', updateOptions).length;
          const checkedAt = formatCheckedAt(repository.analyzedAt);
          return (
            <button
              key={targetKey}
              type="button"
              onClick={() => onSelectRepository(targetKey)}
              className={`min-w-0 p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                isActive
                  ? 'border-emerald-500/70 bg-emerald-500/10'
                  : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-950'
              }`}
              aria-pressed={isActive}
            >
              <div className="truncate font-mono text-xs font-bold text-slate-100" title={repository.repoInfo.repo}>{repository.repoInfo.repo}</div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[0.625rem]">
                <span className="whitespace-nowrap text-slate-400">{repository.totalPackages} {t('owner_scan.packages')}</span>
                <span className={`whitespace-nowrap ${updates > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {updates} {t('owner_scan.updates')}
                </span>
              </div>
              <time
                dateTime={repository.analyzedAt}
                className="mt-1.5 flex min-w-0 items-center gap-1 whitespace-nowrap text-[0.625rem] text-slate-500"
                title={checkedAt}
              >
                <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{checkedAt}</span>
              </time>
            </button>
          );
        })}
      </div>

      {analysis.skipped.length > 0 && (
        <details className="text-xs rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5">
          <summary className="cursor-pointer text-slate-300 flex items-center gap-1.5">
            <CircleAlert className="w-3.5 h-3.5 text-amber-400" />
            {analysis.skipped.length} {t('owner_scan.skipped')}
          </summary>
          <ul className="mt-2 space-y-1.5 text-slate-400">
            {analysis.skipped.map((repository) => (
              <li key={repository.fullName}>
                <span className="font-mono text-slate-300">{repository.fullName}</span>: {repository.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
