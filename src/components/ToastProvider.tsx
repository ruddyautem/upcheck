'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      offset="0.75rem"
      mobileOffset="0.75rem"
      theme="dark"
      toastOptions={{ className: 'upcheck-toast' }}
    />
  );
}
