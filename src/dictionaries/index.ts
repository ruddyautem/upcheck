export type Locale = 'en' | 'fr';

import en from './en.json';
import fr from './fr.json';

export const dictionaries = {
  en,
  fr,
} as const;

export type Dictionary = typeof en;

export function getDictionary(locale: Locale): Dictionary {
  return (dictionaries[locale] as Dictionary) || (dictionaries.en as Dictionary);
}

// Helper to look up dot-notation keys like "header.subtitle"
export function translateKey(dict: Dictionary, key: string): string {
  const parts = key.split('.');
  let current: any = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return key;
    }
  }
  return typeof current === 'string' ? current : key;
}
