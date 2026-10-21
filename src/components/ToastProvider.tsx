'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      offset="0.75rem"
      mobileOffset={{ top: 'max(3.5rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
      theme="dark"
      toastOptions={{ className: 'upcheck-toast' }}
    />
  );
}
