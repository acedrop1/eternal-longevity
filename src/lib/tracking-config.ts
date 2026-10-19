import { META_PIXEL_ID } from '@/lib/site';

/**
 * The tracking rules in one place (Mo's Account and Website Setup Brief,
 * sections 2 and 6). The consent banner and pixel (components/analytics/AdPixel)
 * enforce them; Admin → Consent & tracking shows them. Change the site by
 * changing this file, so the two can never disagree.
 */

/** Exact paths reviewed as general marketing pages: the only places optional ad tags may run. */
export const REVIEWED_PAGES = ['/', '/about', '/contact'] as const;

/** Where ad and analytics vendor code never runs (and is unloaded if it was loaded earlier in the visit). */
export const NEVER_RUN_ON = [
  'Shop, category and product pages (/shop, /treatments)',
  'Treatment landing pages and quizzes (/hair, /ed, /testosterone, /skin, /longevity, /intimacy)',
  'Assessment and consent (/start)',
  'Sign-in and account creation (/login, /signup, /auth)',
  'Checkout, payment and order pages (/checkout, /pay)',
  'Member, doctor, admin and pharmacy portals (/portal)',
  'Subscribe, marketing preferences and privacy requests',
];

/** Vendor tags: what exists, what it may send, and what is switched off. */
export const PIXELS = [
  {
    name: 'Meta Pixel',
    id: META_PIXEL_ID || null,
    installed: Boolean(META_PIXEL_ID),
    consent: 'Advertising (off until the visitor accepts; GPC = reject)',
    events: ['PageView'],
    off: ['Automatic event detection (autoConfig)', 'Advanced matching (no user data sent)', 'Conversions API', 'History/pushState tracking'],
  },
  {
    name: 'TikTok Pixel',
    id: null,
    installed: false,
    consent: 'Advertising',
    events: [],
    off: ['Not installed. Add only after TikTok approves prescription ads in writing.'],
  },
  {
    name: 'Google (Ads / GA4 / Tag Manager)',
    id: null,
    installed: false,
    consent: 'Analytics and Advertising',
    events: [],
    off: ['Not installed. Enhanced Measurement, Google signals, user-provided data and ad personalization stay off when added.'],
  },
] as const;

/** Never sent to any ad platform, consent or not. */
export const NEVER_SENT = [
  'Assessment answers, health history, medications, photos',
  'Product, treatment or condition pages viewed',
  'Lead, assessment, add-to-cart, checkout, purchase or revenue events',
  'Names, emails, phone numbers or patient lists (no Custom Audiences, lookalikes or Customer Match)',
];
