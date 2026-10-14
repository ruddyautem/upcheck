'use client';

import React, { useState, useMemo } from 'react';
import { PackageAnalysis, PackageManager } from '@/types';
import { useAppSettings } from '@/lib/settingsContext';
import { CATEGORY_CONFIGS } from '@/lib/categories';
import { Terminal, Copy, Check, X, Flame, Trash2 } from 'lucide-react';

interface UpdateSelectionCartPanelProps {
  selectedPackages: PackageAnalysis[];
  packageManager: PackageManager;
  onChangePackageManager: (pm: PackageManager) => void;
  onRemovePackage: (pkgName: string) => void;
  onClearSelection: () => void;
  onSelectAllOutdated?: () => void;
  onInspect: (pkg: PackageAnalysis) => void;
}

export function UpdateSelectionCartPanel({
  selectedPackages,
  packageManager,
  onChangePackageManager,
  onRemovePackage,
  onClearSelection,
  onSelectAllOutdated,
  onInspect,
}: UpdateSelectionCartPanelProps) {
  const { t } = useAppSettings();
  const [copied, setCopied] = useState(false);
  const [isForceUpdate, setIsForceUpdate] = useState(false);

  const generatedCommand = useMemo(() => {
    if (selectedPackages.length === 0) return '';

    const prodDeps = selectedPackages.filter((p) => !p.isDevDependency);
    const devDeps = selectedPackages.filter((p) => p.isDevDependency);

    const prodNames = prodDeps.map((p) => `${p.name}@latest`).join(' ');
    const devNames = devDeps.map((p) => `${p.name}@latest`).join(' ');

    const cmds: string[] = [];
    const forceFlag = isForceUpdate ? ' --force' : '';

    switch (packageManager) {
      case 'bun':
        if (prodNames) cmds.push(`bun add${forceFlag} ${prodNames}`);
        if (devNames) cmds.push(`bun add -d${forceFlag} ${devNames}`);
        break;
      case 'pnpm':
        if (prodNames) cmds.push(`pnpm add${forceFlag} ${prodNames}`);
        if (devNames) cmds.push(`pnpm add -D${forceFlag} ${devNames}`);
        break;
      case 'npm':
        if (prodNames) cmds.push(`npm i${forceFlag} ${prodNames}`);
        if (devNames) cmds.push(`npm i -D${forceFlag} ${devNames}`);
        break;
      case 'yarn':
        if (prodNames) cmds.push(`yarn add${forceFlag} ${prodNames}`);
        if (devNames) cmds.push(`yarn add -D${forceFlag} ${devNames}`);
        break;
    }

    return cmds.join(' && ');
  }, [selectedPackages, packageManager, isForceUpdate]);

  const handleCopy = () => {
    if (!generatedCommand) return;
    navigator.clipboard.writeText(generatedCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pms: PackageManager[] = ['bun', 'pnpm', 'npm', 'yarn'];

  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <h4 className="text-sm font-bold text-white">{t('cart.queue_title')}</h4>
          <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-bold">
            {selectedPackages.length}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {selectedPackages.length > 0 ? (
            <button
              onClick={onClearSelection}
              className="text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>{t('cart.clear')}</span>
            </button>
          ) : (
            onSelectAllOutdated && (
              <button
                onClick={onSelectAllOutdated}
                className="text-blue-400 hover:text-blue-300 transition-colors font-medium cursor-pointer"
              >
                {t('cart.queue_all_outdated')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Selected Items List */}
      {selectedPackages.length > 0 ? (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {selectedPackages.map((pkg) => {
            const category = CATEGORY_CONFIGS[pkg.category];

            return (
            <div
              key={pkg.name}
              role="button"
              tabIndex={0}
              onClick={() => onInspect(pkg)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onInspect(pkg);
                }
              }}
              className={`p-2 rounded-xl border border-l-2 ${category.borderClass} ${category.bgClass} flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors hover:brightness-125`}
              aria-label={`Inspect ${pkg.name}`}
            >
              <div className="min-w-0 flex items-center gap-2">
                <span className="font-mono font-bold text-slate-200 truncate">
                  {pkg.name}
                </span>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {pkg.currentVersion} → <span className={`${category.textClass} font-semibold`}>{pkg.latestVersion}</span>
                </span>
                {pkg.hasBreakingChanges && (
                  <span className={`text-[9px] px-1 rounded font-semibold shrink-0 ${category.badgeClass}`}>
                    {t('table.breaks_code')}
                  </span>
                )}
              </div>

              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onRemovePackage(pkg.name);
                }}
                className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                title={t('cart.remove_pkg')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 text-center text-xs text-slate-400">
          {t('cart.empty_hint')}
        </div>
      )}

      {/* Controls: Package manager & Force Update flag */}
      <div className="pt-2 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-400">{t('cart.cli_tool')}</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {pms.map((pm) => (
              <button
                key={pm}
                onClick={() => onChangePackageManager(pm)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                  packageManager === pm
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {pm}
              </button>
            ))}
          </div>
        </div>

        {/* Force Update Toggle */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Flame className={`w-3.5 h-3.5 ${isForceUpdate ? 'text-amber-400' : 'text-slate-500'}`} />
              <span>{t('cart.force_update')}</span>
            </span>
            <p className="text-[10px] text-slate-400 leading-tight">
              {t('cart.force_desc')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsForceUpdate(!isForceUpdate)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              isForceUpdate ? 'bg-amber-500' : 'bg-slate-800'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                isForceUpdate ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Command Preview & Copy Button */}
      {selectedPackages.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 break-all select-all leading-relaxed max-h-24 overflow-y-auto">
            {generatedCommand}
          </div>

          <button
            onClick={handleCopy}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>{t('cart.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>{t('cart.copy_command')} ({packageManager}{isForceUpdate ? ' --force' : ''})</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
