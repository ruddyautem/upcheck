'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { writeBrowserStorage } from './browserStorage';

export type Language = AppLocale;

interface AppSettingsContextType {
  language: Language;
  locale: string;
  githubToken: string;
  setGithubToken: (token: string) => void;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const language = useLocale() as Language;
  const translate = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [githubToken, setGithubToken] = useState('');
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';

  useEffect(() => { writeBrowserStorage('upcheck_github_token', null); }, []);

  const setLanguage = (lang: Language) => {
    if (lang !== language) {
      router.replace(pathname, { locale: lang });
    }
  };

  const t = (key: string): string => translate(key as never);

  return (
    <AppSettingsContext.Provider
      value={{
        language,
        locale,
        githubToken,
        setGithubToken,
        setLanguage,
        t,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}
