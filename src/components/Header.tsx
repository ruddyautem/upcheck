'use client';

import React from 'react';
import { Activity, Key, Info, Terminal } from 'lucide-react';
import { GithubIcon } from '@/components/GithubIcon';
import { useAppSettings } from '@/lib/settingsContext';

interface HeaderProps {
  onOpenTokenModal: () => void;
  hasCustomToken: boolean;
  onOpenInfoModal: () => void;
  selectedCount: number;
  onOpenRightPanel: () => void;
}

export function Header({
  onOpenTokenModal,
  hasCustomToken,
  onOpenInfoModal,
  selectedCount,
  onOpenRightPanel,
}: HeaderProps) {
  const { language, setLanguage, t } = useAppSettings();

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-30 transition-colors">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-7 lg:px-10 min-h-16 py-3 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
        {/* Logo and Name */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white font-sans">
                upcheck<span className="text-blue-400">.</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                v1.2
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {t('header.subtitle')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2 sm:gap-2.5">
          {/* Language Switcher Buttons (French flag / English flag) */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setLanguage('en')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="English"
            >
              <span className="text-sm leading-none" role="img" aria-label="English">🇬🇧</span>
              <span className="text-[11px] font-medium hidden sm:inline">EN</span>
            </button>
            <button
              onClick={() => setLanguage('fr')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer ${
                language === 'fr'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Français"
            >
              <span className="text-sm leading-none" role="img" aria-label="Français">🇫🇷</span>
              <span className="text-[11px] font-medium hidden sm:inline">FR</span>
            </button>
          </div>

          {/* Cart toggle pill if packages are selected */}
          {selectedCount > 0 && (
            <button
              onClick={onOpenRightPanel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer animate-in fade-in"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('header.queue')} ({selectedCount})</span>
            </button>
          )}

          <button
            onClick={onOpenInfoModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
            title="How Upcheck detects vulnerabilities & announcements"
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden lg:inline">{t('header.how_it_works')}</span>
          </button>

          <button
            onClick={onOpenTokenModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              hasCustomToken
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800 hover:bg-slate-800'
            }`}
            title="Configure GitHub Personal Access Token"
          >
            <Key className={`w-3.5 h-3.5 ${hasCustomToken ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{t('header.token')}</span>
            {hasCustomToken && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
