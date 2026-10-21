'use client';

import { useState } from 'react';
import { ArrowUp, Bot, ChevronsUp, Flame, Layers, ShieldCheck, Terminal } from 'lucide-react';
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

  const copyContent = async (content: string, isAiPrompt = false, preset = activePreset) => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      const tone = isAiPrompt ? 'violet' : { security: 'red', major: 'amber', safe: 'cyan', all: 'teal' }[preset];
      const Icon = isAiPrompt ? Bot : { security: ShieldCheck, major: ChevronsUp, safe: ArrowUp, all: Layers }[preset];
      toast.success(t('scripts.command_copied'), {
        className: `upcheck-toast--${tone}`,
        icon: <Icon className="h-4 w-4" aria-hidden="true" />,
      });
    } catch {
      toast.error(t('scripts.copy_failed'));
    }
  };

  const selectPreset = (preset: UpdatePreset) => {
    setActivePreset(preset);
    setShowAiPrompt(false);
    onSelectPreset(preset);
    const nextCommand = buildUpdateCommand(
      getUpdatePresetPackages(packages, preset),
      packageManager,
      force,
      preset === 'safe' ? 'compatible' : 'latest',
    );
    if (!nextCommand) {
      toast.info(t('scripts.none'));
      return;
    }
    void copyContent(nextCommand, false, preset);
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
                className={`grid h-full min-w-12 place-items-center px-2 text-center text-[0.625rem] leading-none font-mono font-semibold transition-colors cursor-pointer ${packageManager === manager ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
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
                onClick={() => selectPreset(id)}
                aria-pressed={activePreset === id}
                title={t(`scripts.${id}`)}
                className={`flex h-8 min-w-0 items-center justify-between gap-1 border px-2 text-left font-sans text-[0.6875rem] font-semibold transition-colors cursor-pointer ring-1 ring-inset ${color} ${ring} ${hover} ${active}`}
              >
                <span className="flex h-4 items-center whitespace-nowrap leading-none">{t(`scripts.${id}_short`)}</span>
                <span className={`grid h-4 min-w-4 shrink-0 place-items-center border px-0.5 text-[0.5625rem] leading-none ${badge}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

    </section>

      <aside className="order-3 h-72 min-h-0 flex flex-col sm:h-80 xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:order-none xl:h-auto xl:self-stretch" aria-label={showAiPrompt ? t('scripts.ai_prompt') : t(`scripts.${activePreset}`)}>
        <div className="min-h-0 flex flex-1 flex-col border border-slate-700 bg-slate-950 xl:h-full">
          <div className="flex min-h-[calc(3.25rem-1px)] shrink-0 flex-wrap items-center gap-2 border-b border-slate-700 bg-slate-900/80 px-2.5 py-2">
            <button
              type="button"
              onClick={() => setForce((enabled) => !enabled)}
              aria-pressed={force}
              className={`flex h-8 shrink-0 items-center gap-1.5 font-sans text-xs font-semibold leading-none cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-amber-300 ${force ? 'text-amber-100' : 'text-slate-200 hover:text-amber-200'}`}
              aria-label={t('cart.force_update')}
              title={t('cart.force_desc')}
            >
              <Flame className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span className="flex h-4 items-center whitespace-nowrap leading-none">{t('scripts.force_short')}</span>
              <span aria-hidden="true" className={`relative h-5 w-8 shrink-0 transition-colors ${force ? 'bg-amber-500' : 'bg-slate-700'}`}>
                <span className={`absolute left-0.5 top-0.5 h-4 w-4 bg-white transition-transform ${force ? 'translate-x-3' : ''}`} />
              </span>
            </button>
            <div className="ml-auto flex h-8 shrink-0 gap-1">
            <button
              type="button"
              disabled={!command}
              onClick={() => {
                setShowAiPrompt(true);
                void copyContent(aiPrompt, true);
              }}
              aria-pressed={showAiPrompt}
              aria-label={t('scripts.copy_prompt')}
              title={t('scripts.copy_prompt')}
              className="flex h-8 w-22 shrink-0 items-center justify-center gap-1.5 border border-violet-400/50 bg-violet-500/15 px-2 font-sans text-[0.6875rem] font-semibold text-violet-200 ring-1 ring-inset ring-violet-400/70 transition-colors cursor-pointer hover:bg-violet-500/25 aria-pressed:bg-violet-500/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Bot className="h-4 w-4" aria-hidden="true" />
              <span>{t('scripts.ai_short')}</span>
            </button>
            <button
              type="button"
              disabled={!command}
              onClick={() => {
                setShowAiPrompt(false);
                void copyContent(command);
              }}
              aria-pressed={!showAiPrompt}
              aria-label={t('remediation.copy_cmd')}
              title={t('remediation.copy_cmd')}
              className="flex h-8 w-22 shrink-0 items-center justify-center gap-1.5 border border-emerald-500/40 bg-emerald-500/15 px-2 font-sans text-[0.6875rem] font-semibold text-emerald-300 transition-colors cursor-pointer ring-1 ring-inset ring-emerald-400 hover:border-emerald-300/70 hover:ring-emerald-300 hover:text-emerald-200 aria-pressed:border-emerald-300 aria-pressed:bg-emerald-500/35 aria-pressed:text-emerald-100 aria-pressed:ring-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Terminal className="h-4 w-4" aria-hidden="true" />
              <span>{t('scripts.manual_short')}</span>
            </button>
            </div>
          </div>
          <textarea
            readOnly
            aria-label={showAiPrompt ? t('scripts.ai_prompt') : t(`scripts.${activePreset}`)}
            value={displayedContent || t('scripts.none')}
            className="min-h-0 flex-1 w-full resize-none overflow-auto whitespace-pre-wrap break-words bg-transparent p-3 text-[0.6875rem] leading-relaxed font-mono text-slate-100 outline-none selection:bg-emerald-500/40"
          />
        </div>
      </aside>
    </>
  );
}
