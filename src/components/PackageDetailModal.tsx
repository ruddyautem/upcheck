'use client';

import React, { useState } from 'react';
import { PackageAnalysis } from '@/types';
import { CATEGORY_CONFIGS } from '@/lib/categories';
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldAlert, 
  Shield, 
  AlertTriangle, 
  Megaphone, 
  Calendar, 
  Globe, 
  Layers,
  ArrowRight,
  Terminal
} from 'lucide-react';
import { GithubIcon } from '@/components/GithubIcon';

interface PackageDetailModalProps {
  pkg: PackageAnalysis | null;
  onClose: () => void;
}

export function PackageDetailModal({ pkg, onClose }: PackageDetailModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!pkg) return null;

  const config = CATEGORY_CONFIGS[pkg.category];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const devFlag = pkg.isDevDependency ? ' -d' : '';
  const npmDevFlag = pkg.isDevDependency ? ' --save-dev' : '';

  const installCommands = [
    { label: 'Bun', cmd: `bun add${devFlag} ${pkg.name}@latest` },
    { label: 'pnpm', cmd: `pnpm add${pkg.isDevDependency ? ' -D' : ''} ${pkg.name}@latest` },
    { label: 'npm', cmd: `npm install${npmDevFlag} ${pkg.name}@latest` },
    { label: 'yarn', cmd: `yarn add${pkg.isDevDependency ? ' -D' : ''} ${pkg.name}@latest` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/50">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold text-white font-mono">{pkg.name}</h3>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.badgeClass}`}>
                <span>{config.label}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Currently declared as <code className="text-slate-200">{pkg.currentSpec}</code>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Version Comparison Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Installed / Detected</span>
              <div className="text-2xl font-bold font-mono text-slate-200">{pkg.currentVersion}</div>
              <span className="text-[11px] text-slate-400">From repository package.json</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Latest Available</span>
              <div className={`text-2xl font-bold font-mono ${
                pkg.category === 'up_to_date' ? 'text-emerald-400' : 'text-cyan-400'
              }`}>
                {pkg.latestVersion}
              </div>
              <span className="text-[11px] text-slate-400">From official NPM registry</span>
            </div>
          </div>

          {/* Maintainer Deprecation Announcement */}
          {pkg.deprecatedReason && (
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Megaphone className="w-4 h-4" />
                <span>Maintainer Deprecation Notice</span>
              </div>
              <p className="text-sm text-slate-200 font-mono bg-slate-950/60 p-3 rounded-xl border border-amber-900/50 leading-relaxed">
                {pkg.deprecatedReason}
              </p>
            </div>
          )}

          {/* Security Advisories List */}
          {pkg.advisories.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>Security Advisories ({pkg.advisories.length})</span>
              </div>

              <div className="space-y-3">
                {pkg.advisories.map((adv) => (
                  <div key={adv.id} className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-red-400">{adv.id}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          adv.severity === 'CRITICAL' ? 'bg-red-500/30 text-red-300' :
                          adv.severity === 'HIGH' ? 'bg-orange-500/30 text-orange-300' :
                          'bg-amber-500/30 text-amber-300'
                        }`}>
                          {adv.severity} Severity
                        </span>
                      </div>

                      {adv.fixedIn && (
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-800/40">
                          Fixed in: {adv.fixedIn}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-200 font-medium">{adv.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{adv.summary}</p>

                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">Range: {adv.affectedRange}</span>
                      <a
                        href={adv.advisoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                      >
                        <span>View Official Advisory</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Install Commands */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Update Commands</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {installCommands.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono"
                >
                  <div className="truncate mr-2">
                    <span className="text-slate-400 select-none">{item.label}: </span>
                    <span className="text-slate-200">{item.cmd}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.cmd, item.label)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0 cursor-pointer"
                    title={`Copy ${item.label} command`}
                  >
                    {copiedKey === item.label ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Links Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs">
            <a
              href={pkg.npmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>NPM Package</span>
            </a>

            {pkg.repositoryUrl && (
              <a
                href={pkg.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
              >
                <GithubIcon className="w-3.5 h-3.5" />
                <span>Repository</span>
              </a>
            )}

            {pkg.homepage && (
              <a
                href={pkg.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Homepage</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
