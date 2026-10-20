'use client';

import React from 'react';
import { Key, Info } from 'lucide-react';
import { GithubIcon } from '@/components/GithubIcon';
import { useAppSettings } from '@/lib/settingsContext';
import { Link } from '@/i18n/navigation';

interface HeaderProps {
  onOpenTokenModal: () => void;
  hasCustomToken: boolean;
  onOpenInfoModal: () => void;
}

function FlagIcon({ country }: { country: 'en' | 'fr' }) {
  return country === 'fr' ? (
    <svg aria-hidden="true" viewBox="0 0 32 22" className="h-[18px] w-6 overflow-hidden rounded-[2px] shadow-sm shadow-black/40">
      <path fill="#fff" d="M0 0h32v22H0z" />
      <path fill="#002395" d="M0 0h10.67v22H0z" />
      <path fill="#ED2939" d="M21.33 0H32v22H21.33z" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 32 22" className="h-[18px] w-6 overflow-hidden rounded-[2px] shadow-sm shadow-black/40">
      <path fill="#012169" d="M0 0h32v22H0z" />
      <path stroke="#fff" strokeWidth="6" d="M0 0l32 22M32 0L0 22" />
      <path stroke="#C8102E" strokeWidth="2" d="M0 0l32 22M32 0L0 22" />
      <path stroke="#fff" strokeWidth="8" d="M16 0v22M0 11h32" />
      <path stroke="#C8102E" strokeWidth="4" d="M16 0v22M0 11h32" />
    </svg>
  );
}

export function Header({
  onOpenTokenModal,
  hasCustomToken,
  onOpenInfoModal,
}: HeaderProps) {
  const { language, setLanguage, t } = useAppSettings();

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-30 transition-colors">
      <div className="max-w-[1480px] mx-auto px-3 sm:px-7 lg:px-10 min-h-16 py-3 sm:py-0 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        {/* Logo and Name */}
        <Link href="/" aria-label="Upcheck home" className="flex min-w-32 flex-1 items-center gap-2 sm:gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
          <img src="/icon.svg" alt="" aria-hidden="true" className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <span className="text-xl font-extrabold tracking-tight text-white font-sans">
              upcheck<span className="text-blue-400">.</span>
            </span>
            <p className="hidden text-[10px] leading-snug text-slate-400 sm:block xl:text-[11px]">
              <span className="xl:hidden">{t('header.subtitle_short')}</span>
              <span className="hidden xl:inline">{t('header.subtitle')}</span>
            </p>
          </div>
        </Link>

        {/* Action Buttons */}
        <div className="ml-auto flex w-auto shrink-0 items-center justify-end gap-1.5 sm:gap-2.5">
          <div className="flex h-10 items-center gap-0.5 border border-slate-800 bg-slate-900 p-0.5">
            <button
              type="button"
              onClick={() => setLanguage('fr')}
              aria-label="Français"
              aria-pressed={language === 'fr'}
              className={`flex h-9 w-9 items-center justify-center border transition-colors cursor-pointer ${
                language === 'fr'
                  ? 'border-emerald-400/70 bg-emerald-500/20'
                  : 'border-transparent hover:border-slate-600 hover:bg-slate-800'
              }`}
              title="Français"
            >
              <FlagIcon country="fr" />
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              aria-label="English"
              aria-pressed={language === 'en'}
              className={`flex h-9 w-9 items-center justify-center border transition-colors cursor-pointer ${
                language === 'en'
                  ? 'border-emerald-400/70 bg-emerald-500/20'
                  : 'border-transparent hover:border-slate-600 hover:bg-slate-800'
              }`}
              title="English"
            >
              <FlagIcon country="en" />
            </button>
          </div>

          <button
            onClick={onOpenInfoModal}
            aria-label={t('header.how_it_works')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-0 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white cursor-pointer lg:w-auto lg:gap-1.5 lg:px-3"
            title="How Upcheck detects vulnerabilities & announcements"
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden lg:inline">{t('header.how_it_works')}</span>
          </button>

          <button
            onClick={onOpenTokenModal}
            aria-label={t('header.token')}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border p-0 text-xs font-medium transition-colors cursor-pointer lg:w-auto lg:gap-1.5 lg:px-3 ${
              hasCustomToken
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800 hover:bg-slate-800'
            }`}
            title="Configure GitHub Personal Access Token"
          >
            <Key className={`w-3.5 h-3.5 ${hasCustomToken ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden lg:inline">{t('header.token')}</span>
            {hasCustomToken && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            title="GitHub"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white lg:w-auto lg:gap-1.5 lg:px-3"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
