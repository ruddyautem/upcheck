'use client';

import React, { useState, useMemo } from 'react';
import { PackageAnalysis, PackageManager } from '@/types';
import { CATEGORY_CONFIGS } from '@/lib/categories';
import { 
  X, 
  Copy, 
  Check, 
  Terminal, 
  ShieldAlert, 
  AlertTriangle, 
  Megaphone, 
  ExternalLink, 
  Zap, 
  Plus, 
  Trash2,
  SlidersHorizontal,
  Flame,
  Globe,
  ArrowRight
} from 'lucide-react';
import { GithubIcon } from '@/components/GithubIcon';

interface RightPanelProps {
  selectedPackages: PackageAnalysis[];
  inspectedPackage: PackageAnalysis | null;
  activeTab: 'selected' | 'inspect';
  onSwitchTab: (tab: 'selected' | 'inspect') => void;
  onClose: () => void;
  packageManager: PackageManager;
  onChangePackageManager: (pm: PackageManager) => void;
  onRemoveFromSelection: (pkgName: string) => void;
  onClearSelection: () => void;
  onToggleSelect: (pkg: PackageAnalysis) => void;
  onSelectAllOutdated?: () => void;
}

export function RightPanel({
  selectedPackages,
  inspectedPackage,
  activeTab,
  onSwitchTab,
  onClose,
  packageManager,
  onChangePackageManager,
  onRemoveFromSelection,
  onClearSelection,
  onToggleSelect,
  onSelectAllOutdated,
}: RightPanelProps) {
  const [copied, setCopied] = useState(false);
  const [copiedSingle, setCopiedSingle] = useState(false);
  const [isForceUpdate, setIsForceUpdate] = useState(false);

  // Generate command for selected packages
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

  const handleCopySingle = (pkg: PackageAnalysis) => {
    const devFlag = pkg.isDevDependency ? ' -d' : '';
    const forceFlag = isForceUpdate ? ' --force' : '';
    let cmd = `bun add${devFlag}${forceFlag} ${pkg.name}@latest`;
    if (packageManager === 'npm') {
      cmd = `npm i${pkg.isDevDependency ? ' -D' : ''}${forceFlag} ${pkg.name}@latest`;
    } else if (packageManager === 'pnpm') {
      cmd = `pnpm add${pkg.isDevDependency ? ' -D' : ''}${forceFlag} ${pkg.name}@latest`;
    } else if (packageManager === 'yarn') {
      cmd = `yarn add${pkg.isDevDependency ? ' -D' : ''}${forceFlag} ${pkg.name}@latest`;
    }

    navigator.clipboard.writeText(cmd);
    setCopiedSingle(true);
    setTimeout(() => setCopiedSingle(false), 2000);
  };

  const pms: PackageManager[] = ['bun', 'pnpm', 'npm', 'yarn'];
  const isInspectedSelected = inspectedPackage
    ? selectedPackages.some((p) => p.name === inspectedPackage.name)
    : false;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-[440px] lg:w-[480px] bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 select-none">
      {/* Top Header & Tab Navigation */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onSwitchTab('selected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'selected'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Update Selection</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'selected' ? 'bg-purple-700 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {selectedPackages.length}
            </span>
          </button>

          {inspectedPackage && (
            <button
              onClick={() => onSwitchTab('inspect')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'inspect'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px]">{inspectedPackage.name}</span>
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close side panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* VIEW 1: SELECTED PACKAGES CART */}
        {activeTab === 'selected' && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Packages to Update</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                    {selectedPackages.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pick packages and copy the collective update command.
                </p>
              </div>

              {selectedPackages.length > 0 && (
                <button
                  onClick={onClearSelection}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* List of Selected Packages */}
            {selectedPackages.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {selectedPackages.map((pkg) => {
                  const config = CATEGORY_CONFIGS[pkg.category];
                  return (
                    <div
                      key={pkg.name}
                      className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white truncate">
                          {pkg.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {pkg.currentVersion} → <span className="text-purple-400">{pkg.latestVersion}</span>
                        </span>
                        {pkg.hasBreakingChanges && (
                          <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold shrink-0">
                            Breaks
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => onRemoveFromSelection(pkg.name)}
                        className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                        title="Remove from update selection"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                <Terminal className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-300">No packages selected yet</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Click the checkboxes next to any package in the table to queue them for update.
                  </p>
                </div>
                {onSelectAllOutdated && (
                  <button
                    onClick={onSelectAllOutdated}
                    className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Select All Outdated Packages
                  </button>
                )}
              </div>
            )}

            {/* Package Manager Options & Force Update Toggle */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Package Manager</span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
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
              </div>

              {/* Force Update Option Button */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Flame className={`w-3.5 h-3.5 ${isForceUpdate ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span>Force Update Flag</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Bypasses lockfile conflicts and cache (adds <code className="text-purple-300">--force</code>).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsForceUpdate(!isForceUpdate)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isForceUpdate ? 'bg-amber-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      isForceUpdate ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Terminal Command Output & Copy */}
            {selectedPackages.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Terminal Command</span>
                  {isForceUpdate && (
                    <span className="text-[10px] text-amber-400 font-mono font-semibold">
                      [--force enabled]
                    </span>
                  )}
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 break-all select-all leading-relaxed max-h-36 overflow-y-auto">
                  {generatedCommand}
                </div>

                <button
                  onClick={handleCopy}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Copied {packageManager} command!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy {packageManager} update {isForceUpdate ? '(--force)' : ''}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: INSPECT PACKAGE DETAILS */}
        {activeTab === 'inspect' && inspectedPackage && (
          <div className="space-y-6">
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-xl font-bold font-mono text-white">
                  {inspectedPackage.name}
                </h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  CATEGORY_CONFIGS[inspectedPackage.category].badgeClass
                }`}>
                  {CATEGORY_CONFIGS[inspectedPackage.category].label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Declared as <code className="text-slate-200 font-mono">{inspectedPackage.currentSpec}</code>
              </p>
            </div>

            {/* Version Diff Card */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Current</span>
                <div className="text-lg font-mono font-bold text-slate-200">
                  {inspectedPackage.currentVersion}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Latest</span>
                <div className="text-lg font-mono font-bold text-cyan-400">
                  {inspectedPackage.latestVersion}
                </div>
              </div>
            </div>

            {/* Definitive Breaking Warning Banner */}
            {inspectedPackage.breakingWarning && (
              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/50 space-y-2">
                <div className="flex items-center gap-2 font-bold text-purple-300 text-xs">
                  <AlertTriangle className="w-4 h-4 text-purple-400" />
                  <span>Breaking Changes Alert</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {inspectedPackage.breakingWarning}
                </p>
              </div>
            )}

            {/* Maintainer Deprecation Notice */}
            {inspectedPackage.deprecatedReason && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                  <Megaphone className="w-4 h-4 text-amber-400" />
                  <span>Maintainer Announcement</span>
                </div>
                <p className="text-xs text-slate-200 font-mono bg-slate-950/80 p-2.5 rounded-lg border border-amber-900/50 leading-relaxed">
                  {inspectedPackage.deprecatedReason}
                </p>
              </div>
            )}

            {/* Security Advisories List */}
            {inspectedPackage.advisories.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-red-400 text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Security Advisories ({inspectedPackage.advisories.length})</span>
                </div>

                <div className="space-y-2.5">
                  {inspectedPackage.advisories.map((adv) => (
                    <div key={adv.id} className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-red-400">{adv.id}</span>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          adv.severity === 'CRITICAL' ? 'bg-red-500/30 text-red-300' :
                          adv.severity === 'HIGH' ? 'bg-orange-500/30 text-orange-300' :
                          'bg-amber-500/30 text-amber-300'
                        }`}>
                          {adv.severity}
                        </span>
                      </div>
                      <p className="text-slate-200">{adv.title}</p>
                      {adv.fixedIn && (
                        <div className="text-[11px] font-mono text-emerald-400">
                          Fixed in: ≥ {adv.fixedIn}
                        </div>
                      )}
                      <a
                        href={adv.advisoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 text-[11px] inline-flex items-center gap-1 pt-1"
                      >
                        <span>Official Advisory</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons: Add to selection & Copy command */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => onToggleSelect(inspectedPackage)}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isInspectedSelected
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-500/25'
                }`}
              >
                {isInspectedSelected ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>Remove from Update Selection</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add to Update Selection</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleCopySingle(inspectedPackage)}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copiedSingle ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied single command!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy install command</span>
                  </>
                )}
              </button>
            </div>

            {/* Links */}
            <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
              <a
                href={inspectedPackage.npmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white flex items-center gap-1"
              >
                <span>NPM</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              {inspectedPackage.repositoryUrl && (
                <a
                  href={inspectedPackage.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white flex items-center gap-1"
                >
                  <GithubIcon className="w-3 h-3" />
                  <span>Repo</span>
                </a>
              )}
              {inspectedPackage.homepage && (
                <a
                  href={inspectedPackage.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white flex items-center gap-1"
                >
                  <Globe className="w-3 h-3" />
                  <span>Site</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
