'use client';

import React, { useState } from 'react';
import { PackageAnalysis } from '@/types';
import { CATEGORY_CONFIGS } from '@/lib/categories';
import { 
  ShieldAlert, 
  Shield, 
  AlertTriangle, 
  ArrowUpCircle, 
  Zap, 
  Wrench, 
  CheckCheck, 
  ExternalLink, 
  Copy, 
  Check, 
  ArrowRight,
  Megaphone,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface PackageCardProps {
  pkg: PackageAnalysis;
  onSelect: (pkg: PackageAnalysis) => void;
}

export function PackageCard({ pkg, onSelect }: PackageCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const config = CATEGORY_CONFIGS[pkg.category];

  const handleCopyInstall = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cmd = `bun add ${pkg.name}@latest`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryIcon = () => {
    switch (pkg.category) {
      case 'critical':
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'security':
        return <Shield className="w-4 h-4 text-orange-400" />;
      case 'deprecated':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'major':
        return <ArrowUpCircle className="w-4 h-4 text-blue-400" />;
      case 'minor':
        return <Zap className="w-4 h-4 text-sky-400" />;
      case 'patch':
        return <Wrench className="w-4 h-4 text-slate-300" />;
      case 'up_to_date':
        return <CheckCheck className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div
      onClick={() => onSelect(pkg)}
      className={`border rounded-2xl p-4 transition-all duration-200 hover:scale-[1.008] cursor-pointer bg-slate-900/50 backdrop-blur-md relative overflow-hidden ${
        config.borderClass
      } ${pkg.urgencyScore >= 4 ? config.glowClass : ''}`}
    >
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Name and tags */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-base font-bold text-white group-hover:text-blue-400 transition-colors">
              {pkg.name}
            </span>

            {pkg.isDevDependency && (
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 font-mono">
                dev
              </span>
            )}
            {pkg.isPeerDependency && (
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                peer
              </span>
            )}

            <a
              href={pkg.npmUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              title="View on npm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Declared: <code className="text-slate-300">{pkg.currentSpec}</code></span>
          </div>
        </div>

        {/* Right side: Versions and Category Badge */}
        <div className="flex items-center gap-3">
          {/* Version comparison */}
          <div className="flex items-center gap-2 text-xs bg-slate-950/70 border border-slate-800/80 px-3 py-1.5 rounded-xl font-mono">
            <span className="text-slate-400 font-semibold">{pkg.currentVersion}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span
              className={`font-bold ${
                pkg.category === 'up_to_date'
                  ? 'text-emerald-400'
                  : pkg.category === 'major'
                  ? 'text-blue-400'
                  : pkg.category === 'critical'
                  ? 'text-red-400'
                  : 'text-cyan-400'
              }`}
            >
              {pkg.latestVersion}
            </span>
          </div>

          {/* Category Pill */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${config.badgeClass}`}>
            {getCategoryIcon()}
            <span>{config.shortLabel}</span>
          </div>
        </div>
      </div>

      {/* Maintainer Deprecation Announcement Notice */}
      {pkg.deprecatedReason && (
        <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
          <Megaphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-amber-300">Maintainer Deprecation Notice:</span>
            <p className="text-slate-300 font-mono text-[11px] leading-relaxed break-words">
              {pkg.deprecatedReason}
            </p>
          </div>
        </div>
      )}

      {/* Security Advisories Banner */}
      {pkg.advisories.length > 0 && (
        <div className="mt-3 p-3 rounded-xl bg-red-950/30 border border-red-500/30 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span className="font-semibold text-red-300">
                {pkg.advisories.length} Security {pkg.advisories.length === 1 ? 'Advisory' : 'Advisories'} Detected
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 underline underline-offset-2"
            >
              {expanded ? (
                <>Less Details <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>View CVEs <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          </div>

          {expanded && (
            <div className="space-y-2 pt-2 border-t border-red-900/40">
              {pkg.advisories.map((adv) => (
                <div key={adv.id} className="bg-slate-950/60 p-2.5 rounded-lg border border-red-900/30 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-red-400">{adv.id}</span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        adv.severity === 'CRITICAL' ? 'bg-red-500/30 text-red-300' :
                        adv.severity === 'HIGH' ? 'bg-orange-500/30 text-orange-300' :
                        'bg-amber-500/30 text-amber-300'
                      }`}>
                        {adv.severity}
                      </span>
                    </div>
                    {adv.fixedIn && (
                      <span className="text-[11px] font-mono text-emerald-400">
                        Fixed in: ≥ {adv.fixedIn}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-2">{adv.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Details & Quick Action */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span className="text-[11px] text-slate-400">{config.description}</span>

        <button
          type="button"
          onClick={handleCopyInstall}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors text-[11px] font-mono shrink-0 cursor-pointer"
          title="Copy Bun install command"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span>bun add @latest</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
