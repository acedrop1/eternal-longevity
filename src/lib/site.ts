/**
 * Single place for site-wide metadata used by sitemap, robots, and OG.
 * Override SITE_URL in production via NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://eternallongevity.com';

export const SITE_NAME = 'Eternal Longevity';

export const SITE_TAGLINE = 'Physician-supervised peptide protocols.';

export const SITE_DESCRIPTION =
  'A licensed-physician peptide telehealth platform. Compounded by 503A pharmacy, tested for 99%+ purity, shipped cold-chain.';
