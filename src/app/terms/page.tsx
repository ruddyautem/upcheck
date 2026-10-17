import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'Terms governing use of the Upcheck dependency analysis service.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-200 sm:px-8">
      <article className="mx-auto max-w-3xl space-y-8 border border-slate-800 bg-slate-900/60 p-6 sm:p-10">
        <header>
          <Link href="/" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">← Back to Upcheck</Link>
          <h1 className="mt-6 text-3xl font-bold text-white">Terms of use</h1>
          <p className="mt-3 text-sm text-slate-400">Last updated: October 16, 2026</p>
        </header>
        <section className="space-y-3 text-sm leading-7"><h2 className="text-lg font-semibold text-white">Service purpose</h2><p>Upcheck helps you inspect JavaScript dependency manifests for available releases, deprecations and known vulnerability records. It is an informational tool, not a guarantee that a project is secure or compatible after an update.</p></section>
        <section className="space-y-3 text-sm leading-7"><h2 className="text-lg font-semibold text-white">Your responsibilities</h2><p>Only submit repositories and manifests you are authorized to analyze. Review changelogs, lockfiles and test results before applying generated commands or recommendations. Keep any GitHub token confidential and use the minimum required scope.</p></section>
        <section className="space-y-3 text-sm leading-7"><h2 className="text-lg font-semibold text-white">Third-party data</h2><p>Results depend on GitHub, npm and OSV data, which may be incomplete, delayed or inaccurate. Upcheck is not responsible for changes to those services or for decisions made from their data.</p></section>
        <section className="space-y-3 text-sm leading-7"><h2 className="text-lg font-semibold text-white">Availability and changes</h2><p>The service may be changed, suspended or discontinued. Features are provided as available without a warranty of uninterrupted operation or fitness for a specific purpose.</p></section>
      </article>
    </main>
  );
}
