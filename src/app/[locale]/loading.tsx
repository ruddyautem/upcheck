export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-24 text-slate-100" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-10 w-48 bg-slate-800" />
        <div className="h-48 border border-slate-800 bg-slate-900/60" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-20 border border-slate-800 bg-slate-900/60" />)}
        </div>
        <span className="sr-only">Loading Upcheck</span>
      </div>
    </main>
  );
}
