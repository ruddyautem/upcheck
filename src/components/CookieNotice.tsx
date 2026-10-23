'use client';

import { useState } from 'react';
import { readBrowserStorage, useBrowserReady, writeBrowserStorage } from '@/lib/browserStorage';
import { useAppSettings } from '@/lib/settingsContext';
import { Link } from '@/i18n/navigation';

const NOTICE_KEY = 'upcheck_privacy_notice_seen';

export function CookieNotice() {
  const { t } = useAppSettings();
  const ready = useBrowserReady();
  const [dismissed, setDismissed] = useState(false);
  const isVisible = ready && !dismissed && readBrowserStorage(NOTICE_KEY) !== 'true';

  if (!isVisible) return null;

  const dismiss = () => {
    writeBrowserStorage(NOTICE_KEY, 'true');
    setDismissed(true);
  };

  return (
    <aside className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl border border-emerald-500/30 bg-slate-950 p-4 shadow-2xl shadow-black/50 sm:flex sm:items-center sm:gap-4" aria-label="Privacy notice">
      <p className="flex-1 text-xs leading-relaxed text-slate-300">
        {t('cookie.message')}{' '}
        <Link href="/privacy" className="text-emerald-300 underline underline-offset-2 hover:text-emerald-200">{t('cookie.learn_more')}</Link>
      </p>
      <button type="button" onClick={dismiss} className="mt-3 w-full border border-emerald-500/50 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 sm:mt-0 sm:w-auto">
        {t('cookie.dismiss')}
      </button>
    </aside>
  );
}
