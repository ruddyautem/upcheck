import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import '../globals.css';
import { AppSettingsProvider } from '@/lib/settingsContext';
import { CookieNotice } from '@/components/CookieNotice';
import { ToastProvider } from '@/components/ToastProvider';
import { SITE_URL } from '@/lib/site';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const description = locale === 'fr'
    ? 'Inspectez les dépendances GitHub, leurs mises à jour et leurs risques de sécurité connus.'
    : 'Inspect GitHub repository dependencies, updates, and known security risks.';

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: 'Upcheck — GitHub Dependency & Package Health Inspector',
      template: '%s | Upcheck',
    },
    description,
    applicationName: 'Upcheck',
    keywords: ['dependency security', 'npm', 'package.json', 'GitHub', 'vulnerability scanner'],
    alternates: {
      canonical: `/${locale}`,
      languages: { en: '/en', fr: '/fr' },
    },
    icons: {
      icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
      shortcut: ['/icon.svg'],
    },
    openGraph: {
      type: 'website',
      url: `/${locale}`,
      siteName: 'Upcheck',
      title: 'Upcheck — GitHub Dependency & Package Health Inspector',
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Upcheck — GitHub Dependency & Package Health Inspector',
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} className="dark">
      <body className="antialiased min-h-screen">
        <NextIntlClientProvider>
          <AppSettingsProvider>
            {children}
            <CookieNotice />
            <ToastProvider />
          </AppSettingsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
