'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShieldAlert, 
  AlertTriangle, 
  HelpCircle, 
  Key, 
  ExternalLink, 
  Sparkles, 
  ArrowRight,
  Activity,
  X
} from 'lucide-react';

export type DashboardView = 'overview' | 'packages' | 'security' | 'breaking';

interface SidebarProps {
  currentView: DashboardView;
  onSelectView: (view: DashboardView) => void;
  packageCount: number;
  securityCount: number;
  breakingCount: number;
  onOpenHowItWorks: () => void;
  onOpenTokenModal: () => void;
  hasCustomToken: boolean;
  onTriggerScanFocus: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  currentView,
  onSelectView,
  packageCount,
  securityCount,
  breakingCount,
  onOpenHowItWorks,
  onOpenTokenModal,
  hasCustomToken,
  onTriggerScanFocus,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const navItems = [
    {
      id: 'overview' as DashboardView,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'packages' as DashboardView,
      label: 'Packages',
      icon: Package,
      badge: packageCount > 0 ? packageCount : null,
      badgeColor: 'bg-slate-800 text-slate-300',
    },
    {
      id: 'security' as DashboardView,
      label: 'Security',
      icon: ShieldAlert,
      badge: securityCount > 0 ? securityCount : null,
      badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
    },
    {
      id: 'breaking' as DashboardView,
      label: 'Breaking',
      icon: AlertTriangle,
      badge: breakingCount > 0 ? breakingCount : null,
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    },
  ];

  const content = (
    <div className="flex flex-col h-full bg-[#0b0f19] border-r border-slate-800/80 w-64 p-4 text-slate-300 select-none">
      {/* Brand Logo */}
      <div className="flex items-center justify-between pb-6 pt-2 px-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-baseline">
            <span className="text-xl font-extrabold tracking-tight text-white font-sans">
              upcheck<span className="text-purple-400">.</span>
            </span>
          </div>
        </div>

        {isOpenMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Navigation */}
      <div className="flex-1 py-6 space-y-6 overflow-y-auto">
        {/* Workspace section */}
        <div className="space-y-1.5">
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectView(item.id);
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${item.badgeColor || 'bg-slate-800 text-slate-400'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Resources section */}
        <div className="space-y-1.5">
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Resources
          </div>

          <button
            onClick={onOpenHowItWorks}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span>How it works</span>
          </button>

          <button
            onClick={onOpenTokenModal}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-slate-500" />
              <span>GitHub Token</span>
            </div>
            {hasCustomToken && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>

          <a
            href="https://osv.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <ExternalLink className="w-4 h-4 text-slate-500" />
              <span>Advisory source</span>
            </div>
            <span className="text-[10px] text-slate-500">OSV</span>
          </a>
        </div>
      </div>

      {/* Bottom Promo Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 to-slate-900/60 border border-purple-500/20 text-slate-300 space-y-2 mt-auto">
        <div className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-300 flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xs font-bold text-white leading-tight">
          Stay ahead of updates
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Scan any public GitHub repo and see what matters first.
        </p>
        <button
          onClick={() => {
            onTriggerScanFocus();
            if (isOpenMobile) onCloseMobile();
          }}
          className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition-colors pt-1 cursor-pointer"
        >
          <span>Scan a repository</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-10">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
