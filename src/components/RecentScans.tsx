'use client';

import React, { useState } from 'react';
import { HistoryItem } from '@/lib/history';
import { Clock, X, Trash2, ChevronDown, ChevronUp, Sparkles, ExternalLink } from 'lucide-react';
import { GithubIcon } from '@/components/GithubIcon';

interface RecentScansProps {
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onRemoveItem: (fullName: string) => void;
  onClearHistory: () => void;
  isLoading: boolean;
}

export function RecentScans({
  history,
  onSelectHistoryItem,
  onRemoveItem,
  onClearHistory,
  isLoading,
}: RecentScansProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (history.length === 0) return null;

  const topRecent = history.slice(0, 3);
  const remainingCount = Math.max(0, history.length - 3);

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-emerald-600 text-white font-bold';
      case 'B':
        return 'bg-sky-600 text-white font-bold';
      case 'C':
        return 'bg-amber-600 text-white font-bold';
      case 'D':
        return 'bg-orange-600 text-white font-bold';
      default:
        return 'bg-red-600 text-white font-bold';
    }
  };

  return (
    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2.5">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-bold text-white">Recent Scans</span>
          <span className="text-[11px] font-mono text-slate-400">
            ({history.length} saved)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {history.length > 3 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{isExpanded ? 'Collapse' : `View All (${history.length})`}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={onClearHistory}
            disabled={isLoading}
            className="text-[11px] text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear history</span>
          </button>
        </div>
      </div>

      {/* Primary Compact Row (Up to 3 items) */}
      <div className="flex flex-wrap items-center gap-2">
        {topRecent.map((item) => (
          <div
            key={item.fullName}
            onClick={() => !isLoading && onSelectHistoryItem(item)}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer shadow-sm"
          >
            {item.isCustomJson ? (
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <GithubIcon className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 shrink-0 transition-colors" />
            )}

            <span className="text-xs font-mono font-bold text-slate-100 group-hover:text-white truncate max-w-[180px]">
              {item.fullName}
            </span>

            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${getGradeBadge(item.grade)}`}>
              {item.grade} ({item.score})
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveItem(item.fullName);
              }}
              className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer ml-0.5"
              title="Remove from history"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {!isExpanded && remainingCount > 0 && (
          <button
            onClick={() => setIsExpanded(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-700 text-blue-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            +{remainingCount} more
          </button>
        )}
      </div>

      {/* Expanded Organized View (When user clicks View All) */}
      {isExpanded && (
        <div className="pt-2 border-t border-slate-700/80 space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {history.map((item) => (
            <div
              key={item.fullName}
              onClick={() => !isLoading && onSelectHistoryItem(item)}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 hover:bg-slate-700 border border-slate-750 transition-colors cursor-pointer text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {item.isCustomJson ? (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <GithubIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className="font-mono font-bold text-slate-100 truncate">
                  {item.fullName}
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  • {item.totalPackages} pkgs
                </span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${getGradeBadge(item.grade)}`}>
                  {item.grade} • {item.score}/100
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(item.fullName);
                  }}
                  className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  title="Remove from history"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
