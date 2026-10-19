import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Terms of use',
    description: 'Terms governing use of the Upcheck dependency analysis service.',
    alternates: {
      canonical: `/${locale}/terms`,
      languages: { en: '/en/terms', fr: '/fr/terms' },
    },
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal' });
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-200 sm:px-8">
      <article className="mx-auto max-w-3xl space-y-8 border border-slate-800 bg-slate-900/60 p-6 sm:p-10">
        <header>
          <Link href="/" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">{t('back')}</Link>
          <h1 className="mt-6 text-3xl font-bold text-white">{t('terms.title')}</h1>
          <p className="mt-3 text-sm text-slate-400">{t('updated')}</p>
        </header>
        {['purpose', 'responsibilities', 'data', 'availability'].map((section) => (
          <section key={section} className="space-y-3 text-sm leading-7">
            <h2 className="text-lg font-semibold text-white">{t(`terms.${section}_title`)}</h2>
            <p>{t(`terms.${section}_text`)}</p>
          </section>
        ))}
      </article>
    </main>
  );
}
