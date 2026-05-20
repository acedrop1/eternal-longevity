/**
 * Single place for site-wide metadata used by sitemap, robots, and OG.
 *
 * SITE_URL resolution order:
 *   1. NEXT_PUBLIC_SITE_URL . Explicit override. Set this in Vercel once the
 *      custom domain (eternallongevity.com) is connected.
 *   2. VERCEL_PROJECT_PRODUCTION_URL. Vercel's stable production domain,
 *      auto-set on every Vercel deployment (currently the *.vercel.app URL).
 *   3. Fallback. The current Vercel production URL, so local dev and any
 *      edge case still produce working absolute URLs.
 *
 * This matters for OG/social images: the <meta og:image> tag is an absolute
 * URL, so it must point at a domain that's actually live.
 */
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'https://eternal-longevity-seven.vercel.app';
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = 'Eternal Longevity';

export const SITE_TAGLINE = 'Physician-supervised peptide protocols.';

export const SITE_DESCRIPTION =
  'A licensed-physician peptide telehealth platform. Compounded by 503A pharmacy, tested for 99%+ purity, shipped cold-chain.';
