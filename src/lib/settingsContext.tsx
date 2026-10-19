'use client';

import React, { createContext, useContext } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

export type Language = AppLocale;
export type Theme = 'dark' | 'light';

interface AppSettingsContextType {
  theme: Theme;
  language: Language;
  locale: string;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const language = useLocale() as Language;
  const translate = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const theme: Theme = 'dark';
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';

  const setTheme = (_t: Theme) => {};
  const toggleTheme = () => {};

  const setLanguage = (lang: Language) => {
    if (lang !== language) {
      router.replace(pathname, { locale: lang });
    }
  };

  const t = (key: string): string => translate(key as never);

  return (
    <AppSettingsContext.Provider
      value={{
        theme,
        language,
        locale,
        toggleTheme,
        setTheme,
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
