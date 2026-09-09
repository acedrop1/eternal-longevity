import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { PUBLIC_PRODUCTS } from '@/lib/shopProducts';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    ...PUBLIC_PRODUCTS.map((p) => ({
      url: `${SITE_URL}/shop/${p.id}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/science`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/start`, lastModified: now, changeFrequency: 'yearly', priority: 0.8 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/compliance`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    // A processor's reviewer follows the sitemap; a policy page that isn't in
    // it is a policy page they report as missing.
    ...[
      'terms',
      'privacy',
      'cookies',
      'consent',
      'refunds',
      'cancellation',
      'shipping',
      'accessibility',
      'medical-disclaimer',
      'prescription-policy',
      'eligibility',
      'compounded-medication',
      'adverse-events',
      'pharmacy-fulfillment',
      'state-availability',
    ].map((slug) => ({
      url: `${SITE_URL}/legal/${slug}`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    })),
  ];

  return staticEntries;
}
