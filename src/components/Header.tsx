'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Key, Info, Menu, X } from 'lucide-react';
import Image from 'next/image';
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
  const [mobileMenu, setMobileMenu] = useState<'language' | 'actions' | null>(null);
  const mobileControlsRef = useRef<HTMLDivElement>(null);
  const languageButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileMenu) return;
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !mobileControlsRef.current?.contains(event.target)) {
        setMobileMenu(null);
      }
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenu(null);
        (mobileMenu === 'language' ? languageButtonRef : menuButtonRef).current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [mobileMenu]);

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-30 transition-colors">
      <div className="max-w-[1480px] mx-auto px-3 sm:px-7 lg:px-10 min-h-16 py-3 sm:py-0 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        {/* Logo and Name */}
        <Link href="/" aria-label="Upcheck home" className="flex min-w-32 flex-1 items-center gap-2 sm:gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
          <Image width={32} height={32} unoptimized src="/icon.svg" alt="" aria-hidden="true" className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <span className="text-xl font-extrabold tracking-tight text-white font-sans">
              upcheck<span className="text-blue-400">.</span>
            </span>
            <p className="hidden truncate text-[0.625rem] leading-snug text-slate-400 sm:block xl:text-[0.6875rem]">
              <span className="xl:hidden">{t('header.subtitle_short')}</span>
              <span className="hidden xl:inline">{t('header.subtitle')}</span>
            </p>
          </div>
        </Link>

        {/* Mobile language picker and navigation. */}
        <div ref={mobileControlsRef} className="relative ml-auto flex shrink-0 items-center gap-2 sm:hidden">
          <button
            ref={languageButtonRef}
            type="button"
            onClick={() => setMobileMenu((open) => open === 'language' ? null : 'language')}
            aria-label={t('header.language')}
            aria-expanded={mobileMenu === 'language'}
            aria-controls="mobile-language-picker"
            className="flex h-10 items-center justify-center gap-1.5 border border-slate-800 bg-slate-900 px-2 text-slate-300 hover:border-emerald-400/60 focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            <FlagIcon country={language} />
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileMenu((open) => open === 'actions' ? null : 'actions')}
            aria-label={mobileMenu === 'actions' ? t('header.close_menu') : t('header.open_menu')}
            aria-expanded={mobileMenu === 'actions'}
            aria-controls="mobile-header-actions"
            className="flex h-10 w-10 items-center justify-center border border-slate-800 bg-slate-900 text-slate-200 hover:border-emerald-400/60 focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            {mobileMenu === 'actions' ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>

          {mobileMenu === 'language' && (
            <div id="mobile-language-picker" className="absolute right-0 top-full mt-2 grid w-40 gap-2 border border-slate-800 bg-slate-950 p-2 shadow-xl">
              {(['fr', 'en'] as const).map((country) => (
                <button
                  key={country}
                  type="button"
                  onClick={() => { setMobileMenu(null); setLanguage(country); }}
                  aria-pressed={language === country}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-3 border border-slate-800 bg-slate-900 px-3 text-left text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white aria-pressed:border-emerald-400/70 aria-pressed:bg-emerald-500/20 aria-pressed:text-emerald-200 focus-visible:outline-2 focus-visible:outline-emerald-400"
                >
                  <FlagIcon country={country} />
                  {country === 'fr' ? 'Français' : 'English'}
                </button>
              ))}
            </div>
          )}

          {mobileMenu === 'actions' && (
            <nav id="mobile-header-actions" aria-label={t('header.open_menu')} className="absolute right-0 top-full mt-2 grid w-56 max-w-[calc(100vw-1.5rem)] gap-2 border border-slate-800 bg-slate-950 p-2 shadow-xl">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenu(null)} className="flex min-h-11 items-center gap-3 border border-slate-800 bg-slate-900 px-3 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-400">
                <GithubIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                GitHub
              </a>
              <button type="button" onClick={() => { setMobileMenu(null); onOpenTokenModal(); }} className={`flex min-h-11 w-full cursor-pointer items-center gap-3 border px-3 text-left text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-400 ${hasCustomToken ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <Key className={`h-3.5 w-3.5 shrink-0 ${hasCustomToken ? 'text-emerald-400' : 'text-slate-400'}`} aria-hidden="true" />
                {t('header.token')}
                {hasCustomToken && <span className="ml-auto h-1.5 w-1.5 bg-emerald-400" aria-hidden="true" />}
              </button>
              <button type="button" onClick={() => { setMobileMenu(null); onOpenInfoModal(); }} className="flex min-h-11 w-full cursor-pointer items-center gap-3 border border-slate-800 bg-slate-900 px-3 text-left text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-400">
                <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                {t('header.how_it_works')}
              </button>
            </nav>
          )}
        </div>

        {/* Desktop action buttons. */}
        <div className="ml-auto hidden w-auto shrink-0 items-center justify-end gap-2 sm:flex">
          <div className="flex h-9 items-center gap-0.5 border border-slate-800 bg-slate-900 p-0.5 [&_svg]:h-3.5 [&_svg]:w-5">
            <button
              type="button"
              onClick={() => setLanguage('fr')}
              aria-label="Français"
              aria-pressed={language === 'fr'}
              className={`flex h-7.5 w-7.5 items-center justify-center border transition-colors cursor-pointer ${
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
              className={`flex h-7.5 w-7.5 items-center justify-center border transition-colors cursor-pointer ${
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
            className="flex h-9 w-9 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-slate-800 bg-slate-900 p-0 text-[0.625rem] font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white cursor-pointer lg:w-32 lg:gap-1 lg:px-2"
            title="How Upcheck detects vulnerabilities & announcements"
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden lg:inline">{t('header.how_it_works')}</span>
          </button>

          <button
            onClick={onOpenTokenModal}
            aria-label={t('header.token')}
            className={`flex h-9 w-9 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border p-0 text-[0.625rem] font-medium transition-colors cursor-pointer lg:w-[8.25rem] lg:gap-1 lg:px-2 ${
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
            className="flex h-9 w-9 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-slate-800 bg-slate-900 text-[0.625rem] font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white lg:w-22 lg:gap-1 lg:px-2"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
