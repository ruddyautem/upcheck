'use client';

import React, { useState } from 'react';
import { RepoAnalysisResult } from '@/types';
import { X, Copy, Check, Terminal, Download } from 'lucide-react';
import { useAppSettings } from '@/lib/settingsContext';

interface RemediationModalProps {
  result: RepoAnalysisResult;
  onClose: () => void;
}

export function RemediationModal({ result, onClose }: RemediationModalProps) {
  const { t } = useAppSettings();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scripts' | 'packageJson'>('scripts');

  const { packages } = result;

  // 1. Critical/Security packages
  const vulnerablePackages = packages.filter(
    (p) => p.category === 'critical' || p.category === 'security'
  );

  // 2. Safe packages (minor and patch)
  const safePackages = packages.filter(
    (p) => p.category === 'minor' || p.category === 'patch'
  );

  // 3. Outdated packages
  const allOutdated = packages.filter((p) => p.category !== 'up_to_date');

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Build commands
  const bunVulnCmd = vulnerablePackages.length > 0
    ? `bun add ${vulnerablePackages.map((p) => `${p.name}@latest`).join(' ')}`
    : t('remediation.no_vulns');

  const bunSafeCmd = safePackages.length > 0
    ? `bun add ${safePackages.map((p) => `${p.name}@^${p.latestVersion}`).join(' ')}`
    : t('remediation.all_safe');

  const bunAllCmd = allOutdated.length > 0
    ? `bun add ${allOutdated.filter(p => !p.isDevDependency).map((p) => `${p.name}@latest`).join(' ')}${
        allOutdated.some(p => p.isDevDependency)
          ? ` && bun add -d ${allOutdated.filter(p => p.isDevDependency).map((p) => `${p.name}@latest`).join(' ')}`
          : ''
      }`
    : t('remediation.all_up_to_date');

  // Build upgraded package.json
  const upgradedPackageJson = {
    name: result.repoInfo.repo,
    dependencies: {} as Record<string, string>,
    devDependencies: {} as Record<string, string>,
  };

  packages.forEach((pkg) => {
    const targetVersion = `^${pkg.latestVersion}`;
    if (pkg.isDevDependency) {
      upgradedPackageJson.devDependencies[pkg.name] = targetVersion;
    } else {
      upgradedPackageJson.dependencies[pkg.name] = targetVersion;
    }
  });

  const jsonString = JSON.stringify(upgradedPackageJson, null, 2);

  const downloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upgraded-package.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('remediation.title')}</h3>
              <p className="text-xs text-slate-400">
                {t('remediation.subtitle')} {result.repoInfo.fullName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-800 px-6 pt-3 gap-4 bg-slate-950/30">
          <button
            onClick={() => setActiveTab('scripts')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'scripts'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('remediation.tab_scripts')}
          </button>
          <button
            onClick={() => setActiveTab('packageJson')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'packageJson'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('remediation.tab_json')}
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {activeTab === 'scripts' ? (
            <div className="space-y-4">
              {/* Option 1: Fix Vulnerabilities */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-red-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    <span className="text-xs font-bold text-red-300">
                      {t('remediation.step1_title')} ({vulnerablePackages.length})
                    </span>
                  </div>
                  <button
                    onClick={() => copyText(bunVulnCmd, 'vuln')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-mono transition-colors cursor-pointer"
                  >
                    {copiedKey === 'vuln' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{t('remediation.copy_cmd')}</span>
                  </button>
                </div>
                <pre className="p-3 bg-black/60 rounded-xl text-xs font-mono text-red-200 overflow-x-auto whitespace-pre-wrap">
                  {bunVulnCmd}
                </pre>
              </div>

              {/* Option 2: Safe updates */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-sky-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                    <span className="text-xs font-bold text-sky-300">
                      {t('remediation.step2_title')} ({safePackages.length})
                    </span>
                  </div>
                  <button
                    onClick={() => copyText(bunSafeCmd, 'safe')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-mono transition-colors cursor-pointer"
                  >
                    {copiedKey === 'safe' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{t('remediation.copy_cmd')}</span>
                  </button>
                </div>
                <pre className="p-3 bg-black/60 rounded-xl text-xs font-mono text-sky-200 overflow-x-auto whitespace-pre-wrap">
                  {bunSafeCmd}
                </pre>
              </div>

              {/* Option 3: Full modernization */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span className="text-xs font-bold text-blue-300">
                      {t('remediation.step3_title')}
                    </span>
                  </div>
                  <button
                    onClick={() => copyText(bunAllCmd, 'all')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-mono transition-colors cursor-pointer"
                  >
                    {copiedKey === 'all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{t('remediation.copy_cmd')}</span>
                  </button>
                </div>
                <pre className="p-3 bg-black/60 rounded-xl text-xs font-mono text-blue-200 overflow-x-auto whitespace-pre-wrap">
                  {bunAllCmd}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {t('remediation.latest_note')} (<code className="text-slate-300">^latest</code>)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyText(jsonString, 'json')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
                  >
                    {copiedKey === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{t('remediation.copy_json')}</span>
                  </button>
                  <button
                    onClick={downloadJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t('remediation.download_json')}</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono text-slate-300 max-h-96 overflow-y-auto">
                {jsonString}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
