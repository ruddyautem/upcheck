'use client';

import React from 'react';
import { UpdateCategory } from '@/types';
import { 
  ShieldAlert, 
  Shield, 
  AlertTriangle, 
  ArrowUpCircle, 
  Zap, 
  Wrench, 
  CheckCheck 
} from 'lucide-react';

interface CategoryStatsProps {
  counts: {
    critical: number;
    security: number;
    deprecated: number;
    major: number;
    minor: number;
    patch: number;
    up_to_date: number;
  };
  activeFilter: UpdateCategory | 'all';
  onSelectCategory: (category: UpdateCategory | 'all') => void;
}

export function CategoryStats({ counts, activeFilter, onSelectCategory }: CategoryStatsProps) {
  const cards = [
    {
      id: 'critical' as UpdateCategory,
      label: 'Critical Security',
      sub: 'Urgent CVE / CVSS ≥ 7',
      count: counts.critical,
      icon: ShieldAlert,
      bg: 'bg-red-500/10 hover:bg-red-500/15',
      activeRing: 'ring-2 ring-red-500 bg-red-500/20 shadow-lg shadow-red-500/20',
      border: 'border-red-500/30',
      text: 'text-red-400',
      badge: 'bg-red-500/20 text-red-300',
      pulse: counts.critical > 0,
    },
    {
      id: 'security' as UpdateCategory,
      label: 'Security Advisory',
      sub: 'Moderate / Low CVE',
      count: counts.security,
      icon: Shield,
      bg: 'bg-orange-500/10 hover:bg-orange-500/15',
      activeRing: 'ring-2 ring-orange-500 bg-orange-500/20 shadow-lg shadow-orange-500/20',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      badge: 'bg-orange-500/20 text-orange-300',
      pulse: false,
    },
    {
      id: 'deprecated' as UpdateCategory,
      label: 'Deprecated',
      sub: 'Maintainer Announcement',
      count: counts.deprecated,
      icon: AlertTriangle,
      bg: 'bg-amber-500/10 hover:bg-amber-500/15',
      activeRing: 'ring-2 ring-amber-500 bg-amber-500/20 shadow-lg shadow-amber-500/20',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-300',
      pulse: false,
    },
    {
      id: 'major' as UpdateCategory,
      label: 'Major Updates',
      sub: 'Breaking Changes',
      count: counts.major,
      icon: ArrowUpCircle,
      bg: 'bg-blue-500/10 hover:bg-blue-500/15',
      activeRing: 'ring-2 ring-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      badge: 'bg-blue-500/20 text-blue-300',
      pulse: false,
    },
    {
      id: 'minor' as UpdateCategory,
      label: 'Minor Updates',
      sub: 'New Features',
      count: counts.minor,
      icon: Zap,
      bg: 'bg-sky-500/10 hover:bg-sky-500/15',
      activeRing: 'ring-2 ring-sky-500 bg-sky-500/20 shadow-lg shadow-sky-500/20',
      border: 'border-sky-500/30',
      text: 'text-sky-400',
      badge: 'bg-sky-500/20 text-sky-300',
      pulse: false,
    },
    {
      id: 'patch' as UpdateCategory,
      label: 'Patch Updates',
      sub: 'Bug Fixes',
      count: counts.patch,
      icon: Wrench,
      bg: 'bg-slate-500/10 hover:bg-slate-500/15',
      activeRing: 'ring-2 ring-slate-400 bg-slate-500/20 shadow-lg shadow-slate-500/20',
      border: 'border-slate-500/30',
      text: 'text-slate-300',
      badge: 'bg-slate-500/20 text-slate-300',
      pulse: false,
    },
    {
      id: 'up_to_date' as UpdateCategory,
      label: 'Up to Date',
      sub: 'Healthy & Modern',
      count: counts.up_to_date,
      icon: CheckCheck,
      bg: 'bg-emerald-500/10 hover:bg-emerald-500/15',
      activeRing: 'ring-2 ring-emerald-500 bg-emerald-500/20 shadow-lg shadow-emerald-500/20',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-300',
      pulse: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeFilter === card.id;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectCategory(isSelected ? 'all' : card.id)}
            className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
              card.border
            } ${card.bg} ${isSelected ? card.activeRing : ''}`}
          >
            {card.pulse && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}

            <div className="flex items-center justify-between mb-2">
              <Icon className={`w-4 h-4 ${card.text} transition-transform group-hover:scale-110`} />
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold font-mono ${card.badge}`}>
                {card.count}
              </span>
            </div>

            <div className="space-y-0.5">
              <div className={`text-xs font-bold leading-tight ${card.text}`}>
                {card.label}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {card.sub}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
