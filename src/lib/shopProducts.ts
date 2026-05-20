/**
 * Member-shop catalog. Individual peptides offered as standalone
 * subscriptions, separate from the 4 signature protocols. This is what
 * /portal/shop displays.
 *
 * Subscription-only. No one-time purchases. Each product has three cadences:
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
  { key: 'metabolic', label: 'Metabolic' },
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
  /** Whether physician review is required (always true for prescription peptides). */
  requiresReview: true;
  /** Optional "popular" badge */
  popular?: boolean;
}

export const SHOP_PRODUCTS: ShopProduct[] = [
  // ============ RECOVERY ============
  {
    id: 'bpc-157',
    name: 'BPC-157',
    tagline: 'Tissue Repair & Recovery',
    category: 'recovery',
    shortDescription:
      'A 15-amino acid peptide that accelerates soft-tissue healing. Tendons, ligaments, and gut lining.',
    longDescription:
      'BPC-157 (Body Protection Compound) upregulates growth-factor signaling at the site of injury, accelerates angiogenesis, and modulates inflammation. Strong preclinical evidence for tendon, ligament, and GI repair. Most members run an 8–12 week cycle, then take 4 weeks off before re-evaluating.',
    bestFor: 'Active members recovering from training, surgery, or chronic joint pain.',
    benefits: [
      'Faster tendon and ligament healing',
      'Reduced inflammation at injury sites',
      'GI tract repair (esp. NSAID-related damage)',
      'Improved joint mobility',
    ],
    whatsIncluded: [
      '12 weeks of compounded BPC-157 (250 mcg/day SQ)',
      'Insulin syringes (1/2 cc, 31G)',
      'Alcohol prep pads',
      'Sharps container',
      'Physician check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 160, quarterly: 420, annual: 1480 },
    swatch: 'linear-gradient(180deg, #1a4a3e 0%, #000000 100%)',
    image: '/images/11.jpg',
    gallery: ['/images/11.jpg', '/images/13.jpg', '/images/14.jpg', '/images/9.jpg'],
    requiresReview: true,
    popular: true,
  },
  {
    id: 'tb-500',
    name: 'TB-500',
    tagline: 'Deep Tissue Regeneration',
    category: 'recovery',
    shortDescription:
      'Thymosin Beta-4 fragment that drives cell migration to injured tissue. Often stacked with BPC-157.',
    longDescription:
      'TB-500 mobilizes stem cells to areas of injury and accelerates the formation of new blood vessels. It pairs naturally with BPC-157 for compounded recovery effect across muscle, tendon, and skin. Most members run it for an 8-week loading phase followed by maintenance dosing.',
    bestFor: 'Athletes with chronic soft-tissue issues, post-surgical recovery, or stalled healing.',
    benefits: [
      'Accelerates muscle and tendon healing',
      'Reduces scar tissue formation',
      'Increases vascular endothelial growth factor',
      'Synergizes with BPC-157',
    ],
    whatsIncluded: [
      '12 weeks of compounded TB-500 (2 mg/week SQ)',
      'Insulin syringes',
      'Reconstitution diluent',
      'Alcohol prep pads',
      'Physician check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 180, quarterly: 480, annual: 1700 },
    swatch: 'linear-gradient(180deg, #1e4d4a 0%, #000000 100%)',
    image: '/images/13.jpg',
    gallery: ['/images/13.jpg', '/images/11.jpg', '/images/14.jpg', '/images/9.jpg'],
    requiresReview: true,
  },
  {
    id: 'ghk-cu',
    name: 'GHK-Cu',
    tagline: 'Skin & Connective Tissue',
    category: 'recovery',
    shortDescription:
      'Copper-tripeptide that signals tissue remodeling. Excellent for skin, hair, and connective tissue.',
    longDescription:
      'GHK-Cu is a naturally occurring copper-binding tripeptide. Its levels decline sharply with age; restoring them activates wound healing, collagen synthesis, and antioxidant defense. Works systemically (SQ) or as a topical for skin-focused use.',
    bestFor: 'Members focused on skin quality, hair health, or visible signs of aging.',
    benefits: [
      'Increases collagen and elastin synthesis',
      'Improves skin firmness and texture',
      'Supports hair follicle health',
      'Antioxidant and anti-inflammatory action',
    ],
    whatsIncluded: [
      '12 weeks of compounded GHK-Cu (2 mg/week SQ)',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Physician check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 140, quarterly: 380, annual: 1340 },
    swatch: 'linear-gradient(180deg, #2a5048 0%, #000000 100%)',
    image: '/images/14.jpg',
    gallery: ['/images/14.jpg', '/images/13.jpg', '/images/11.jpg', '/images/9.jpg'],
    requiresReview: true,
  },

  // ============ GROWTH HORMONE ============
  {
    id: 'cjc-ipamorelin',
    name: 'CJC-1295 / Ipamorelin',
    tagline: 'Pulsatile GH Release',
    category: 'growth',
    shortDescription:
      'The clean GH-axis stack. Pulsatile release that mimics a healthy 25-year-old without elevating cortisol.',
    longDescription:
      'CJC-1295 is a GHRH analog that extends growth-hormone pulses; Ipamorelin is a ghrelin mimetic that triggers them. Combined, they produce sustained IGF-1 increases and improved recovery, sleep, and body composition. Without the prolactin or cortisol shifts seen with other secretagogues.',
    bestFor: 'Members 30+ optimizing recovery, sleep depth, and lean body composition.',
    benefits: [
      'Increased IGF-1 and sustained GH AUC',
      'Deeper sleep, especially slow-wave sleep',
      'Improved body composition over the cycle',
      'No cortisol or prolactin elevation',
    ],
    whatsIncluded: [
      '12 weeks of CJC-1295 (100 mcg/day) + Ipamorelin (200 mcg/day)',
      'Bacteriostatic water',
      'Insulin syringes (30G)',
      'Alcohol prep pads',
      'Mid-cycle physician check-in',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 240, quarterly: 660, annual: 2340 },
    swatch: 'linear-gradient(180deg, #3a5a4e 0%, #000000 100%)',
    image: '/images/9.jpg',
    gallery: ['/images/9.jpg', '/images/11.jpg', '/images/13.jpg', '/images/14.jpg'],
    requiresReview: true,
    popular: true,
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
      'Increases natural GH release',
      'Improves sleep quality',
      'Supports lean mass over time',
      'Shorter half-life reduces side-effect risk',
    ],
    whatsIncluded: [
      '12 weeks of compounded Sermorelin (300 mcg/night SQ)',
      'Bacteriostatic water',
      'Insulin syringes',
      'Alcohol prep pads',
      'Physician check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 180, quarterly: 490, annual: 1740 },
    swatch: 'linear-gradient(180deg, #2e5048 0%, #000000 100%)',
    image: '/images/7.jpg',
    gallery: ['/images/7.jpg', '/images/8.jpg', '/images/9.jpg', '/images/13.jpg'],
    requiresReview: true,
  },
  {
    id: 'tesamorelin',
    name: 'Tesamorelin',
    tagline: 'Visceral Fat Reduction',
    category: 'growth',
    shortDescription:
      'FDA-approved GHRH analog with the strongest human data for reducing visceral adipose tissue.',
    longDescription:
      'Tesamorelin is the GHRH analog with the strongest clinical record for reducing visceral fat in middle-aged adults. Originally FDA-approved for HIV-related lipodystrophy, it has well-documented off-label efficacy with measurable improvements in lipid profile and waist circumference over 12–24 weeks.',
    bestFor: 'Members 40+ with stubborn visceral fat or metabolic-syndrome flags on labs.',
    benefits: [
      'Reduces visceral adipose tissue',
      'Improves triglycerides and HDL',
      'Increases IGF-1 sustainably',
      'Strong human RCT evidence',
    ],
    whatsIncluded: [
      '16 weeks of compounded Tesamorelin (1 mg/day SQ)',
      'Bacteriostatic water',
      'Insulin syringes',
      'Alcohol prep pads',
      'Two physician check-ins (week 6 + week 12)',
      'Mid-cycle metabolic labs',
    ],
    delivery: 'sq',
    cycleLength: '16-week cycle',
    pricing: { monthly: 320, quarterly: 870, annual: 3080 },
    swatch: 'linear-gradient(180deg, #4a604e 0%, #000000 100%)',
    image: '/images/8.jpg',
    gallery: ['/images/8.jpg', '/images/7.jpg', '/images/11.jpg', '/images/14.jpg'],
    requiresReview: true,
  },

  // ============ METABOLIC ============
  {
    id: 'semaglutide',
    name: 'Semaglutide',
    tagline: 'GLP-1 Metabolic Reset',
    category: 'metabolic',
    shortDescription:
      'The original GLP-1 RA. Average 15% body-weight reduction with sustained insulin-sensitivity gains.',
    longDescription:
      'Semaglutide is a GLP-1 receptor agonist with extensive Phase 3 evidence for weight reduction, glycemic control, and cardiovascular risk reduction. We pair it with muscle-preserving peptides on physician request to protect lean mass during weight loss.',
    bestFor: 'Members with elevated BMI, prediabetes, or insulin resistance.',
    benefits: [
      'Mean 15% body-weight reduction at 68 weeks',
      'Sustained insulin sensitivity',
      'Reduced appetite and food noise',
      'Cardiovascular risk reduction',
    ],
    whatsIncluded: [
      '12 weeks of compounded Semaglutide (0.25–2.4 mg/week SQ, titrated)',
      'Insulin syringes',
      'Alcohol prep pads',
      'Anti-nausea support if needed',
      'Mid-cycle physician check-in + side-effect review',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 280, quarterly: 770, annual: 2720 },
    swatch: 'linear-gradient(180deg, #3e5a52 0%, #000000 100%)',
    image: '/images/12.jpg',
    gallery: ['/images/12.jpg', '/images/9.jpg', '/images/11.jpg', '/images/7.jpg'],
    requiresReview: true,
    popular: true,
  },
  {
    id: 'tirzepatide',
    name: 'Tirzepatide',
    tagline: 'Dual GIP/GLP-1 Agonist',
    category: 'metabolic',
    shortDescription:
      'The strongest GLP-1 class agent. Up to 22% mean body-weight reduction in Phase 3 trials.',
    longDescription:
      'Tirzepatide activates both GIP and GLP-1 receptors, producing greater weight loss and glycemic control than GLP-1-only agents. Phase 3 SURMOUNT trials show 20–22% mean body-weight reduction at 72 weeks. Titrated slowly to minimize GI side effects.',
    bestFor: 'Members who need stronger metabolic intervention than GLP-1 alone provides.',
    benefits: [
      '20–22% mean body-weight reduction',
      'Superior glycemic control vs GLP-1 alone',
      'Reduced visceral fat',
      'Sustained appetite regulation',
    ],
    whatsIncluded: [
      '12 weeks of compounded Tirzepatide (2.5–15 mg/week SQ, titrated)',
      'Insulin syringes',
      'Alcohol prep pads',
      'Anti-nausea support if needed',
      'Mid-cycle physician check-in + labs',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 360, quarterly: 990, annual: 3500 },
    swatch: 'linear-gradient(180deg, #4e6258 0%, #000000 100%)',
    image: '/images/5.jpg',
    gallery: ['/images/5.jpg', '/images/6.jpg', '/images/9.jpg', '/images/11.jpg'],
    requiresReview: true,
  },

  // ============ COGNITIVE ============
  {
    id: 'selank',
    name: 'Selank',
    tagline: 'Calm Focus, No Sedation',
    category: 'cognitive',
    shortDescription:
      'A nasal peptide that reduces anxiety and improves working memory without sedation or dependence.',
    longDescription:
      'Selank is a synthetic analog of tuftsin. Russian research shows anxiolytic effects comparable to benzodiazepines with no sedation, no tolerance, and no withdrawal. Members report calmer focus and better stress tolerance within the first two weeks.',
    bestFor: 'Members with high-stress work demands looking for cognitive support without sedation.',
    benefits: [
      'Reduces anxiety without sedation',
      'Improves working memory',
      'Supports BDNF expression',
      'No tolerance or withdrawal',
    ],
    whatsIncluded: [
      '12 weeks of Selank nasal spray (250 mcg/spray, 2 sprays/day)',
      'Spare nozzle',
      'Physician check-in at week 6',
    ],
    delivery: 'nasal',
    cycleLength: '12-week cycle',
    pricing: { monthly: 120, quarterly: 330, annual: 1170 },
    swatch: 'linear-gradient(180deg, #2a4a48 0%, #000000 100%)',
    image: '/images/6.jpg',
    gallery: ['/images/6.jpg', '/images/5.jpg', '/images/7.jpg', '/images/11.jpg'],
    requiresReview: true,
  },
  {
    id: 'semax',
    name: 'Semax',
    tagline: 'Cognitive Performance',
    category: 'cognitive',
    shortDescription:
      'ACTH fragment with stimulant-like cognitive effects. Without the crash or dependency.',
    longDescription:
      'Semax is a heptapeptide derived from ACTH (4-10). Originally developed in Russia for stroke recovery, it has gained traction as a cognitive enhancer. Members report sustained focus, faster recall, and improved verbal fluency. Best taken in the morning to avoid sleep interference.',
    bestFor: 'Members in demanding mental work who want focus without stimulant side effects.',
    benefits: [
      'Improves attention and working memory',
      'Increases BDNF and NGF',
      'No stimulant side-effect profile',
      'Used in stroke recovery clinical settings',
    ],
    whatsIncluded: [
      '12 weeks of Semax nasal spray (300 mcg/spray, 2 sprays/day AM)',
      'Spare nozzle',
      'Physician check-in at week 6',
    ],
    delivery: 'nasal',
    cycleLength: '12-week cycle',
    pricing: { monthly: 140, quarterly: 380, annual: 1340 },
    swatch: 'linear-gradient(180deg, #2e4e4e 0%, #000000 100%)',
    image: '/images/1.jpg',
    gallery: ['/images/1.jpg', '/images/7.jpg', '/images/8.jpg', '/images/6.jpg'],
    requiresReview: true,
  },

  // ============ SEXUAL HEALTH ============
  {
    id: 'pt-141',
    name: 'PT-141',
    tagline: 'Libido & Arousal',
    category: 'sexual',
    shortDescription:
      'A melanocortin-receptor agonist that acts on the CNS to restore libido in both men and women.',
    longDescription:
      'PT-141 (Bremelanotide) works through the central melanocortin system. Not the vascular pathway that PDE-5 inhibitors target. That means it addresses desire itself, not just function. FDA-approved as Vyleesi for premenopausal women; well-documented off-label use in men.',
    bestFor: 'Members experiencing reduced libido that conventional approaches have not addressed.',
    benefits: [
      'Increases sexual desire (not just performance)',
      'Works centrally via melanocortin receptors',
      'Effective in both men and women',
      'Used as-needed, not daily',
    ],
    whatsIncluded: [
      'A 12-week supply of compounded PT-141 (as-needed dosing)',
      'Insulin syringes (30G)',
      'Alcohol prep pads',
      'Physician check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: 'As-needed dosing · 12-week supply',
    pricing: { monthly: 200, quarterly: 550, annual: 1940 },
    swatch: 'linear-gradient(180deg, #4a5042 0%, #000000 100%)',
    image: '/images/8.jpg',
    gallery: ['/images/8.jpg', '/images/7.jpg', '/images/2.jpg', '/images/9.jpg'],
    requiresReview: true,
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
      'Epitalon (Epithalon) is a tetrapeptide developed at the St. Petersburg Institute of Bioregulation and Gerontology. Long-running Russian studies report telomere lengthening, improved sleep architecture, and immune support. Cycles are short. Three weeks. Repeated 2–3 times per year.',
    bestFor: 'Members 45+ focused on long-horizon longevity protocols.',
    benefits: [
      'Studied for telomerase activation',
      'Supports melatonin rhythm via pineal gland',
      'Short, intermittent dosing cycles',
      'Well-tolerated profile',
    ],
    whatsIncluded: [
      '3-week loading cycle, repeated quarterly',
      'Compounded Epitalon (10 mg/day SQ for 21 days)',
      'Insulin syringes + alcohol prep pads',
      'Physician check-in before each cycle',
    ],
    delivery: 'sq',
    cycleLength: '3-week cycle · quarterly',
    pricing: { monthly: 160, quarterly: 440, annual: 1560 },
    swatch: 'linear-gradient(180deg, #3a4e48 0%, #000000 100%)',
    image: '/images/10.jpg',
    gallery: ['/images/10.jpg', '/images/2.jpg', '/images/1.jpg', '/images/14.jpg'],
    requiresReview: true,
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
  key: 'monthly' | 'quarterly' | 'annual';
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
  ];
}
