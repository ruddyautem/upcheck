import type { Metadata } from 'next';
import './globals.css';
import { AppSettingsProvider } from '@/lib/settingsContext';

export const metadata: Metadata = {
  title: 'Upcheck — GitHub Dependency & Package Health Inspector',
  description:
    'Inspect GitHub repository dependencies. Detect security advisories (CVEs), maintainer deprecation announcements, and categorized semver updates with clear color indicators.',
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
        </AppSettingsProvider>
      </body>
    </html>
  );
}
