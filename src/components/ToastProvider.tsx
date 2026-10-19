'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      offset="1rem"
      theme="dark"
      toastOptions={{ className: 'upcheck-toast' }}
    />
  );
}
