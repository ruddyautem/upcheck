'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function useBrowserReady() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}

export function readBrowserStorage(key: string) {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
}

export function writeBrowserStorage(key: string, value: string | null) {
  if (typeof window === 'undefined') return false;
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return true;
  } catch { return false; }
}
