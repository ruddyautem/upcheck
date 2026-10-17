'use client';

import { useState } from 'react';
import { Check, Copy, Flame, Sparkles, X } from 'lucide-react';
import { PackageManager, RepoAnalysisResult } from '@/types';
import { buildMultiRepoAiUpdatePrompt, getUpdatePresetPackages, UpdatePreset } from '@/lib/updateCommands';
import { useAppSettings } from '@/lib/settingsContext';

interface MultiRepoPromptModalProps {
  repositories: RepoAnalysisResult[];
  packageManager: PackageManager;
  onChangePackageManager: (manager: PackageManager) => void;
  onClose: () => void;
}

const presets: UpdatePreset[] = ['security', 'major', 'safe', 'all'];

export function MultiRepoPromptModal({ repositories, packageManager, onChangePackageManager, onClose }: MultiRepoPromptModalProps) {
  const { language, t } = useAppSettings();
  const [preset, setPreset] = useState<UpdatePreset>('all');
  const [force, setForce] = useState(false);
  const [copied, setCopied] = useState(false);
  const prompt = buildMultiRepoAiUpdatePrompt(repositories, preset, packageManager, force, language);

  const copyPrompt = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="multi-repo-prompt-title">
      <section className="flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-3xl flex-col border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
          <div>
            <h2 id="multi-repo-prompt-title" className="flex items-center gap-2 text-base font-bold text-white"><Sparkles className="h-4 w-4 text-violet-300" />{t('owner_scan.ai_prompt_all')}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{t('owner_scan.prompt_all_hint')}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button>
        </header>

        <div className="min-h-0 space-y-4 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-1 border border-slate-800 bg-slate-950/60 p-1" aria-label={t('cart.cli_tool')}>
            {(['bun', 'pnpm', 'npm', 'yarn'] as PackageManager[]).map((manager) => <button key={manager} type="button" onClick={() => { onChangePackageManager(manager); setCopied(false); }} aria-pressed={packageManager === manager} className={`flex-1 min-w-16 px-2 py-1.5 text-xs font-mono font-semibold ${packageManager === manager ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{manager}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {presets.map((item) => {
              const count = repositories.reduce((total, repository) => total + getUpdatePresetPackages(repository.packages, item).length, 0);
              const repositoryCount = repositories.filter((repository) => getUpdatePresetPackages(repository.packages, item).length > 0).length;
              return <button key={item} type="button" onClick={() => { setPreset(item); setCopied(false); }} aria-pressed={preset === item} className={`border px-3 py-2 text-left text-xs font-semibold transition-colors ${preset === item ? 'border-violet-300 bg-violet-500/25 text-violet-100' : 'border-slate-700 bg-slate-950/50 text-slate-300 hover:border-violet-400/60'}`}><span className="block leading-snug">{t(`scripts.${item}`)}</span><span className="mt-1 block font-mono text-[10px] text-slate-400">{count} · {repositoryCount} {t('owner_scan.scanned')}</span></button>;
            })}
          </div>
          <label className={`flex cursor-pointer items-center justify-between gap-3 border p-3 text-xs ${force ? 'border-amber-500/70 bg-amber-500/15' : 'border-amber-500/30 bg-amber-950/15'}`}>
            <span className="flex items-center gap-2 font-semibold text-slate-100"><Flame className="h-4 w-4 text-amber-400" />{t('cart.force_update')}</span>
            <input type="checkbox" checked={force} onChange={(event) => { setForce(event.target.checked); setCopied(false); }} className="check-control check-control--major" />
          </label>
          <textarea readOnly value={prompt || t('scripts.none')} aria-label={t('owner_scan.ai_prompt_all')} className="h-72 w-full resize-none border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-200 outline-none" />
        </div>
        <footer className="flex justify-end border-t border-slate-800 p-4">
          <button type="button" disabled={!prompt} onClick={copyPrompt} className="inline-flex items-center gap-2 border border-emerald-500/40 bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? t('cart.copied') : t('scripts.copy_prompt')}
          </button>
        </footer>
      </section>
    </div>
  );
}
