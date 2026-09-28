import type { Metadata } from 'next';
import { SITE_NAME, SITE_TAGLINE } from './site';

/**
 * A public page's title, description, canonical URL and og:url. Next merges
 * metadata shallowly, so a page's openGraph replaces the root layout's: the
 * shared fields (and the app/opengraph-image card) come along here. Paths
 * resolve against metadataBase.
 */
export function pageMeta(path: string, title: string | null, description: string): Metadata {
  const full = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  return {
    ...(title && { title }),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_US',
      title: full,
      description,
      url: path,
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: `${SITE_NAME} | ${SITE_TAGLINE}` }],
    },
  };
}
