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

export const SITE_TAGLINE = 'Premium peptide protocols.';

export const SITE_DESCRIPTION =
  'An online peptide store. Order protocols compounded by a licensed 503A pharmacy, third-party tested for 99%+ purity, and shipped cold-chain to your door.';

/* ------------------------- merchant identity ------------------------------ */

/**
 * Card networks and Stripe both expect a customer to be able to find, on the
 * website, the same business they see on their statement — legal name, a
 * postal address, a phone, an email, and the descriptor itself. Missing any of
 * these is a standard reason a restricted-business account gets held, and an
 * unrecognised descriptor is the single most common dispute reason code.
 * One place, so the footer, the legal pages and the contact page can't drift.
 */
export const BUSINESS_LEGAL_NAME = 'Eternal Longevity LLC';

export const BUSINESS_ADDRESS = '825 Riverview Dr, Floor 2, Totowa, NJ 07512';

export const SUPPORT_EMAIL = 'support@etlongevity.com';

/**
 * Must stay identical to the phone on the Stripe account — a customer-service
 * number that differs between the site and the merchant record is a routine
 * reason a restricted-business account gets held. Overridable by env so the
 * number can change without a deploy.
 */
export const SUPPORT_PHONE =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? '(212) 344-4247';

/** tel: href for SUPPORT_PHONE — digits only, +1 prefixed. */
export const SUPPORT_PHONE_HREF = SUPPORT_PHONE
  ? `tel:+1${SUPPORT_PHONE.replace(/\D/g, '')}`
  : '';

export const SUPPORT_HOURS = 'Mon–Fri, 9a–6p ET';

/**
 * Exactly what a member sees on their card statement — the descriptor set on
 * the Stripe account, verbatim. We deliberately attach no per-charge suffix:
 * a suffix is only appended when the account also has a *shortened* descriptor
 * configured, and is silently dropped otherwise, which would leave this page
 * promising a string that never appears on anyone's statement.
 */
export const STATEMENT_DESCRIPTOR = 'ET LONGEVITY';

/** The only state we are licensed to sell into today. */
export const SERVICE_AREA = 'New Jersey';
