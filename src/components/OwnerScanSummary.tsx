'use client';

import { Bot, CheckCircle2, CircleAlert, FolderGit2 } from 'lucide-react';
import { OwnerAnalysisResult } from '@/types';
import { useAppSettings } from '@/lib/settingsContext';

interface OwnerScanSummaryProps {
  analysis: OwnerAnalysisResult;
  activeRepository: string;
  onSelectRepository: (fullName: string) => void;
  onOpenAiPrompt: () => void;
}

export function OwnerScanSummary({
  analysis,
  activeRepository,
  onSelectRepository,
  onOpenAiPrompt,
}: OwnerScanSummaryProps) {
  const { t } = useAppSettings();

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 space-y-2.5 sm:p-4">
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
        <div className="flex flex-wrap items-center gap-2 self-start">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('owner_scan.choose_repo')}
          </span>
          {analysis.results.length > 1 && (
            <button type="button" onClick={onOpenAiPrompt} className="inline-flex items-center gap-1.5 border border-violet-400/50 bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/25">
              <Bot className="h-3.5 w-3.5" />
              {t('owner_scan.ai_prompt_all')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {analysis.results.map((repository) => {
          const isActive = repository.repoInfo.fullName === activeRepository;
          const updates = repository.packages.filter((pkg) => pkg.category !== 'up_to_date' && !pkg.isUpdateDeferred).length;
          return (
            <button
              key={repository.repoInfo.fullName}
              type="button"
              onClick={() => onSelectRepository(repository.repoInfo.fullName)}
              className={`min-w-0 p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                isActive
                  ? 'border-blue-500/70 bg-blue-500/10'
                  : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-950'
              }`}
              aria-pressed={isActive}
            >
              <div className="font-mono text-xs font-bold text-slate-100 [overflow-wrap:anywhere]">{repository.repoInfo.repo}</div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
                <span className="text-slate-400">{repository.totalPackages} {t('owner_scan.packages')}</span>
                <span className={updates > 0 ? 'text-amber-300' : 'text-emerald-300'}>
                  {updates} {t('owner_scan.updates')}
                </span>
              </div>
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
