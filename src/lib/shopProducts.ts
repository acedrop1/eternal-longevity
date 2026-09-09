/**
 * Member-shop catalog. Individual peptides offered as standalone
 * subscriptions, separate from the 4 signature protocols. This is what
 * /portal/shop displays.
 *
 * Sold as a subscription (monthly/quarterly/annual) or a one-time purchase:
 *   monthly, quarterly (3 cycles), annual (~4 cycles).
 */

export type ShopCategory =
  | 'recovery'
  | 'growth'
  | 'metabolic'
  | 'cognitive'
  | 'sexual'
  | 'longevity';

export const SHOP_CATEGORIES: { key: ShopCategory; label: string }[] = [
  { key: 'recovery', label: 'Recovery & repair' },
  { key: 'growth', label: 'Growth hormone' },
  { key: 'cognitive', label: 'Cognitive' },
  { key: 'sexual', label: 'Sexual health' },
  { key: 'longevity', label: 'Longevity & skin' },
];

export type DeliveryForm = 'sq' | 'im' | 'oral' | 'nasal' | 'topical';

export const DELIVERY_LABEL: Record<DeliveryForm, string> = {
  sq: 'Subcutaneous',
  im: 'Intramuscular',
  oral: 'Oral capsule',
  nasal: 'Nasal spray',
  topical: 'Topical',
};

export interface ShopProduct {
  id: string; // slug used in URL
  name: string;
  /** Short marketing line under the title on the PDP and on the card */
  tagline: string;
  category: ShopCategory;
  /** Card description (one or two short sentences) */
  shortDescription: string;
  /** PDP intro paragraph */
  longDescription: string;
  /** "Best for" callout line */
  bestFor: string;
  /** Bullet benefits shown in PDP and tooltip */
  benefits: string[];
  /** What's actually in the box */
  whatsIncluded: string[];
  delivery: DeliveryForm;
  /** Human-readable cycle, e.g. "12-week cycle" */
  cycleLength: string;
  /** Per-cycle monthly retail (for the monthly cadence). Quarterly/annual derive lower per-month prices. */
  pricing: {
    monthly: number; // billed monthly
    quarterly: number; // billed every 3 months (lower per-cycle total)
    annual: number; // billed once per year (lowest per-cycle)
  };
  /** Background swatch gradient for the card hero */
  swatch: string;
  /** Image used in card + gallery hero */
  image: string;
  /** Additional gallery images for the PDP thumb strip */
  gallery: string[];
  /** Whether a quality review is required (always true for these peptides). */
  requiresReview: true;
  /** Optional "popular" badge */
  popular?: boolean;
  /**
   * Commonly reported side effects. Shown on the PDP — most are mild and
   * dose-related, and being upfront about them is both good practice and
   * what a payment processor expects to see on a compounded product page.
   */
  sideEffects: string[];
  /** Who should not use this product without clearing it first. */
  contraindications: string[];
  /**
   * True when the active ingredient has an FDA-approved reference drug
   * (e.g. tesamorelin → Egrifta). Only these are listed on the public
   * storefront at /shop; everything else is member-only at /portal/shop.
   */
  fdaApproved?: boolean;
}

export const SHOP_PRODUCTS: ShopProduct[] = [
  // ============ RECOVERY ============
  {
    id: 'ghk-cu',
    name: 'GHK-Cu',
    tagline: 'Skin & Connective Tissue',
    category: 'recovery',
    shortDescription:
      'Copper-tripeptide that signals tissue remodeling. Excellent for skin, hair, and connective tissue.',
    longDescription:
      'GHK-Cu is a naturally occurring copper-binding tripeptide whose levels decline with age. Laboratory and animal work has studied its role in tissue remodelling, collagen synthesis, and antioxidant activity. It is offered here for skin and connective-tissue support in healthy adults, not to treat any skin or wound condition. Works systemically (SQ) or as a topical.',
    bestFor: 'Members focused on skin quality, hair health, or visible signs of aging.',
    benefits: [
      'Studied for collagen and elastin synthesis',
      'Members report firmer skin texture',
      'Supports hair follicle health',
      'Studied for antioxidant activity',
    ],
    whatsIncluded: [
      '12 weeks of compounded GHK-Cu (2 mg/week SQ)',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 140, quarterly: 380, annual: 1340 },
    swatch: 'linear-gradient(180deg, #2a5048 0%, #000000 100%)',
    image: '/images/14.jpg',
    gallery: ['/images/14.jpg', '/images/13.jpg', '/images/11.jpg', '/images/9.jpg'],
    requiresReview: true,
    sideEffects: [
      'Injection-site redness or itching',
      'Temporary blue-green tint at the injection site (copper)',
      'Mild lightheadedness at higher doses',
      'Headache in the first week',
    ],
    contraindications: [
      "Wilson's disease or any copper-metabolism disorder",
      'Known copper hypersensitivity',
      'Pregnancy or breastfeeding',
      'Active malignancy',
    ],
  },

  // ============ GROWTH HORMONE ============
  {
    id: 'cjc-ipamorelin',
    name: 'CJC-1295 / Ipamorelin',
    tagline: 'Pulsatile GH Release',
    category: 'growth',
    shortDescription:
      'The clean GH-axis stack. Pulsatile release, without the cortisol shift seen elsewhere.',
    longDescription:
      'CJC-1295 is a GHRH analog that extends growth-hormone pulses; Ipamorelin is a ghrelin mimetic that triggers them. Together they are studied for sustained IGF-1 response, and members commonly report better recovery and sleep depth over a cycle. Studied without the prolactin or cortisol shifts seen with other secretagogues.',
    bestFor: 'Members 30+ optimizing recovery, sleep depth, and lean body composition.',
    benefits: [
      'Studied for IGF-1 response and GH AUC',
      'Members commonly report deeper slow-wave sleep',
      'Studied for body composition over a cycle',
      'No cortisol or prolactin elevation',
    ],
    whatsIncluded: [
      '12 weeks of CJC-1295 (100 mcg/day) + Ipamorelin (200 mcg/day)',
      'Bacteriostatic water',
      'Insulin syringes (30G)',
      'Alcohol prep pads',
      'Mid-cycle protocol check-in',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 240, quarterly: 660, annual: 2340 },
    swatch: 'linear-gradient(180deg, #3a5a4e 0%, #000000 100%)',
    image: '/images/9.jpg',
    gallery: ['/images/9.jpg', '/images/11.jpg', '/images/13.jpg', '/images/14.jpg'],
    requiresReview: true,
    popular: true,
    sideEffects: [
      'Injection-site redness or swelling',
      'Water retention or mild joint puffiness',
      'Head rush or flushing shortly after dosing',
      'Vivid dreams or altered sleep the first week',
      'Increased appetite',
    ],
    contraindications: [
      'Active or prior malignancy',
      'Pregnancy or breastfeeding',
      'Uncontrolled diabetes or severe insulin resistance',
      'Active proliferative retinopathy',
    ],
  },
  {
    id: 'sermorelin',
    name: 'Sermorelin',
    tagline: 'Entry-Level GHRH',
    category: 'growth',
    shortDescription:
      'A shorter-acting GHRH analog. Gentler GH-axis stimulation for first-time peptide members.',
    longDescription:
      'Sermorelin is the 1–29 fragment of natural GHRH. Half-life is short, which produces a more physiological GH pulse than longer-acting analogs. A good first step into the GH-axis category, often used 12–16 weeks at bedtime.',
    bestFor: 'First-time peptide members wanting a conservative GH-axis protocol.',
    benefits: [
      'Studied for natural GH release',
      'Members commonly report better sleep quality',
      'Studied for lean-mass support over time',
      'Shorter half-life reduces side-effect risk',
    ],
    whatsIncluded: [
      '12 weeks of compounded Sermorelin (300 mcg/night SQ)',
      'Bacteriostatic water',
      'Insulin syringes',
      'Alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 180, quarterly: 490, annual: 1740 },
    swatch: 'linear-gradient(180deg, #2e5048 0%, #000000 100%)',
    image: '/images/7.jpg',
    gallery: ['/images/7.jpg', '/images/8.jpg', '/images/9.jpg', '/images/13.jpg'],
    requiresReview: true,
    sideEffects: [
      'Injection-site irritation',
      'Flushing or warmth after dosing',
      'Headache',
      'Transient dizziness',
      'Mild water retention',
    ],
    contraindications: [
      'Active malignancy',
      'Pregnancy or breastfeeding',
      'Known hypersensitivity to GHRH analogs',
      'Untreated hypothyroidism',
    ],
  },
  {
    id: 'tesamorelin',
    name: 'Tesamorelin',
    tagline: 'GHRH Analog',
    category: 'growth',
    shortDescription:
      'The GHRH analog with the deepest human research record. Compounded, not the branded product.',
    longDescription:
      'Tesamorelin as a molecule is FDA-approved under the brand name Egrifta for one specific indication. What we dispense is a compounded preparation, which is not FDA-approved and is prescribed off-label. Published trials in the approved population studied visceral fat and lipid measures over 12–24 weeks; those results were obtained in that population with the branded product, and they are not a promise of what you will experience.',
    bestFor: 'Members 40+ discussing body-composition goals with a prescriber.',
    benefits: [
      'Studied for visceral adipose tissue',
      'Studied for triglyceride and HDL measures',
      'Acts on the GH/IGF-1 axis',
      'The deepest human trial record in this category',
    ],
    whatsIncluded: [
      '16 weeks of compounded Tesamorelin (1 mg/day SQ)',
      'Bacteriostatic water',
      'Insulin syringes',
      'Alcohol prep pads',
      'Two protocol check-ins (week 6 + week 12)',
      'Mid-cycle metabolic labs',
    ],
    delivery: 'sq',
    cycleLength: '16-week cycle',
    pricing: { monthly: 320, quarterly: 870, annual: 3080 },
    swatch: 'linear-gradient(180deg, #4a604e 0%, #000000 100%)',
    image: '/images/8.jpg',
    gallery: ['/images/8.jpg', '/images/7.jpg', '/images/11.jpg', '/images/14.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Injection-site reactions (most common)',
      'Joint pain or stiffness',
      'Peripheral edema / swelling in hands and feet',
      'Muscle aches',
      'Elevated blood glucose',
    ],
    contraindications: [
      'Active malignancy',
      'Pregnancy or breastfeeding',
      'Disrupted hypothalamic-pituitary axis (pituitary tumor, surgery, or radiation)',
      'Known hypersensitivity to tesamorelin or mannitol',
    ],
  },

  // ============ METABOLIC ============

  // ============ COGNITIVE ============
  {
    id: 'selank',
    name: 'Selank',
    tagline: 'Calm Focus, No Sedation',
    category: 'cognitive',
    shortDescription:
      'A nasal peptide studied for stress tolerance and working memory, without sedation or dependence.',
    longDescription:
      'Selank is a synthetic analog of tuftsin. Russian research has studied it for stress response and cognition, reporting no sedation, no tolerance, and no withdrawal in the populations examined. Members commonly describe calmer focus within the first two weeks. It is not a treatment for any diagnosed condition, and it is not a substitute for care you may need from your own physician.',
    bestFor: 'Members with high-stress work demands exploring cognitive support without sedation.',
    benefits: [
      'Studied for stress tolerance, without sedation',
      'Studied for working-memory performance',
      'Studied for BDNF expression',
      'No tolerance or withdrawal',
    ],
    whatsIncluded: [
      '12 weeks of Selank nasal spray (250 mcg/spray, 2 sprays/day)',
      'Spare nozzle',
      'Protocol check-in at week 6',
    ],
    delivery: 'nasal',
    cycleLength: '12-week cycle',
    pricing: { monthly: 120, quarterly: 330, annual: 1170 },
    swatch: 'linear-gradient(180deg, #2a4a48 0%, #000000 100%)',
    image: '/images/6.jpg',
    gallery: ['/images/6.jpg', '/images/5.jpg', '/images/7.jpg', '/images/11.jpg'],
    requiresReview: true,
    sideEffects: [
      'Nasal irritation or dryness (nasal spray)',
      'Mild drowsiness',
      'Headache',
      'Altered taste briefly after dosing',
    ],
    contraindications: [
      'Pregnancy or breastfeeding',
      'Known hypersensitivity to the peptide',
      'Use alongside sedatives without guidance',
    ],
  },
  {
    id: 'semax',
    name: 'Semax',
    tagline: 'Cognitive Performance',
    category: 'cognitive',
    shortDescription:
      'An ACTH fragment studied for focus and recall. No stimulant crash, no dependency.',
    longDescription:
      'Semax is a heptapeptide derived from ACTH (4-10), developed in Russia and studied there across several neurological settings. In this catalogue it is offered only for cognitive support in healthy adults, not as a treatment for any neurological condition. Members commonly report sustained focus and faster recall. Best taken in the morning to avoid sleep interference.',
    bestFor: 'Members in demanding mental work who want focus without stimulant side effects.',
    benefits: [
      'Studied for attention and working memory',
      'Studied for BDNF and NGF expression',
      'No stimulant side-effect profile',
      'A long clinical research history in Russia',
    ],
    whatsIncluded: [
      '12 weeks of Semax nasal spray (300 mcg/spray, 2 sprays/day AM)',
      'Spare nozzle',
      'Protocol check-in at week 6',
    ],
    delivery: 'nasal',
    cycleLength: '12-week cycle',
    pricing: { monthly: 140, quarterly: 380, annual: 1340 },
    swatch: 'linear-gradient(180deg, #2e4e4e 0%, #000000 100%)',
    image: '/images/1.jpg',
    gallery: ['/images/1.jpg', '/images/7.jpg', '/images/8.jpg', '/images/6.jpg'],
    requiresReview: true,
    sideEffects: [
      'Nasal irritation (nasal spray)',
      'Headache',
      'Overstimulation or difficulty sleeping if dosed late',
      'Transient blood-pressure changes',
    ],
    contraindications: [
      'Pregnancy or breastfeeding',
      'Uncontrolled hypertension',
      'Seizure disorder without guidance',
      'Known hypersensitivity to the peptide',
    ],
  },

  // ============ SEXUAL HEALTH ============
  {
    id: 'pt-141',
    name: 'PT-141',
    tagline: 'Libido & Arousal',
    category: 'sexual',
    shortDescription:
      'A melanocortin-receptor agonist acting centrally rather than vascularly. Used as needed.',
    longDescription:
      'PT-141 (bremelanotide) works through the central melanocortin system rather than the vascular pathway PDE-5 inhibitors target. Bremelanotide is FDA-approved under the brand name Vyleesi for one specific indication in premenopausal women; what we dispense is a compounded preparation, which is not FDA-approved, and use in men is off-label. Whether it is appropriate for you is a question for your prescriber.',
    bestFor: 'Members raising libido concerns with a prescriber.',
    benefits: [
      'Acts on desire pathways, not vascular ones',
      'Works centrally via melanocortin receptors',
      'Studied in both men and women',
      'Used as-needed, not daily',
    ],
    whatsIncluded: [
      'A 12-week supply of compounded PT-141 (as-needed dosing)',
      'Insulin syringes (30G)',
      'Alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: 'As-needed dosing · 12-week supply',
    pricing: { monthly: 200, quarterly: 550, annual: 1940 },
    swatch: 'linear-gradient(180deg, #4a5042 0%, #000000 100%)',
    image: '/images/8.jpg',
    gallery: ['/images/8.jpg', '/images/7.jpg', '/images/9.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Nausea (most common, dose-related)',
      'Facial flushing',
      'Headache',
      'Temporary rise in blood pressure',
      'Injection-site reactions',
      'Darkening of skin or freckles with frequent use',
    ],
    contraindications: [
      'Uncontrolled hypertension or known cardiovascular disease',
      'Pregnancy or breastfeeding',
      'History of melanoma or numerous atypical moles',
      'Concurrent use of nitrates',
    ],
  },

  // ============ LONGEVITY & SKIN ============
  {
    id: 'epitalon',
    name: 'Epitalon',
    tagline: 'Telomere Support',
    category: 'longevity',
    shortDescription:
      'A four-amino acid peptide studied for telomerase activation and pineal-gland support.',
    longDescription:
      'Epitalon (Epithalon) is a tetrapeptide developed at the St. Petersburg Institute of Bioregulation and Gerontology. Long-running Russian studies have examined it for telomerase activity and sleep architecture. That work is early, largely from a single research group, and has not been replicated at scale in the West — treat the evidence as preliminary rather than settled. Cycles are short. Three weeks. Repeated 2–3 times per year.',
    bestFor: 'Members 45+ focused on long-horizon longevity protocols.',
    benefits: [
      'Studied for telomerase activation',
      'Studied for melatonin rhythm via the pineal gland',
      'Short, intermittent dosing cycles',
      'Well-tolerated profile',
    ],
    whatsIncluded: [
      '3-week loading cycle, repeated quarterly',
      'Compounded Epitalon (10 mg/day SQ for 21 days)',
      'Insulin syringes + alcohol prep pads',
      'Protocol check-in before each cycle',
    ],
    delivery: 'sq',
    cycleLength: '3-week cycle · quarterly',
    pricing: { monthly: 160, quarterly: 440, annual: 1560 },
    swatch: 'linear-gradient(180deg, #3a4e48 0%, #000000 100%)',
    image: '/images/10.jpg',
    gallery: ['/images/10.jpg', '/images/1.jpg', '/images/14.jpg'],
    requiresReview: true,
    sideEffects: [
      'Injection-site irritation',
      'Mild drowsiness',
      'Headache',
      'Changes to sleep pattern in the first week',
    ],
    contraindications: [
      'Active malignancy',
      'Pregnancy or breastfeeding',
      'Known hypersensitivity to the peptide',
    ],
  },
];

/** Look up by id (slug). */
export function getShopProduct(id: string): ShopProduct | null {
  return SHOP_PRODUCTS.find((p) => p.id === id) ?? null;
}

/** Other products in the same category, excluding the given one. */
export function getRelatedProducts(p: ShopProduct, limit = 3): ShopProduct[] {
  return SHOP_PRODUCTS.filter(
    (x) => x.id !== p.id && x.category === p.category
  ).slice(0, limit);
}

/** Cadence helper. Return per-month price and discount label. */
export interface CadenceTier {
  key: 'monthly' | 'quarterly' | 'annual' | 'once';
  label: string;
  description: string;
  total: number;
  perMonth: number;
  saveLabel?: string;
}

export function cadenceTiersForProduct(p: ShopProduct): CadenceTier[] {
  const m = p.pricing.monthly;
  const q = p.pricing.quarterly;
  const a = p.pricing.annual;
  const qPerMonth = Math.round(q / 3);
  const aPerMonth = Math.round(a / 12);
  const qSave = Math.round((1 - q / (m * 3)) * 100);
  const aSave = Math.round((1 - a / (m * 12)) * 100);
  return [
    {
      key: 'monthly',
      label: 'Monthly',
      description: 'Billed every month · Cancel anytime',
      total: m,
      perMonth: m,
    },
    {
      key: 'quarterly',
      label: 'Quarterly',
      description: 'Billed every 3 months · Cancel between cycles',
      total: q,
      perMonth: qPerMonth,
      saveLabel: qSave > 0 ? `Save ${qSave}%` : undefined,
    },
    {
      key: 'annual',
      label: 'Annual',
      description: 'Billed once a year · Best value',
      total: a,
      perMonth: aPerMonth,
      saveLabel: aSave > 0 ? `Save ${aSave}%` : undefined,
    },
    {
      key: 'once',
      label: 'One-time purchase',
      description: 'Single order · No subscription',
      // ponytail: flat $20 premium over the monthly rate, mirroring the
      // competitor's spread; tune per-product if merch wants finer control.
      total: m + 20,
      perMonth: m + 20,
    },
  ];
}

/**
 * Products listed on the PUBLIC storefront (/shop).
 *
 * The whole catalog is public — the products underwriting flagged as
 * prohibited were removed from the catalog entirely rather than hidden, so
 * there is nothing left to gate. `fdaApproved` is kept as a display badge,
 * not as a visibility filter.
 */
export const PUBLIC_PRODUCTS: ShopProduct[] = SHOP_PRODUCTS;

/** Categories that still have at least one product on the public storefront. */
export const PUBLIC_CATEGORIES = SHOP_CATEGORIES.filter((c) =>
  PUBLIC_PRODUCTS.some((p) => p.category === c.key)
);
