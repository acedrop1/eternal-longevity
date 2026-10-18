import type { CategoryKey } from './intake-categories';

/*
 * Ad landing pages built from the /hair template (components/landing). /hair
 * itself is its own page (app/hair) and is not in this list; every other
 * landing page is one entry here. Copy comes only from "The Words for Ads"
 * (approved Oct 15, 2026) and the Oct 14 claims research: no new claims.
 * A page is hidden until it is published in Admin → Landing pages.
 *
 * Quiz rule (same as /hair, as on Hims): at most three quick questions —
 * the goal, the format (only when there is a real choice), and prescription
 * interest. Medical questions (prior use, frequency, labs, skin type) belong
 * in the assessment, not here.
 */

export interface QuizQuestion {
  /** The ?key= the answer travels in to /start. */
  key: string;
  label: string;
  options: { value: string; label: string }[];
  /** The assessment answer it pre-fills (still shown, still changeable there). Omit for a commitment-only question. */
  field?: string;
  /** The assessment field is multi-select: pre-fill it as a one-item list. */
  multi?: boolean;
}

export interface Landing {
  slug: string;
  /** Shown in Admin → Landing pages. */
  title: string;
  /** Where the quiz and buttons lead: a category, or one product's assessment. */
  start: { category: CategoryKey } | { product: string };
  seo: { title: string; description: string };
  /** Hero: `lead` then the highlighted `swipe`; `footnote` adds a ¹ and prints in the small print. */
  headline: { lead: string; swipe: string; footnote?: string };
  subline: string;
  /** The product whose photo fills the hero (from the live catalogue). */
  heroProduct: string;
  quiz: QuizQuestion[];
  /** The phone bar once the quiz scrolls away. */
  stickyLabel: string;
  /** "Treatment options" cards: live products by id, cheapest price shown. */
  options: { title: string; body: string; products: string[] }[];
  /** Under the quiz: the compounded-drug notice and any required disclaimers. */
  smallPrint: string[];
}

const COMPOUNDED = (what: string) =>
  `${what} are compounded drug products. The FDA does not approve or verify compounded drugs for safety, effectiveness or quality. Prescription required; a physician decides if treatment is right for you.`;

const RX_INTEREST: QuizQuestion = {
  key: 'rx',
  label: 'Are you interested in prescription treatment?',
  options: [
    { value: 'yes', label: 'Yes' },
    { value: 'unsure', label: 'Not sure yet' },
  ],
};

export const LANDINGS: Landing[] = [
  {
    slug: 'ed',
    title: 'ED',
    start: { category: 'sexual-health' },
    seo: {
      title: 'ED treatment, prescribed online',
      description: 'ED treatment prescribed online by a licensed physician: sildenafil, or sildenafil and tadalafil in one dissolvable troche.',
    },
    headline: { lead: 'ED treatment, prescribed online by', swipe: 'licensed providers.' },
    subline: 'Fast-acting sildenafil and long-lasting tadalafil, in one dissolvable troche. Or sildenafil on its own.',
    heroProduct: 'sildenafil-tadalafil',
    quiz: [
      {
        key: 'focus',
        label: 'What would you like help with?',
        field: 'sx_focus',
        options: [
          { value: 'performance', label: 'Getting or keeping an erection' },
          { value: 'desire', label: 'Interest in sex' },
          { value: 'both', label: 'Both' },
        ],
      },
      {
        key: 'format',
        label: 'How would you prefer to take it?',
        options: [
          { value: 'troche', label: 'A dissolvable troche' },
          { value: 'capsule', label: 'A capsule' },
          { value: 'either', label: 'Either is fine' },
        ],
      },
      RX_INTEREST,
    ],
    stickyLabel: 'Find your ED treatment',
    options: [
      { title: 'Sildenafil + tadalafil', body: 'Two medicines in one dissolvable troche.', products: ['sildenafil-tadalafil'] },
      { title: 'Sildenafil', body: 'A capsule taken as needed.', products: ['sildenafil'] },
    ],
    smallPrint: [COMPOUNDED('Our ED treatments')],
  },
  {
    slug: 'testosterone',
    title: 'Testosterone',
    start: { product: 'enclomiphene' },
    seo: {
      title: 'Testosterone care, prescribed online',
      description: 'Testosterone care guided by lab work and a licensed physician. One capsule a day, if prescribed.',
    },
    headline: { lead: 'Testosterone care, guided by', swipe: 'lab work and a licensed physician.' },
    subline: 'One capsule a day, if prescribed. Message your prescriber any time. 100% online.',
    heroProduct: 'enclomiphene',
    quiz: [
      {
        key: 'support',
        label: 'What would you like support with?',
        field: 'hm_symptoms',
        multi: true,
        options: [
          { value: 'energy', label: 'Energy' },
          { value: 'drive', label: 'Sex drive' },
          { value: 'mood', label: 'Mood or motivation' },
          { value: 'strength', label: 'Strength and recovery' },
        ],
      },
      RX_INTEREST,
    ],
    stickyLabel: 'Check your testosterone care',
    options: [{ title: 'Enclomiphene', body: 'One capsule a day, if prescribed.', products: ['enclomiphene'] }],
    smallPrint: [COMPOUNDED('Enclomiphene and our other hormone treatments')],
  },
  {
    slug: 'skin',
    title: 'Acne & skin',
    start: { category: 'skin' },
    seo: {
      title: 'Prescription acne treatment, online',
      description: 'Prescription skincare for acne, guided by a provider: tretinoin creams or an oral option, prescribed online.',
    },
    headline: { lead: 'Prescription skincare for acne,', swipe: 'guided by a provider.' },
    subline: 'Tretinoin, a prescription retinoid, in a cream. Or an oral option, if your provider decides it’s right for you. 100% online, if eligible.',
    heroProduct: 'clear-skin-cream',
    quiz: [
      {
        key: 'goal',
        label: 'What would you most like to improve?',
        field: 'sk_goals',
        multi: true,
        options: [
          { value: 'blemishes', label: 'Blemishes and clogged pores' },
          { value: 'texture', label: 'Texture and fine lines' },
          { value: 'redness', label: 'Redness' },
        ],
      },
      {
        key: 'format',
        label: 'How would you prefer to take it?',
        options: [
          { value: 'cream', label: 'A cream' },
          { value: 'capsule', label: 'A daily capsule' },
          { value: 'either', label: 'Either is fine' },
        ],
      },
      RX_INTEREST,
    ],
    stickyLabel: 'Find your skin treatment',
    options: [
      { title: 'Prescription cream', body: 'Tretinoin, applied at night.', products: ['tretinoin', 'clear-skin-cream', 'glow-cream'] },
      { title: 'Oral Acne Rx', body: 'A daily capsule, if your provider decides it’s right for you.', products: ['clear-skin-capsules'] },
    ],
    smallPrint: [COMPOUNDED('Our skin treatments')],
  },
  {
    slug: 'longevity',
    title: 'Longevity',
    start: { category: 'longevity' },
    seo: {
      title: 'Longevity care, prescribed online',
      description: 'Provider-guided longevity care: NAD+, glutathione and MIC + B12, prescribed online only if appropriate.',
    },
    headline: { lead: 'Longevity care,', swipe: 'guided by a licensed physician.' },
    subline: 'NAD+, glutathione and MIC + B12, prescribed online only if appropriate. NAD+ is a coenzyme found in every cell and involved in energy metabolism.',
    heroProduct: 'nad-nasal',
    quiz: [
      {
        key: 'goal',
        label: 'What would you like support with?',
        field: 'lng_goals',
        multi: true,
        options: [
          { value: 'energy', label: 'Everyday energy' },
          { value: 'recovery', label: 'Recovery after activity' },
          { value: 'ageing', label: 'Healthy aging' },
        ],
      },
      {
        key: 'format',
        label: 'How would you prefer to take it?',
        options: [
          { value: 'injection', label: 'A small injection' },
          { value: 'nasal', label: 'A nasal spray' },
          { value: 'either', label: 'Either is fine' },
        ],
      },
      RX_INTEREST,
    ],
    stickyLabel: 'Start your longevity plan',
    options: [
      { title: 'NAD+ nasal spray', body: 'No needle.', products: ['nad-nasal'] },
      { title: 'Injections', body: 'NAD+, glutathione or MIC + B12. Your care team shows you how.', products: ['nad-plus', 'glutathione', 'mic-b12'] },
    ],
    smallPrint: [
      COMPOUNDED('Our longevity treatments'),
      'NAD+ is not FDA-approved to treat or prevent any condition. Benefits in humans have not been established. Glutathione is not FDA-approved to treat any condition.',
      'B12 injections are FDA-approved for B12 deficiency. Use for energy or weight is off-label and not proven.',
    ],
  },
  {
    slug: 'intimacy',
    title: 'Intimacy (PT-141)',
    start: { product: 'pt-141' },
    seo: {
      title: 'Sexual wellness, prescribed online',
      description: 'Sexual-wellness consultations for adults: PT-141 is a prescription option your provider may discuss for low sexual desire.',
    },
    headline: { lead: 'A prescription option your provider may discuss for', swipe: 'low sexual desire.' },
    subline: 'Sexual-wellness consultations for adults, prescribed only if appropriate.',
    heroProduct: 'pt-141',
    quiz: [
      {
        key: 'focus',
        label: 'What would you like help with?',
        field: 'sx_focus',
        options: [
          { value: 'desire', label: 'Interest in sex' },
          { value: 'performance', label: 'Performance' },
          { value: 'both', label: 'Both' },
        ],
      },
      RX_INTEREST,
    ],
    stickyLabel: 'See if PT-141 is right for you',
    options: [{ title: 'PT-141', body: 'A small injection, prescribed only if appropriate.', products: ['pt-141'] }],
    smallPrint: [
      COMPOUNDED('PT-141 (bremelanotide) and our other sexual-wellness treatments'),
      'Bremelanotide is FDA-approved only for certain premenopausal women with acquired, generalized HSDD; other uses are off-label. It can temporarily raise blood pressure and is not for people with uncontrolled hypertension or heart disease; it may cause nausea and skin darkening.',
    ],
  },
];

export const getLanding = (slug: string) => LANDINGS.find((l) => l.slug === slug);

/** The assessment link a landing page's quiz and buttons open. */
export const startHref = (l: Landing) =>
  'product' in l.start ? `/start?product=${encodeURIComponent(l.start.product)}` : `/start?category=${l.start.category}`;

/**
 * /start: the assessment answers a landing quiz pre-fills from its ?key=value
 * params. Only a page whose start matches what /start opened, only known
 * questions and known answers.
 */
export function landingSeed(
  opened: { category?: string; product?: string },
  params: Record<string, string | string[] | undefined>,
): Record<string, string | string[]> {
  const seed: Record<string, string | string[]> = {};
  for (const l of LANDINGS) {
    const match = 'product' in l.start ? l.start.product === opened.product : l.start.category === opened.category;
    if (!match) continue;
    for (const q of l.quiz) {
      const v = params[q.key];
      if (q.field && typeof v === 'string' && q.options.some((o) => o.value === v)) seed[q.field] = q.multi ? [v] : v;
    }
  }
  return seed;
}
