import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { getLiveProducts } from '@/lib/catalog';
import { listedCategories } from '@/lib/lineup';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // getLiveProducts applies the NEVER_LIVE guard: no withheld or GLP-1 page is listed.
  const live = await getLiveProducts();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/shop`, changeFrequency: 'weekly', priority: 0.9 },
    // Only categories with something listed; empty ones are "coming soon" pages.
    ...listedCategories(live.map((p) => p.id)).filter((c) => c.items.length).map((c) => ({
      url: `${SITE_URL}/treatments/${c.slug}`,
     
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...live.map((p) => ({
      url: `${SITE_URL}/shop/${p.id}`,
      ...(p.updatedAt && { lastModified: p.updatedAt }),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/faq`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/start`, changeFrequency: 'yearly', priority: 0.8 },
    { url: `${SITE_URL}/compliance`, changeFrequency: 'monthly', priority: 0.5 },
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
     
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    })),
  ];

  return staticEntries;
}
