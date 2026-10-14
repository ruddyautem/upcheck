import { UpdateCategory } from '@/types';

export interface CategoryConfig {
  id: UpdateCategory;
  label: string;
  shortLabel: string;
  urgency: 'critical' | 'high' | 'medium' | 'low' | 'none';
  badgeClass: string;
  borderClass: string;
  glowClass: string;
  bgClass: string;
  textClass: string;
  cardClass: string;
  iconName: string;
  actionText: string;
  description: string;
}

export const CATEGORY_CONFIGS: Record<UpdateCategory, CategoryConfig> = {
  critical: {
    id: 'critical',
    label: 'Critical Vulnerability',
    shortLabel: 'Critical',
    urgency: 'critical',
    badgeClass: 'bg-red-500/15 text-red-400 border border-red-500/30',
    borderClass: 'border-red-500/40',
    glowClass: 'shadow-[0_0_15px_rgba(239,68,68,0.25)]',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-400',
    cardClass: 'border-red-500/30 bg-gradient-to-r from-red-950/20 to-transparent',
    iconName: 'ShieldAlert',
    actionText: 'Urgent Patch Required',
    description: 'Active CVE or high/critical security vulnerability affecting this version.',
  },
  security: {
    id: 'security',
    label: 'Security Advisory',
    shortLabel: 'Security',
    urgency: 'high',
    badgeClass: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    borderClass: 'border-orange-500/40',
    glowClass: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-400',
    cardClass: 'border-orange-500/30 bg-gradient-to-r from-orange-950/20 to-transparent',
    iconName: 'Shield',
    actionText: 'Security Advisory',
    description: 'Moderate/Low severity security issue found in Google OSV / GitHub database.',
  },
  deprecated: {
    id: 'deprecated',
    label: 'Deprecated Package',
    shortLabel: 'Deprecated',
    urgency: 'high',
    badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    borderClass: 'border-amber-500/40',
    glowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    cardClass: 'border-amber-500/30 bg-gradient-to-r from-amber-950/20 to-transparent',
    iconName: 'AlertTriangle',
    actionText: 'Maintainer Announcement',
    description: 'The package author or company has officially deprecated this package.',
  },
  major: {
    id: 'major',
    label: 'Major Update',
    shortLabel: 'Major Update',
    urgency: 'medium',
    badgeClass: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
    borderClass: 'border-blue-500/40',
    glowClass: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-300',
    cardClass: 'border-blue-500/30 bg-gradient-to-r from-blue-950/20 to-transparent',
    iconName: 'ArrowUpCircle',
    actionText: 'Breaking Changes',
    description: 'New major version release. Review migration notes for possible breaking changes.',
  },
  minor: {
    id: 'minor',
    label: 'Minor Update',
    shortLabel: 'Minor Update',
    urgency: 'low',
    badgeClass: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
    borderClass: 'border-sky-500/40',
    glowClass: 'shadow-[0_0_15px_rgba(14,165,233,0.15)]',
    bgClass: 'bg-sky-500/10',
    textClass: 'text-sky-400',
    cardClass: 'border-sky-500/30 bg-gradient-to-r from-sky-950/20 to-transparent',
    iconName: 'Zap',
    actionText: 'New Features Available',
    description: 'Backwards-compatible feature additions and enhancements.',
  },
  patch: {
    id: 'patch',
    label: 'Patch Update',
    shortLabel: 'Patch Update',
    urgency: 'low',
    badgeClass: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
    borderClass: 'border-slate-500/40',
    glowClass: 'shadow-[0_0_15px_rgba(148,163,184,0.1)]',
    bgClass: 'bg-slate-500/10',
    textClass: 'text-slate-300',
    cardClass: 'border-slate-500/30 bg-gradient-to-r from-slate-900/40 to-transparent',
    iconName: 'Wrench',
    actionText: 'Bug Fixes Available',
    description: 'Backwards-compatible bug fixes and small improvements.',
  },
  up_to_date: {
    id: 'up_to_date',
    label: 'Up to Date',
    shortLabel: 'Up to Date',
    urgency: 'none',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    borderClass: 'border-emerald-500/40',
    glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    cardClass: 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 to-transparent',
    iconName: 'CheckCheck',
    actionText: 'Latest Release',
    description: 'This dependency is using the latest stable version.',
  },
};
