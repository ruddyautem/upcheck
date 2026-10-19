import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...['en', 'fr'].flatMap((locale) => [
      { url: `${SITE_URL}/${locale}`, changeFrequency: 'weekly' as const, priority: 1 },
      { url: `${SITE_URL}/${locale}/privacy`, changeFrequency: 'yearly' as const, priority: 0.3 },
      { url: `${SITE_URL}/${locale}/terms`, changeFrequency: 'yearly' as const, priority: 0.3 },
    ]),
  ];
}
