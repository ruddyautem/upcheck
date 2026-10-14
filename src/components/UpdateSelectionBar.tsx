'use client';

import React, { useState, useMemo } from 'react';
import { PackageAnalysis, PackageManager } from '@/types';
import { Copy, Check, Terminal, X, Sparkles } from 'lucide-react';

interface UpdateSelectionBarProps {
  selectedPackages: PackageAnalysis[];
  packageManager: PackageManager;
  onChangePackageManager: (pm: PackageManager) => void;
  onClearSelection: () => void;
}

export function UpdateSelectionBar({
  selectedPackages,
  packageManager,
  onChangePackageManager,
  onClearSelection,
}: UpdateSelectionBarProps) {
  const [copied, setCopied] = useState(false);

  // Generate the composite terminal command for the selected packages
  const generatedCommand = useMemo(() => {
    if (selectedPackages.length === 0) return '';

    const prodDeps = selectedPackages.filter((p) => !p.isDevDependency);
    const devDeps = selectedPackages.filter((p) => p.isDevDependency);

    const prodNames = prodDeps.map((p) => `${p.name}@latest`).join(' ');
    const devNames = devDeps.map((p) => `${p.name}@latest`).join(' ');

    const cmds: string[] = [];

    switch (packageManager) {
      case 'bun':
        if (prodNames) cmds.push(`bun add ${prodNames}`);
        if (devNames) cmds.push(`bun add -d ${devNames}`);
        break;
      case 'pnpm':
        if (prodNames) cmds.push(`pnpm add ${prodNames}`);
        if (devNames) cmds.push(`pnpm add -D ${devNames}`);
        break;
      case 'npm':
        if (prodNames) cmds.push(`npm i ${prodNames}`);
        if (devNames) cmds.push(`npm i -D ${devNames}`);
        break;
      case 'yarn':
        if (prodNames) cmds.push(`yarn add ${prodNames}`);
        if (devNames) cmds.push(`yarn add -D ${devNames}`);
        break;
    }

    return cmds.join(' && ');
  }, [selectedPackages, packageManager]);

  if (selectedPackages.length === 0) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pms: PackageManager[] = ['bun', 'pnpm', 'npm', 'yarn'];

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-4xl animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-purple-500/40 rounded-2xl p-4 shadow-2xl shadow-purple-950/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Summary & selected chips */}
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
            <Terminal className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white whitespace-nowrap">
                {selectedPackages.length} package{selectedPackages.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={onClearSelection}
                className="text-[10px] text-slate-400 hover:text-red-400 transition-colors underline cursor-pointer"
              >
                Clear all
              </button>
            </div>

            {/* Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs md:max-w-md py-1 no-scrollbar">
              {selectedPackages.map((pkg) => (
                <span
                  key={pkg.name}
                  className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 shrink-0"
                >
                  {pkg.name}
                  <span className="text-purple-400 ml-1">@latest</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Middle: Package Manager selector */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start md:self-auto shrink-0">
          {pms.map((pm) => (
            <button
              key={pm}
              onClick={() => onChangePackageManager(pm)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                packageManager === pm
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {pm}
            </button>
          ))}
        </div>

        {/* Right: Command Preview & Copy Button */}
        <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
          <button
            onClick={handleCopy}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-emerald-200">Copied Command!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy {packageManager} update</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
