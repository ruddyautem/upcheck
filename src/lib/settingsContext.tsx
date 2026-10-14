'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDictionary, translateKey, Locale } from '@/dictionaries';

export type Language = Locale;
export type Theme = 'dark' | 'light';

interface AppSettingsContextType {
  theme: Theme;
  language: Language;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [language, setLanguageState] = useState<Language>('en');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.removeItem('upcheck_theme');
    }

    const savedLang = localStorage.getItem('upcheck_lang') as Language | null;
    if (savedLang === 'fr' || savedLang === 'en') {
      setLanguageState(savedLang);
    }
  }, []);

  const setTheme = (_t: Theme) => {};
  const toggleTheme = () => {};

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('upcheck_lang', lang);
  };

  const t = (key: string): string => {
    const dict = getDictionary(language);
    const translation = translateKey(dict, key);
    if (translation !== key) {
      return translation;
    }
    // Fallback to English dictionary
    const fallbackDict = getDictionary('en');
    return translateKey(fallbackDict, key);
  };

  return (
    <AppSettingsContext.Provider
      value={{
        theme,
        language,
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
