'use client';

import { useState } from 'react';
import { Check, Copy, Flame, Sparkles, Terminal } from 'lucide-react';
import { PackageAnalysis, PackageManager } from '@/types';
import { buildAiUpdatePrompt, buildUpdateCommand, getUpdatePresetPackages, UpdatePreset } from '@/lib/updateCommands';
import { useAppSettings } from '@/lib/settingsContext';

interface UpdateScriptsPanelProps {
  packages: PackageAnalysis[];
  packageManager: PackageManager;
  onChangePackageManager: (manager: PackageManager) => void;
  onSelectPreset: (preset: UpdatePreset) => void;
}

const presets: { id: UpdatePreset; color: string; ring: string; hover: string; active: string; badge: string }[] = [
  { id: 'security', color: 'border-red-500/40 bg-red-500/15 text-red-300', ring: 'ring-red-400', hover: 'hover:border-red-300/70 hover:ring-red-300 hover:text-red-200', active: 'aria-pressed:border-red-300 aria-pressed:bg-red-500/35 aria-pressed:text-red-100 aria-pressed:ring-red-300', badge: 'border-red-400/70 bg-red-950/60' },
  { id: 'major', color: 'border-amber-500/40 bg-amber-500/15 text-amber-300', ring: 'ring-amber-400', hover: 'hover:border-amber-300/70 hover:ring-amber-300 hover:text-amber-200', active: 'aria-pressed:border-amber-300 aria-pressed:bg-amber-500/35 aria-pressed:text-amber-100 aria-pressed:ring-amber-300', badge: 'border-amber-400/70 bg-amber-950/60' },
  { id: 'safe', color: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300', ring: 'ring-cyan-400', hover: 'hover:border-cyan-300/70 hover:ring-cyan-300 hover:text-cyan-200', active: 'aria-pressed:border-cyan-300 aria-pressed:bg-cyan-500/35 aria-pressed:text-cyan-100 aria-pressed:ring-cyan-300', badge: 'border-cyan-400/70 bg-cyan-950/60' },
  { id: 'all', color: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300', ring: 'ring-emerald-400', hover: 'hover:border-emerald-300/70 hover:ring-emerald-300 hover:text-emerald-200', active: 'aria-pressed:border-emerald-300 aria-pressed:bg-emerald-500/35 aria-pressed:text-emerald-100 aria-pressed:ring-emerald-300', badge: 'border-emerald-400/70 bg-emerald-950/60' },
];

export function UpdateScriptsPanel({ packages, packageManager, onChangePackageManager, onSelectPreset }: UpdateScriptsPanelProps) {
  const { language, t } = useAppSettings();
  const [activePreset, setActivePreset] = useState<UpdatePreset>('all');
  const [force, setForce] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const selected = getUpdatePresetPackages(packages, activePreset);
  const command = buildUpdateCommand(selected, packageManager, force, activePreset === 'safe' ? 'compatible' : 'latest');
  const aiPrompt = buildAiUpdatePrompt(selected, activePreset, packageManager, force, language);
  const displayedContent = showAiPrompt ? aiPrompt : command;

  const copyCommand = async () => {
    if (!displayedContent) return;
    await navigator.clipboard.writeText(displayedContent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-auto min-h-0 flex flex-col gap-2 border border-slate-800 bg-slate-900/80 p-3 lg:h-full">
      <div className="flex flex-wrap gap-1 border border-slate-800 bg-slate-950/60 p-1 shrink-0" aria-label={t('cart.cli_tool')}>
        {(['bun', 'pnpm', 'npm', 'yarn'] as PackageManager[]).map((manager) => (
          <button
            key={manager}
            type="button"
            onClick={() => { onChangePackageManager(manager); setCopied(false); }}
            aria-pressed={packageManager === manager}
            className={`flex-1 min-w-14 px-2 py-1.5 text-xs font-mono font-semibold transition-colors cursor-pointer ${packageManager === manager ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            {manager}
          </button>
        ))}
      </div>
      <label className={`flex items-center justify-between gap-3 border p-2.5 text-xs cursor-pointer shrink-0 transition-colors ${force ? 'border-amber-500/70 bg-amber-500/15' : 'border-amber-500/30 bg-amber-950/15 hover:border-amber-500/60'}`}>
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-bold text-slate-100"><Flame className="w-4 h-4 text-amber-400" />{t('cart.force_update')}</span>
          <span className="block mt-1 text-[10px] leading-tight text-slate-300">{t('cart.force_desc')}</span>
        </span>
        <input type="checkbox" checked={force} onChange={(event) => { setForce(event.target.checked); setCopied(false); }} className="peer sr-only" />
        <span aria-hidden="true" className={`relative h-5 w-9 shrink-0 rounded-full transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber-400 ${force ? 'bg-amber-500' : 'bg-slate-700'}`}>
          <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${force ? 'translate-x-4' : ''}`} />
        </span>
      </label>

      <div className="min-h-0 flex-1 flex flex-col gap-2 overflow-visible pr-0 lg:overflow-y-auto lg:pr-1">
        <p className="shrink-0 text-[11px] leading-relaxed text-slate-400">{t('scripts.select_plan')}</p>
        <div className="grid shrink-0 grid-cols-1 gap-2 sm:min-h-[248px] sm:flex-1 sm:grid-rows-4" aria-label={t('scripts.title')}>
        {presets.map(({ id, color, ring, hover, active, badge }) => {
          const count = getUpdatePresetPackages(packages, id).length;
          return (
          <button
            key={id}
            type="button"
            onClick={() => { setActivePreset(id); onSelectPreset(id); setCopied(false); }}
            aria-pressed={activePreset === id}
            className={`min-h-[54px] flex items-center justify-between gap-3 border px-3 py-1 text-left font-sans transition-colors cursor-pointer ring-1 ring-inset sm:min-h-[58px] sm:px-4 ${color} ${ring} ${hover} ${active}`}
          >
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold leading-snug">
              {t(`scripts.${id}`)}
              {activePreset === id && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            </span>
            <span className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center border sm:h-12 sm:w-12 ${badge}`}>
              <span className="text-xl font-medium leading-none sm:text-2xl sm:font-semibold">{count}</span>
              <span className="mt-1 text-[7px] font-bold uppercase leading-none tracking-wide text-white sm:text-[8px]">{t(count === 1 ? 'table.package' : 'table.packages')}</span>
            </span>
          </button>
        ); })}
        </div>

        <textarea
          readOnly
          aria-label={showAiPrompt ? t('scripts.ai_prompt') : t(`scripts.${activePreset}`)}
          value={displayedContent || t('scripts.none')}
          className="h-36 shrink-0 resize-none overflow-auto whitespace-pre-wrap break-words border border-slate-800 bg-slate-950 p-3 text-[11px] leading-relaxed font-mono text-slate-200 outline-none selection:bg-emerald-500/40"
        />
      </div>
      <div className="shrink-0 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!command}
          onClick={() => { setShowAiPrompt((showing) => !showing); setCopied(false); }}
          aria-pressed={showAiPrompt}
          className={`flex items-center justify-center gap-2 border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${showAiPrompt ? 'border-violet-300 bg-violet-500/30 text-violet-100' : 'border-violet-500/40 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25'}`}
        >
          {showAiPrompt ? <Terminal className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          {showAiPrompt ? t('scripts.manual_install') : t('scripts.ai_prompt')}
        </button>
        <button
          type="button"
          disabled={!command}
          onClick={copyCommand}
          className="flex items-center justify-center gap-2 border border-emerald-500/40 bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t('cart.copied') : showAiPrompt ? t('scripts.copy_prompt') : t('remediation.copy_cmd')}
        </button>
      </div>
    </div>
  );
}
