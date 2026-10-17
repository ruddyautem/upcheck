'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const NOTICE_KEY = 'upcheck_privacy_notice_seen';

export function CookieNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(localStorage.getItem(NOTICE_KEY) !== 'true');
  }, []);

  if (!isVisible) return null;

  const dismiss = () => {
    localStorage.setItem(NOTICE_KEY, 'true');
    setIsVisible(false);
  };

  return (
    <aside className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl border border-emerald-500/30 bg-slate-950 p-4 shadow-2xl shadow-black/50 sm:flex sm:items-center sm:gap-4" aria-label="Privacy notice">
      <p className="flex-1 text-xs leading-relaxed text-slate-300">
        Upcheck does not use advertising or analytics cookies. It stores your language, scan history and cache only in this browser; an optional GitHub token stays in memory for the current session.{' '}
        <Link href="/privacy" className="text-emerald-300 underline underline-offset-2 hover:text-emerald-200">Learn more</Link>
      </p>
      <button type="button" onClick={dismiss} className="mt-3 w-full border border-emerald-500/50 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 sm:mt-0 sm:w-auto">
        Got it
      </button>
    </aside>
  );
}
