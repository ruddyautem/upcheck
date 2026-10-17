import type { Metadata } from 'next';
import './globals.css';
import { AppSettingsProvider } from '@/lib/settingsContext';
import { CookieNotice } from '@/components/CookieNotice';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Upcheck — GitHub Dependency & Package Health Inspector',
    template: '%s | Upcheck',
  },
  description:
    'Inspect GitHub repository dependencies. Detect security advisories (CVEs), maintainer deprecation announcements, and categorized semver updates with clear color indicators.',
  applicationName: 'Upcheck',
  keywords: ['dependency security', 'npm', 'package.json', 'GitHub', 'vulnerability scanner'],
  alternates: { canonical: '/' },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: ['/icon.svg'],
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Upcheck',
    title: 'Upcheck — GitHub Dependency & Package Health Inspector',
    description: 'Inspect dependency updates and known security advisories in GitHub repositories.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Upcheck — GitHub Dependency & Package Health Inspector',
    description: 'Inspect dependency updates and known security advisories in GitHub repositories.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen">
        <AppSettingsProvider>
          {children}
          <CookieNotice />
        </AppSettingsProvider>
      </body>
    </html>
  );
}
