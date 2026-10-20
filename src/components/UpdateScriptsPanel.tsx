'use client';

import { useState } from 'react';
import { Bot, Copy, Flame, Terminal } from 'lucide-react';
import { toast } from 'sonner';
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
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const selected = getUpdatePresetPackages(packages, activePreset);
  const command = buildUpdateCommand(selected, packageManager, force, activePreset === 'safe' ? 'compatible' : 'latest');
  const aiPrompt = buildAiUpdatePrompt(selected, activePreset, packageManager, force, language);
  const displayedContent = showAiPrompt ? aiPrompt : command;

  const copyCommand = async () => {
    if (!displayedContent) return;
    try {
      await navigator.clipboard.writeText(displayedContent);
      toast.success(t('cart.copied'), { className: showAiPrompt ? 'upcheck-toast--violet' : 'upcheck-toast--teal' });
    } catch {
      toast.error(t('error.analysis_title'));
    }
  };

  return (
    <>
    <section className="self-start border border-slate-800 bg-slate-900/80 p-2.5 xl:col-start-1 xl:h-[3.25rem]" aria-label={t('scripts.title')}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
          <div className="grid h-8 w-full grid-cols-4 border border-slate-800 bg-slate-950/60 p-0.5 sm:w-auto" aria-label={t('cart.cli_tool')}>
            {(['bun', 'pnpm', 'npm', 'yarn'] as PackageManager[]).map((manager) => (
              <button
                key={manager}
                type="button"
                onClick={() => onChangePackageManager(manager)}
                aria-pressed={packageManager === manager}
                className={`grid h-full min-w-12 place-items-center px-2 text-center text-[10px] leading-none font-mono font-semibold transition-colors cursor-pointer ${packageManager === manager ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                {manager}
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1 sm:min-w-[18rem] sm:grid-cols-4" aria-label={t('scripts.select_plan')}>
          {presets.map(({ id, color, ring, hover, active, badge }) => {
            const count = getUpdatePresetPackages(packages, id).length;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setActivePreset(id); onSelectPreset(id); }}
                aria-pressed={activePreset === id}
                title={t(`scripts.${id}`)}
                className={`flex h-8 min-w-0 items-center justify-between gap-1 border px-2 text-left font-sans text-[11px] font-semibold transition-colors cursor-pointer ring-1 ring-inset ${color} ${ring} ${hover} ${active}`}
              >
                <span className="flex h-4 items-center whitespace-nowrap leading-none">{t(`scripts.${id}_short`)}</span>
                <span className={`grid h-4 min-w-4 shrink-0 place-items-center border px-0.5 text-[9px] leading-none ${badge}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

    </section>

      <aside className="order-3 h-72 min-h-0 flex flex-col sm:h-80 xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:order-none xl:h-auto xl:self-stretch" aria-label={showAiPrompt ? t('scripts.ai_prompt') : t(`scripts.${activePreset}`)}>
        <div className="min-h-0 flex flex-1 flex-col border border-slate-700 bg-slate-950 xl:h-full">
          <div className="flex h-8 shrink-0 items-center bg-slate-900/60">
            <button
              type="button"
              onClick={() => setForce((enabled) => !enabled)}
              aria-pressed={force}
              className={`flex h-full items-center gap-1.5 px-2 text-[10px] font-semibold leading-none cursor-pointer transition-colors ${force ? 'bg-amber-500/15 text-amber-100' : 'text-slate-300 hover:bg-amber-500/10'}`}
              title={t('cart.force_desc')}
            >
              <Flame className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
              <span className="relative top-px flex h-4 items-center whitespace-nowrap leading-none">{t('cart.force_update')}</span>
              <span aria-hidden="true" className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${force ? 'bg-amber-500' : 'bg-slate-700'}`}>
                <span className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${force ? 'translate-x-3' : ''}`} />
              </span>
            </button>
            <button
              type="button"
              disabled={!command}
              onClick={() => setShowAiPrompt((showing) => !showing)}
              aria-pressed={showAiPrompt}
              aria-label={showAiPrompt ? t('scripts.manual_install') : t('scripts.ai_prompt')}
              title={showAiPrompt ? t('scripts.manual_install') : t('scripts.ai_prompt')}
              className={`ml-auto grid h-full w-9 place-items-center bg-violet-500/25 text-violet-100 transition-colors hover:bg-violet-500/35 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer ${showAiPrompt ? 'ring-1 ring-inset ring-violet-300/60' : ''}`}
            >
              {showAiPrompt ? <Terminal className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </button>
            <button
              type="button"
              disabled={!command}
              onClick={copyCommand}
              aria-label={showAiPrompt ? t('scripts.copy_prompt') : t('remediation.copy_cmd')}
              title={showAiPrompt ? t('scripts.copy_prompt') : t('remediation.copy_cmd')}
              className="grid h-full w-9 place-items-center bg-emerald-500/20 text-emerald-100 transition-colors hover:bg-emerald-400/70 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <textarea
            readOnly
            aria-label={showAiPrompt ? t('scripts.ai_prompt') : t(`scripts.${activePreset}`)}
            value={displayedContent || t('scripts.none')}
            className="min-h-0 flex-1 w-full resize-none overflow-auto whitespace-pre-wrap break-words bg-transparent p-3 text-[11px] leading-relaxed font-mono text-slate-100 outline-none selection:bg-emerald-500/40"
          />
        </div>
      </aside>
    </>
  );
}
