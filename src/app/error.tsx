'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Upcheck rendering error:', error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-slate-100">
      <section className="max-w-md border border-red-500/40 bg-red-950/30 p-6 text-center" role="alert">
        <p className="text-sm font-semibold text-red-300">Upcheck could not display this page.</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">Try again. If the problem continues, reload the page.</p>
        <button type="button" onClick={reset} className="mt-5 border border-emerald-500/50 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Try again</button>
      </section>
    </main>
  );
}
