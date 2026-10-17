import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy notice',
  description: 'How Upcheck processes repository manifests, browser storage and optional GitHub tokens.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-200 sm:px-8">
      <article className="mx-auto max-w-3xl space-y-8 border border-slate-800 bg-slate-900/60 p-6 sm:p-10">
        <header>
          <Link href="/" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">← Back to Upcheck</Link>
          <h1 className="mt-6 text-3xl font-bold text-white">Privacy notice</h1>
          <p className="mt-3 text-sm text-slate-400">Last updated: October 16, 2026</p>
        </header>
        <section className="space-y-3 text-sm leading-7"><h2 className="text-lg font-semibold text-white">What Upcheck processes</h2><p>Upcheck receives the repository identifier or package.json content you submit in order to retrieve package metadata from GitHub and npm and check known vulnerabilities with OSV. It does not need your source code to perform an analysis.</p></section>
        <section className="space-y-3 text-sm leading-7"><h2 className="text-lg font-semibold text-white">Local browser storage</h2><p>Your language preference, recent scan list and cached analysis results are stored in your browser&apos;s local storage. They are not written to an Upcheck application database. You can remove them through your browser settings.</p></section>
        <section className="space-y-3 text-sm leading-7"><h2 className="text-lg font-semibold text-white">GitHub token</h2><p>If you add a token, it remains only in the page&apos;s memory and is cleared when you refresh or close it. The browser sends it only with the analysis request so Upcheck can call GitHub on your behalf. Use a read-only token with the smallest scope necessary and never share it on a shared device.</p></section>
        <section className="space-y-3 text-sm leading-7"><h2 className="text-lg font-semibold text-white">Third-party services</h2><p>Analysis queries GitHub, the npm registry and the OSV vulnerability database. Those services process requests according to their own policies. Infrastructure providers may retain technical security logs as required to operate the service.</p></section>
        <section className="space-y-3 text-sm leading-7"><h2 className="text-lg font-semibold text-white">Cookies</h2><p>Upcheck does not use advertising or analytics cookies. The privacy notice dismissal and app preferences are stored locally in the browser.</p></section>
      </article>
    </main>
  );
}
