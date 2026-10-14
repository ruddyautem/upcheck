'use client';

import React from 'react';
import { RepoAnalysisResult } from '@/types';
import { Star, GitFork, AlertOctagon, CheckCircle2, Shield, Wrench, Download, Terminal } from 'lucide-react';

interface HealthScoreCardProps {
  result: RepoAnalysisResult;
  onOpenRemediation: () => void;
  onOpenExport: () => void;
}

export function HealthScoreCard({ result, onOpenRemediation, onOpenExport }: HealthScoreCardProps) {
  const { healthScore, repoInfo, totalPackages, dependenciesCount, devDependenciesCount, summaryCounts } = result;

  // Grade color scheme
  const gradeStyles: Record<string, { ring: string; text: string; bg: string }> = {
    'A+': { ring: 'ring-emerald-500/50 shadow-emerald-500/20', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    A: { ring: 'ring-emerald-500/50 shadow-emerald-500/20', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    B: { ring: 'ring-sky-500/50 shadow-sky-500/20', text: 'text-sky-400', bg: 'bg-sky-500/10' },
    C: { ring: 'ring-amber-500/50 shadow-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-500/10' },
    D: { ring: 'ring-orange-500/50 shadow-orange-500/20', text: 'text-orange-400', bg: 'bg-orange-500/10' },
    F: { ring: 'ring-red-500/50 shadow-red-500/20', text: 'text-red-400', bg: 'bg-red-500/10' },
  };

  const currentGradeStyle = gradeStyles[healthScore.grade] || gradeStyles['F'];

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Background glow based on grade */}
      <div
        className={`absolute -right-16 -top-16 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none ${
          healthScore.score >= 80 ? 'bg-emerald-500' : healthScore.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
        }`}
      />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
        {/* Repo Meta & Overview */}
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {repoInfo.fullName}
            </h2>
            {repoInfo.defaultBranch && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 font-mono">
                {repoInfo.defaultBranch}
              </span>
            )}
          </div>

          {repoInfo.description && (
            <p className="text-sm text-slate-400 line-clamp-2 max-w-2xl">
              {repoInfo.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
            {typeof repoInfo.stars === 'number' && (
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>{repoInfo.stars.toLocaleString()} stars</span>
              </div>
            )}
            {typeof repoInfo.forks === 'number' && (
              <div className="flex items-center gap-1.5">
                <GitFork className="w-3.5 h-3.5 text-slate-400" />
                <span>{repoInfo.forks.toLocaleString()} forks</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>{totalPackages} total dependencies</span>
              <span className="text-slate-500">
                ({dependenciesCount} prod, {devDependenciesCount} dev)
              </span>
            </div>
          </div>
        </div>

        {/* Health Score Gauge & Grade */}
        <div className="flex items-center gap-5 sm:gap-6 bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl shadow-inner self-stretch lg:self-auto justify-between sm:justify-start">
          {/* Radial / Box Grade */}
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center ring-2 shadow-lg ${currentGradeStyle?.ring} ${currentGradeStyle?.bg}`}
          >
            <span className={`text-2xl sm:text-3xl font-black tracking-tight ${currentGradeStyle?.text}`}>
              {healthScore.grade}
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              Grade
            </span>
          </div>

          {/* Numerical Score & Label */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white">
                {healthScore.score}
              </span>
              <span className="text-sm text-slate-400 font-medium">/ 100</span>
            </div>
            <div className={`text-xs font-semibold uppercase tracking-wider ${currentGradeStyle?.text}`}>
              {healthScore.label}
            </div>
            <p className="text-[11px] text-slate-400 max-w-[200px] leading-tight hidden sm:block">
              {healthScore.description}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons at bottom */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-red-400" />
            <strong className="text-slate-200">{summaryCounts.critical + summaryCounts.security}</strong> Vulnerabilities
          </span>
          <span className="flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
            <strong className="text-slate-200">{summaryCounts.deprecated}</strong> Deprecations
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <strong className="text-slate-200">{summaryCounts.up_to_date}</strong> Up-to-date
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenRemediation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Update Scripts</span>
          </button>
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700/60 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
