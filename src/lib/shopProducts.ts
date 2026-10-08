/**
 * Member-shop catalog. Individual peptides offered as standalone
 * subscriptions, separate from the 4 signature protocols. This is what
 * /shop displays.
 *
 * Sold as a subscription (1, 3 or 6-month plans, per the Product & Pricing
 * Plan) or a one-time purchase.
 */

import { shippingPriceFor } from './shipping';

export type ShopCategory =
  | 'recovery'
  | 'growth'
  | 'metabolic'
  | 'cognitive'
  | 'sexual'
  | 'longevity'
  | 'immune'
  | 'skin-hair';

export const SHOP_CATEGORIES: { key: ShopCategory; label: string }[] = [
  { key: 'recovery', label: 'Recovery & repair' },
  { key: 'growth', label: 'Growth hormone' },
  { key: 'cognitive', label: 'Cognitive' },
  { key: 'sexual', label: 'Sexual health' },
  { key: 'immune', label: 'Immune support' },
  { key: 'skin-hair', label: 'Skin & hair' },
  { key: 'longevity', label: 'Longevity' },
  { key: 'metabolic', label: 'Weight management' },
];

export type DeliveryForm = 'sq' | 'im' | 'oral' | 'nasal' | 'topical';

export const DELIVERY_LABEL: Record<DeliveryForm, string> = {
  sq: 'Subcutaneous',
  im: 'Intramuscular',
  oral: 'Oral',
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
  /**
   * How it's kept: 'refrigerated' ships cold-chain, 'room' doesn't. Unset
   * (new admin products, or unsure) reads "Store as directed on the label".
   */
  storage?: 'refrigerated' | 'room';
  /**
   * Offer the 12-month plan (Admin → Products). Unset falls back to
   * TWELVE_MONTH_PLAN, the oral solids it was launched on.
   */
  twelveMonthPlan?: boolean;
  /** Human-readable cycle, e.g. "12-week cycle" */
  cycleLength: string;
  /** Whole-dollar totals per billing cycle. Per-month prices derive from these. */
  pricing: {
    monthly: number; // billed monthly
    quarterly: number; // billed every 3 months: 3 × the plan's 3-month rate
    /**
     * Billed every 6 months: 6 × the plan's 6-month rate. Optional because
     * admin rows saved before it existed carry no value; without it the
     * product simply has no 6-month plan.
     */
    sixMonth?: number;
    /**
     * Billed every 12 months: 12 × the plan's 12-month rate. Offered only
     * where offersTwelveMonth(product) is true; stored but unused elsewhere.
     */
    annual: number;
  };
  /** Background swatch gradient for the card hero */
  swatch: string;
  /** Image used in card + gallery hero */
  image: string;
  /** True when image is a clean product render: shown undimmed, no text over it. */
  shot?: boolean;
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
   * storefront at /shop.
   */
  fdaApproved?: boolean;
}

export const SHOP_PRODUCTS: ShopProduct[] = [
  // ============ RECOVERY ============
  {
    id: 'ghk-cu',
    name: 'GHK-Cu',
    tagline: 'Skin & Connective Tissue',
    category: 'skin-hair',
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
    pricing: { monthly: 199, quarterly: 540, annual: 1910 },
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
    pricing: { monthly: 269, quarterly: 730, annual: 2580 },
    swatch: 'linear-gradient(180deg, #3a5a4e 0%, #000000 100%)',
    image: '/images/9.jpg',
    gallery: ['/images/9.jpg', '/images/11.jpg', '/images/13.jpg', '/images/14.jpg'],
    requiresReview: true,
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
    pricing: { monthly: 149, quarterly: 387, sixMonth: 690, annual: 1380 },
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
    pricing: { monthly: 329, quarterly: 890, annual: 3160 },
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
      'A peptide studied for stress tolerance and working memory, without sedation or dependence.',
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
      '12 weeks of compounded Selank (2 mg/mL, 5 mL vial)',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 179, quarterly: 490, annual: 1720 },
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
      '12 weeks of compounded Semax (2 mg/mL, 5 mL vial)',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 179, quarterly: 490, annual: 1720 },
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
    tagline: 'Supports Healthy Desire',
    category: 'sexual',
    shortDescription:
      'Bremelanotide, a peptide that acts on melanocortin receptors in the brain rather than on blood flow. Used as needed.',
    longDescription:
      'PT-141 (bremelanotide) is a synthetic peptide that works through the central melanocortin system rather than the vascular pathway PDE-5 inhibitors target. Bremelanotide is FDA-approved for one specific indication in a defined group of women; what we dispense is a compounded preparation, which is not FDA-approved, and use in men is off-label. Whether it is appropriate for you is a question for your prescriber.',
    bestFor: 'Adults exploring sexual wellness with a prescriber.',
    benefits: [
      'Acts on desire pathways, not vascular ones',
      'Works centrally via melanocortin receptors',
      'Studied in both men and women',
      'Used as-needed, not daily',
    ],
    whatsIncluded: [
      'Compounded PT-141 for as-needed use, enough to last until your next shipment',
      'Insulin syringes (30G)',
      'Alcohol prep pads',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'sq',
    cycleLength: 'As-needed dosing',
    pricing: { monthly: 219, quarterly: 591, sixMonth: 1050, annual: 2340 },
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
    pricing: { monthly: 199, quarterly: 540, annual: 1910 },
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
  // ============ ADDED FROM THE KADUCEUS CATALOGUE ============
  // Every SKU below is a line item our pharmacy actually compounds. Copy is
  // written hedged from the start — see the claims pass in git history.
  {
    id: 'bpc-157',
    name: 'BPC-157',
    tagline: 'Tissue Repair',
    category: 'recovery',
    shortDescription:
      'A gastric pentadecapeptide, and the most-requested recovery peptide in the category.',
    longDescription:
      'BPC-157 is a synthetic fragment of a protein found in gastric juice. Animal research has studied it extensively for connective-tissue and gut-lining repair; controlled human trials are limited, so treat the evidence as promising rather than established. Offered here for recovery support in healthy adults, not to treat any injury or diagnosed condition.',
    bestFor: 'Members training hard who want recovery support between cycles.',
    benefits: [
      'Studied for tendon and ligament repair',
      'Studied for gut-lining integrity',
      'Commonly stacked with TB-500',
      'Well tolerated in reported use',
    ],
    whatsIncluded: [
      '12 weeks of compounded BPC-157 (2 mg/mL, 5 mL vial)',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 229, quarterly: 620, annual: 2200 },
    swatch: 'linear-gradient(180deg, #2f4a5a 0%, #000000 100%)',
    image: '/images/8.jpg',
    gallery: ['/images/8.jpg', '/images/12.jpg', '/images/10.jpg', '/images/5.jpg'],
    requiresReview: true,
    sideEffects: [
      'Injection-site redness or soreness',
      'Mild nausea in the first week',
      'Headache',
      'Transient fatigue',
    ],
    contraindications: [
      'Active malignancy or history of cancer within five years',
      'Pregnancy or breastfeeding',
      'Known hypersensitivity to the preparation',
    ],
  },
  {
    id: 'tb-500',
    name: 'TB-500',
    tagline: 'Thymosin Beta-4',
    category: 'recovery',
    shortDescription:
      'A synthetic fragment of thymosin beta-4, studied for cell migration and tissue remodeling.',
    longDescription:
      'TB-500 is a synthetic peptide based on thymosin beta-4, a protein involved in actin regulation and cell migration. Preclinical work has studied it for soft-tissue remodelling; human data is thin. Frequently run alongside BPC-157 rather than alone. Offered for recovery support in healthy adults.',
    bestFor: 'Members stacking a recovery protocol, usually with BPC-157.',
    benefits: [
      'Studied for cell migration and tissue remodeling',
      'Studied for flexibility and range of motion',
      'Longer dosing interval than BPC-157',
      'Pairs with BPC-157 in most protocols',
    ],
    whatsIncluded: [
      '12 weeks of compounded TB-500 (2 mg/mL, 5 mL vial)',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 229, quarterly: 620, annual: 2200 },
    swatch: 'linear-gradient(180deg, #3a4a52 0%, #000000 100%)',
    image: '/images/12.jpg',
    gallery: ['/images/12.jpg', '/images/8.jpg', '/images/9.jpg', '/images/13.jpg'],
    requiresReview: true,
    sideEffects: [
      'Injection-site redness or soreness',
      'Temporary lethargy in the first days',
      'Head-rush sensation shortly after dosing',
      'Headache',
    ],
    contraindications: [
      'Active malignancy or history of cancer within five years',
      'Pregnancy or breastfeeding',
      'Known hypersensitivity to the preparation',
    ],
  },
  {
    id: 'bpc-tb500',
    name: 'BPC-157 / TB-500',
    tagline: 'The Recovery Stack',
    category: 'recovery',
    shortDescription:
      'Both recovery peptides in a single compounded vial. One injection instead of two.',
    longDescription:
      'The pairing most members ask for, compounded together so a cycle is one vial and one daily injection rather than two of each. The evidence base is the same as for the two peptides individually — largely preclinical, promising, and not a substitute for rest or rehabilitation directed by your own clinician.',
    bestFor: 'Members who want the full recovery protocol without stacking two vials.',
    benefits: [
      'Both peptides in one compounded vial',
      'One injection per dose instead of two',
      'Studied for connective tissue and gut lining',
      'The most-requested combination in the category',
    ],
    whatsIncluded: [
      '12 weeks of compounded BPC-157 / TB-500 (5 mg / 5 mg, 5 mL vial)',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 269, quarterly: 730, annual: 2580 },
    swatch: 'linear-gradient(180deg, #2a5058 0%, #000000 100%)',
    image: '/images/10.jpg',
    gallery: ['/images/10.jpg', '/images/8.jpg', '/images/12.jpg', '/images/11.jpg'],
    requiresReview: true,
    sideEffects: [
      'Injection-site redness or soreness',
      'Mild nausea in the first week',
      'Temporary lethargy',
      'Headache',
    ],
    contraindications: [
      'Active malignancy or history of cancer within five years',
      'Pregnancy or breastfeeding',
      'Known hypersensitivity to either peptide',
    ],
  },
  {
    id: 'nad-plus',
    name: 'NAD+',
    tagline: 'Supports Cellular Energy',
    category: 'longevity',
    shortDescription:
      'The coenzyme central to mitochondrial energy metabolism. Levels fall with age.',
    longDescription:
      'NAD+ is a coenzyme present in every cell and required for mitochondrial energy production and normal DNA-maintenance signalling. Tissue levels decline with age, and supplementation is an active research area — although how much subcutaneous dosing raises intracellular NAD+ in humans is still debated. Offered for energy and longevity support in healthy adults.',
    bestFor: 'Adults discussing energy and healthy ageing with a prescriber.',
    benefits: [
      'Central to mitochondrial energy metabolism',
      'Studied for normal DNA-maintenance signalling',
      'Subcutaneous dosing, no infusion appointment',
      'Can be prescribed alongside glutathione',
    ],
    whatsIncluded: [
      'Compounded NAD+ (200 mg/mL, 5 mL vials), enough to last until your next shipment',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'sq',
    cycleLength: 'Schedule set by your prescriber',
    pricing: { monthly: 149, quarterly: 402, sixMonth: 714, annual: 1620 },
    swatch: 'linear-gradient(180deg, #3d4560 0%, #000000 100%)',
    image: '/images/5.jpg',
    gallery: ['/images/5.jpg', '/images/9.jpg', '/images/14.jpg', '/images/7.jpg'],
    requiresReview: true,
    sideEffects: [
      'Injection-site stinging — common, and dose-rate dependent',
      'Flushing or warmth shortly after dosing',
      'Nausea or chest tightness if dosed too quickly',
      'Headache',
    ],
    contraindications: [
      'Pregnancy or breastfeeding',
      'Active malignancy',
      'Known hypersensitivity to the preparation',
    ],
  },
  {
    id: 'thymosin-alpha-1',
    name: 'Thymosin Alpha-1',
    tagline: 'Immune Modulation',
    category: 'immune',
    shortDescription:
      'A thymic peptide studied for immune signalling. The most clinically documented peptide in this catalogue outside the GH axis.',
    longDescription:
      'Thymosin alpha-1 is a 28-amino-acid peptide produced by the thymus. It is approved as a medicine in a number of countries outside the United States and has a substantial clinical literature; in the United States it is available only as a compounded preparation, which is not FDA-approved. Offered for immune support in healthy adults, not to treat any infection or immune disorder.',
    bestFor: 'Members 45+ adding immune support to a longevity protocol.',
    benefits: [
      'Studied for T-cell and immune signalling',
      'Substantial international clinical literature',
      'Twice-weekly dosing',
      'Commonly run seasonally rather than continuously',
    ],
    whatsIncluded: [
      '12 weeks of compounded Thymosin Alpha-1 (2 mg/mL, 5 mL vial)',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 199, quarterly: 540, annual: 1910 },
    swatch: 'linear-gradient(180deg, #46484f 0%, #000000 100%)',
    image: '/images/7.jpg',
    gallery: ['/images/7.jpg', '/images/13.jpg', '/images/11.jpg', '/images/1.jpg'],
    requiresReview: true,
    sideEffects: [
      'Injection-site redness or soreness',
      'Transient flu-like feeling after the first doses',
      'Fatigue',
      'Joint aches',
    ],
    contraindications: [
      'Organ transplant, or any immunosuppressive therapy',
      'Autoimmune disease — the mechanism is immune stimulation',
      'Pregnancy or breastfeeding',
      'Known hypersensitivity to the preparation',
    ],
  },
  {
    id: 'glutathione',
    name: 'Glutathione',
    tagline: 'Antioxidant Tripeptide',
    category: 'longevity',
    shortDescription:
      'The tripeptide your cells use in their normal antioxidant defences. Produced naturally, and levels fall with age.',
    longDescription:
      'Glutathione is a tripeptide of glutamate, cysteine and glycine that every cell produces and uses in redox reactions and phase-II liver conjugation. Levels fall with age and sustained physical stress. How much injected glutathione raises intracellular levels in humans is still debated, and we make no skin-lightening claim of any kind — that use has drawn FDA warning letters and we do not offer it.',
    bestFor: 'Adults discussing oxidative stress and healthy ageing with a prescriber.',
    benefits: [
      'A tripeptide the body uses in its own antioxidant (redox) chemistry',
      'Supports the body’s normal antioxidant defences',
      'Subcutaneous dosing, no infusion appointment',
      'Commonly run alongside NAD+',
    ],
    whatsIncluded: [
      'Compounded Glutathione (200 mg/mL, 10 mL vials), enough to last until your next shipment',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'sq',
    cycleLength: 'Schedule set by your prescriber',
    pricing: { monthly: 149, quarterly: 402, sixMonth: 714, annual: 1308 },
    swatch: 'linear-gradient(180deg, #35555c 0%, #000000 100%)',
    image: '/images/9.jpg',
    gallery: ['/images/9.jpg', '/images/5.jpg', '/images/14.jpg', '/images/12.jpg'],
    requiresReview: true,
    sideEffects: [
      'Injection-site stinging or redness',
      'Transient headache',
      'Nausea',
      'Rash, uncommonly',
    ],
    contraindications: [
      'Asthma — bronchospasm has been reported with glutathione',
      'Pregnancy or breastfeeding',
      'Known sulfur or preparation hypersensitivity',
    ],
  },
  {
    id: 'mots-c',
    name: 'MOTS-c',
    tagline: 'Mitochondrial Signalling',
    category: 'longevity',
    shortDescription:
      'A peptide encoded in mitochondrial DNA rather than the nucleus. Studied for metabolic signalling.',
    longDescription:
      'MOTS-c is one of a small set of peptides encoded by the mitochondrial genome. Research has studied its role in metabolic regulation and exercise response, largely in animal models — human data is early. Offered for metabolic and longevity support in healthy adults, not to treat any metabolic condition.',
    bestFor: 'Members 40+ layering mitochondrial support onto an existing protocol.',
    benefits: [
      'Encoded in mitochondrial DNA, not the nucleus',
      'Studied for metabolic and exercise-response signalling',
      'Studied for insulin-sensitivity pathways',
      'Short course, run intermittently',
    ],
    whatsIncluded: [
      '12 weeks of compounded MOTS-c (2 mg/mL, 5 mL vial)',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 199, quarterly: 540, annual: 1910 },
    swatch: 'linear-gradient(180deg, #2f4f5f 0%, #000000 100%)',
    image: '/images/11.jpg',
    gallery: ['/images/11.jpg', '/images/9.jpg', '/images/13.jpg', '/images/8.jpg'],
    requiresReview: true,
    sideEffects: [
      'Injection-site redness or soreness',
      'Transient fatigue in the first week',
      'Headache',
      'Mild nausea',
    ],
    contraindications: [
      'Active malignancy',
      'Pregnancy or breastfeeding',
      'Known hypersensitivity to the preparation',
    ],
  },
  {
    id: 'kpv',
    name: 'KPV',
    tagline: 'Immune & Gut Signalling',
    category: 'immune',
    shortDescription:
      'A three–amino acid fragment of alpha-MSH. The smallest peptide in the catalogue.',
    longDescription:
      'KPV is the C-terminal tripeptide of alpha-melanocyte-stimulating hormone. Preclinical work has studied it for gut-lining and tissue signalling; human evidence is limited. Frequently run with BPC-157 in gut-focused protocols. Offered for general recovery support in healthy adults, not to treat any gastrointestinal or inflammatory condition.',
    bestFor: 'Members running a gut or immune protocol, often alongside BPC-157.',
    benefits: [
      'Studied for gut-lining signalling',
      'Studied for tissue and skin support',
      'Frequently stacked with BPC-157',
      'Well tolerated in reported use',
    ],
    whatsIncluded: [
      '12 weeks of compounded KPV (2 mg/mL, 5 mL vial)',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 179, quarterly: 490, annual: 1720 },
    swatch: 'linear-gradient(180deg, #3f4a44 0%, #000000 100%)',
    image: '/images/13.jpg',
    gallery: ['/images/13.jpg', '/images/8.jpg', '/images/10.jpg', '/images/7.jpg'],
    requiresReview: true,
    sideEffects: [
      'Injection-site redness or soreness',
      'Mild nausea',
      'Headache',
      'Transient flushing',
    ],
    contraindications: [
      'Active malignancy',
      'Pregnancy or breastfeeding',
      'Known hypersensitivity to the preparation',
    ],
  },
  {
    id: 'dsip',
    name: 'DSIP',
    tagline: 'Delta Sleep-Inducing Peptide',
    category: 'cognitive',
    shortDescription:
      'A nonapeptide studied for sleep architecture. Not a sedative, and not a sleeping pill.',
    longDescription:
      'DSIP is a nine–amino acid peptide first isolated from rabbit brain during slow-wave sleep. Research has studied it for sleep architecture and stress-hormone response; the literature is old, small, and mixed, and we would rather say so than oversell it. It is not a sedative, not a hypnotic, and not a treatment for insomnia or any sleep disorder — if you have one, see your own physician.',
    bestFor: 'Members with disrupted sleep who have already ruled out a sleep disorder.',
    benefits: [
      'Studied for slow-wave sleep architecture',
      'Studied for cortisol rhythm',
      'No sedation and no next-day hangover reported',
      'Dosed at night, short courses',
    ],
    whatsIncluded: [
      '12 weeks of compounded DSIP (2 mg/mL, 5 mL vial)',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 179, quarterly: 490, annual: 1720 },
    swatch: 'linear-gradient(180deg, #34405c 0%, #000000 100%)',
    image: '/images/6.jpg',
    gallery: ['/images/6.jpg', '/images/1.jpg', '/images/7.jpg', '/images/5.jpg'],
    requiresReview: true,
    sideEffects: [
      'Daytime drowsiness if dosed too late',
      'Vivid dreams',
      'Headache',
      'Injection-site redness',
    ],
    contraindications: [
      'Untreated sleep apnoea',
      'Concurrent sedatives, benzodiazepines, or other CNS depressants',
      'Pregnancy or breastfeeding',
      'Known hypersensitivity to the preparation',
    ],
  },
  {
    id: 'ipamorelin',
    name: 'Ipamorelin',
    tagline: 'Selective GH Secretagogue',
    category: 'growth',
    shortDescription:
      'The selective half of the standard GH stack, on its own. The gentlest entry to the category.',
    longDescription:
      'Ipamorelin is a ghrelin-receptor agonist that triggers a growth-hormone pulse without the prolactin, cortisol, or appetite effects seen with older secretagogues. Run alone it is the most conservative option in this category; most members eventually pair it with a GHRH analog such as CJC-1295 or sermorelin.',
    bestFor: 'Members wanting the lightest possible entry into the GH axis.',
    benefits: [
      'Studied for selective GH pulse without prolactin or cortisol shift',
      'The most conservative option in this category',
      'Stacks with CJC-1295 or sermorelin later',
      'Nightly dosing',
    ],
    whatsIncluded: [
      '12 weeks of compounded Ipamorelin (2 mg/mL, 5 mL vial)',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 179, quarterly: 490, annual: 1720 },
    swatch: 'linear-gradient(180deg, #3a4658 0%, #000000 100%)',
    image: '/images/14.jpg',
    gallery: ['/images/14.jpg', '/images/11.jpg', '/images/9.jpg', '/images/12.jpg'],
    requiresReview: true,
    sideEffects: [
      'Head-rush or flushing shortly after dosing',
      'Water retention in the first weeks',
      'Tingling or numbness in the hands',
      'Injection-site redness',
    ],
    contraindications: [
      'Active malignancy',
      'Uncontrolled diabetes or severe insulin resistance',
      'Untreated hypothyroidism',
      'Pregnancy or breastfeeding',
    ],
  },
  {
    id: 'klow',
    name: 'KLOW',
    tagline: 'The Four-Peptide Blend',
    category: 'skin-hair',
    shortDescription:
      'GHK-Cu, BPC-157, KPV and TB-500 compounded into one vial. The most complete recovery formulation we carry.',
    longDescription:
      'KLOW combines the four peptides most often run together for skin and connective-tissue support — GHK-Cu, BPC-157, KPV and TB-500 — in a single compounded vial. The evidence base is the same as for each component individually: largely preclinical and promising rather than settled. Offered for recovery and skin support in healthy adults, not to treat any condition.',
    bestFor: 'Members who want every recovery peptide in one vial and one injection.',
    benefits: [
      'Four peptides in a single compounded vial',
      'One injection instead of four',
      'Studied for connective tissue, gut lining and skin',
      'Cheaper than running the components separately',
    ],
    whatsIncluded: [
      '12 weeks of compounded KLOW (GHK-Cu 50 mg / BPC-157 10 mg / KPV 10 mg / TB-500 10 mg, 5 mL vial)',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 369, quarterly: 1000, annual: 3540 },
    swatch: 'linear-gradient(180deg, #2b5b52 0%, #000000 100%)',
    image: '/images/11.jpg',
    gallery: ['/images/11.jpg', '/images/10.jpg', '/images/8.jpg', '/images/14.jpg'],
    requiresReview: true,
    sideEffects: [
      'Injection-site redness, soreness, or a blue-green tint from the copper',
      'Mild nausea in the first week',
      'Temporary lethargy',
      'Headache',
    ],
    contraindications: [
      "Wilson's disease or any copper-metabolism disorder",
      'Active malignancy or history of cancer within five years',
      'Pregnancy or breastfeeding',
      'Known hypersensitivity to any of the four peptides',
    ],
  },

  // Drafts: copy written for Dr. Elder's review; flip to live in Admin → Products after sign-off.
  // ============ LONGEVITY (drafts) ============
  {
    id: 'nad-nasal',
    name: 'NAD+ Nasal Spray',
    tagline: 'NAD+ Without the Needle',
    category: 'longevity',
    shortDescription:
      'The same coenzyme as our NAD+ injection, in a nasal spray. No needles and nothing to reconstitute.',
    longDescription:
      'NAD+ is a coenzyme present in every cell and required for mitochondrial energy production and normal DNA-maintenance signalling. Tissue levels decline with age. This compounded nasal spray is an alternative to subcutaneous dosing for members who would rather not inject; how much intranasal NAD+ raises levels in the body is not well established, and human data on this route is limited. NAD+ is not an FDA-approved drug, and compounded preparations are not FDA-approved. Offered for energy and longevity support in healthy adults, not to treat any condition.',
    bestFor: 'Members who want NAD+ support without injections.',
    benefits: [
      'Central to mitochondrial energy metabolism',
      'Studied for normal DNA-maintenance signalling',
      'Needle-free dosing',
      'Nothing to reconstitute',
    ],
    whatsIncluded: [
      'One 10 mL bottle of compounded NAD+ Nasal Spray 3000 mg (300 mg/mL)',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'nasal',
    cycleLength: '30-day supply',
    pricing: { monthly: 151, quarterly: 408, sixMonth: 726, annual: 1068 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/nad-nasal.jpg',
    shot: true,
    gallery: ['/brand/products/nad-nasal.jpg'],
    requiresReview: true,
    fdaApproved: false,
    sideEffects: [
      'Nasal irritation, stinging or congestion',
      'Runny nose or sneezing',
      'Headache',
      'Flushing or warmth after dosing',
      'Mild nausea',
    ],
    contraindications: [
      'Pregnancy or breastfeeding',
      'Active malignancy',
      'Chronic nasal conditions or recent nasal surgery',
      'Known hypersensitivity to the preparation',
    ],
  },
  {
    id: 'mic-b12',
    name: 'MIC + B12',
    tagline: 'Vitamin B12 + Lipotropics',
    category: 'longevity',
    shortDescription:
      'Methionine, inositol and choline with vitamin B12, in a single intramuscular injection.',
    longDescription:
      'MIC + B12 combines three lipotropic nutrients (methionine, inositol and choline) with cyanocobalamin, a form of vitamin B12. Vitamin B12 is essential for red-blood-cell formation and nerve function, and an injection bypasses absorption in the gut. The combination is a compounded preparation, which is not FDA-approved, and the evidence for the lipotropic components is limited. Offered for energy support in healthy adults, not to treat any deficiency or condition.',
    bestFor: 'Members looking for energy support who are comfortable with a small injection.',
    benefits: [
      'Vitamin B12 is essential for red-blood-cell formation and nerve function',
      'Injection bypasses absorption in the gut',
      'Three lipotropic nutrients in the same vial',
      'Short, simple injection',
    ],
    whatsIncluded: [
      'One 10 mL vial of compounded MIC + B12 injection',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'im',
    cycleLength: '30-day supply',
    pricing: { monthly: 89, quarterly: 240, sixMonth: 426, annual: 708 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/mic-b12.jpg',
    shot: true,
    gallery: ['/brand/products/mic-b12.jpg'],
    requiresReview: true,
    fdaApproved: false,
    sideEffects: [
      'Injection-site pain, redness or swelling',
      'Mild, temporary diarrhea',
      'Itching or rash',
      'Headache',
    ],
    contraindications: [
      'Known hypersensitivity to cobalt or vitamin B12',
      "Leber's disease (hereditary optic nerve atrophy)",
      'Pregnancy or breastfeeding',
      'Kidney or liver disease, without prescriber clearance',
    ],
  },
  {
    id: 'methylene-blue',
    name: 'Methylene Blue',
    tagline: 'Focus & Cognitive Support',
    category: 'cognitive',
    shortDescription:
      'Low-dose methylene blue in a daily capsule. Studied for its role in mitochondrial energy production.',
    longDescription:
      'Methylene blue has been used in medicine for more than a century. It is FDA-approved as an intravenous injection for one specific indication; what we dispense is a compounded low-dose oral capsule, which is not FDA-approved, and use for focus or cognition is off-label. Laboratory and early human research has studied its role as an electron carrier in mitochondrial energy production. It interacts dangerously with many antidepressants, so tell your prescriber about every medication you take. Offered for cognitive support in healthy adults, not to treat any condition.',
    bestFor: 'Members exploring focus and cognitive support who are not taking serotonergic medicines.',
    benefits: [
      'Studied for mitochondrial electron transport',
      'Studied for attention and memory measures',
      'Low-dose daily capsule',
      'More than a century of medical use',
    ],
    whatsIncluded: [
      '30 capsules of compounded Methylene Blue 10 mg',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'oral',
    cycleLength: '30-day supply',
    pricing: { monthly: 95, quarterly: 258, sixMonth: 462, annual: 924 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/methylene-blue.jpg',
    shot: true,
    gallery: ['/brand/products/methylene-blue.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Blue-green urine, and sometimes blue-tinged stool or tongue (expected and temporary)',
      'Nausea or stomach upset',
      'Headache',
      'Dizziness',
      'Stinging on urination',
    ],
    contraindications: [
      'Taking SSRIs, SNRIs, MAOIs or other serotonergic medicines (risk of serotonin syndrome)',
      'G6PD deficiency',
      'Pregnancy or breastfeeding',
      'Severe kidney impairment',
      'Known hypersensitivity to methylene blue',
    ],
  },

  // ============ SEXUAL HEALTH (drafts) ============
  {
    id: 'sildenafil-tadalafil',
    name: 'Sildenafil + Tadalafil',
    tagline: 'Two PDE-5 Inhibitors, One Troche',
    category: 'sexual',
    shortDescription:
      'Sildenafil and tadalafil combined in a troche that dissolves under the tongue. Taken as needed.',
    longDescription:
      'Sildenafil and tadalafil are PDE-5 inhibitors and the active ingredients in FDA-approved prescription medicines for men’s sexual health. Sildenafil is shorter-acting; tadalafil lasts longer. This compounded sublingual troche combines the two. Its 120 mg of sildenafil is above the 100 mg maximum labelled single dose of FDA-approved sildenafil, and is used only if your prescriber decides it is appropriate for you. The combination is not FDA-approved, is prescribed off-label, and has far less published research than either medicine alone. Both work with sexual stimulation, not on their own. Whether it is appropriate for you, and at what dose, is a question for your prescriber.',
    bestFor: 'Men who want a single as-needed option to support sexual performance.',
    benefits: [
      'Two PDE-5 inhibitors in a single dose',
      'Pairs a shorter-acting and a longer-acting medicine',
      'Dissolves under the tongue, no water needed',
      'Taken as needed, not daily',
    ],
    whatsIncluded: [
      '8 sublingual troches a month of compounded Sildenafil + Tadalafil 120 mg / 22 mg',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'oral',
    cycleLength: 'As-needed dosing · 8 troches a month',
    pricing: { monthly: 49, quarterly: 132, sixMonth: 234, annual: 408 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/sildenafil-tadalafil.jpg',
    shot: true,
    gallery: ['/brand/products/sildenafil-tadalafil.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Headache',
      'Flushing',
      'Nasal congestion',
      'Indigestion or heartburn',
      'Back or muscle aches',
      'Dizziness or fainting from low blood pressure',
      'Rarely: an erection lasting more than 4 hours, or sudden vision or hearing loss (seek urgent care)',
    ],
    contraindications: [
      'Taking any nitrate medicine, or recreational "poppers"',
      'Taking riociguat',
      'Taking an alpha-blocker (for example, for prostate or blood pressure), or prone to low blood pressure: the combination can drop blood pressure sharply',
      'Heart disease where sexual activity is not advised',
      'Recent heart attack or stroke, or uncontrolled blood pressure',
      'Severe liver or kidney impairment',
      'Known hypersensitivity to sildenafil or tadalafil',
    ],
  },
  {
    id: 'sildenafil',
    name: 'Sildenafil',
    tagline: 'Supports Sexual Performance, As Needed',
    category: 'sexual',
    shortDescription:
      'Sildenafil 100 mg capsules, taken as needed about an hour before sexual activity.',
    longDescription:
      'Sildenafil is a PDE-5 inhibitor and the active ingredient in FDA-approved prescription medicines for men’s sexual health. It supports blood flow in response to sexual stimulation; it does not create arousal on its own. What we dispense is a compounded capsule, which is not FDA-approved. It is taken as needed, typically about an hour before sexual activity and no more than once a day. Whether it is appropriate for you, and at what dose, is a question for your prescriber.',
    bestFor: 'Men who want a well-studied, as-needed option to support sexual performance.',
    benefits: [
      'Studied in large clinical trials of sexual function in men',
      'Taken as needed, not daily',
      'Works with sexual stimulation, not on its own',
      'More than two decades of clinical use',
    ],
    whatsIncluded: [
      '8 capsules of compounded Sildenafil 100 mg',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'oral',
    cycleLength: 'As-needed dosing · 8 doses a month',
    pricing: { monthly: 38, quarterly: 102, sixMonth: 180, annual: 324 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/sildenafil.jpg',
    shot: true,
    gallery: ['/brand/products/sildenafil.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Headache',
      'Flushing',
      'Indigestion',
      'Nasal congestion',
      'Dizziness or fainting from low blood pressure',
      'Blue-tinged or blurred vision, uncommonly',
      'Rarely: an erection lasting more than 4 hours, or sudden vision or hearing loss (seek urgent care)',
    ],
    contraindications: [
      'Taking any nitrate medicine, or recreational "poppers"',
      'Taking riociguat',
      'Taking an alpha-blocker (for example, for prostate or blood pressure), or prone to low blood pressure: the combination can drop blood pressure sharply',
      'Heart disease where sexual activity is not advised',
      'Recent heart attack or stroke, or uncontrolled blood pressure',
      'Retinitis pigmentosa',
      'Known hypersensitivity to sildenafil',
    ],
  },
  {
    id: 'oxytocin',
    name: 'Oxytocin',
    tagline: 'Intimacy & Connection',
    category: 'sexual',
    shortDescription:
      'Oxytocin, a peptide hormone, in a rapid-dissolve tablet. Studied for its role in bonding, trust and social connection.',
    longDescription:
      'Oxytocin is a peptide hormone made in the hypothalamus and released during touch, intimacy and childbirth. It is FDA-approved as an injection for use in labor and delivery; what we dispense is a compounded rapid-dissolve tablet, which is not FDA-approved, and use for intimacy or connection is off-label. Research on oxytocin and social bonding is active but mixed, and results from small studies are not a promise of what you will experience. Offered for intimacy support in healthy adults, not to treat any condition.',
    bestFor: 'Adults exploring intimacy and connection support with a prescriber.',
    benefits: [
      'Studied for social bonding and trust',
      'Studied alongside intimacy and arousal',
      'Dissolves in the mouth, no injection',
      'Used as directed by your prescriber',
    ],
    whatsIncluded: [
      '30 rapid-dissolve tablets of compounded Oxytocin 50 IU',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'oral',
    cycleLength: '30-day supply',
    pricing: { monthly: 89, quarterly: 240, sixMonth: 426, annual: 744 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/oxytocin.jpg',
    shot: true,
    gallery: ['/brand/products/oxytocin.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Headache',
      'Nausea',
      'Mild dizziness',
      'Mouth irritation where the tablet dissolves',
      'Changes in mood, uncommonly',
    ],
    contraindications: [
      'Pregnancy, or possible pregnancy (oxytocin can cause uterine contractions)',
      'Breastfeeding',
      'Heart disease or a history of abnormal heart rhythm',
      'Low blood sodium, or conditions that cause fluid retention',
      'Known hypersensitivity to oxytocin',
    ],
  },

  // ============ HORMONES (drafts) ============
  {
    id: 'enclomiphene',
    name: 'Enclomiphene',
    tagline: 'Supports Healthy Testosterone in Men',
    category: 'longevity',
    shortDescription:
      'A daily capsule that supports the body’s own testosterone production, rather than replacing it.',
    longDescription:
      'Enclomiphene is one of the two isomers that make up clomiphene citrate. It acts on the pituitary to increase LH and FSH, the signals that tell the testes to make testosterone, and in clinical studies it raised testosterone while preserving sperm production, which testosterone replacement can suppress. It is not an FDA-approved drug; what we dispense is a compounded preparation. Offered to support healthy testosterone levels in men under prescriber supervision, not to diagnose, treat, cure or prevent any disease. Your prescriber decides whether it is appropriate for you, checks labs (testosterone, estradiol and others) before and during treatment, and long-term safety data are limited.',
    bestFor: 'Men who want to support their own testosterone production rather than replace it.',
    benefits: [
      'Supports the body’s own LH, FSH and testosterone signals',
      'Studied for preserving sperm production, unlike testosterone replacement',
      'Daily oral capsule, no injections',
      'Works with your own hormone axis',
    ],
    whatsIncluded: [
      '30 capsules of compounded Enclomiphene 12.5 mg',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'oral',
    cycleLength: '30-day supply',
    pricing: { monthly: 149, quarterly: 402, sixMonth: 714, annual: 1248 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/enclomiphene.jpg',
    shot: true,
    gallery: ['/brand/products/enclomiphene.jpg'],
    requiresReview: true,
    fdaApproved: false,
    sideEffects: [
      'Headache',
      'Hot flushes',
      'Nausea',
      'Mood changes or irritability',
      'Blurred vision or visual spots (stop and contact your prescriber)',
    ],
    contraindications: [
      'Liver disease',
      'Uncontrolled thyroid or adrenal disorders',
      'A pituitary tumor or other intracranial lesion',
      'Known hypersensitivity to clomiphene or enclomiphene',
    ],
  },
  {
    id: 'hrt-cream',
    name: 'Estradiol + Progesterone Cream',
    tagline: 'Supports Hormonal Balance in Midlife',
    category: 'longevity',
    shortDescription:
      'Estradiol and progesterone in a single cream, applied to the skin. Prescribed to support hormonal balance during midlife.',
    longDescription:
      'Estradiol and progesterone are the active ingredients in FDA-approved hormone therapies. What we dispense is a compounded cream combining the two, which is not FDA-approved, and compounded hormone products have not been reviewed by the FDA for safety, effectiveness or consistent dosing. Hormone therapy carries risks that depend on your age, time since menopause and health history, and FDA-approved estrogen products carry boxed warnings about stroke, blood clots, breast cancer and probable dementia. Your prescriber decides whether it is appropriate for you.',
    bestFor: 'Women in midlife discussing hormone therapy with a prescriber.',
    benefits: [
      'Estradiol supports hormonal balance during midlife',
      'Progesterone alongside estradiol, as is standard for women with a uterus',
      'Applied to the skin, no pills',
      'Dose set by your prescriber',
    ],
    whatsIncluded: [
      'One 30 mL tube of compounded Estradiol + Progesterone cream (1 mg / 100 mg per mL)',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'topical',
    cycleLength: '30-day supply',
    pricing: { monthly: 89, quarterly: 240, sixMonth: 426, annual: 864 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/hrt-cream.jpg',
    shot: true,
    gallery: ['/brand/products/hrt-cream.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Breast tenderness',
      'Spotting or irregular bleeding',
      'Headache',
      'Bloating or fluid retention',
      'Mood changes',
      'Drowsiness (progesterone)',
      'Skin irritation where applied',
    ],
    contraindications: [
      'Breast cancer, or a history of it',
      'Other estrogen-dependent cancer',
      'Unexplained vaginal bleeding',
      'History of blood clots, stroke or heart attack',
      'A known clotting disorder',
      'Liver disease',
      'Pregnancy',
    ],
  },

  // ============ HAIR (drafts) ============
  {
    id: 'fin-min-capsule',
    name: 'Finasteride + Minoxidil',
    tagline: 'For Men: Two Ingredients, One Capsule',
    category: 'skin-hair',
    shortDescription:
      'Oral finasteride and low-dose minoxidil combined in a single daily capsule, to support fuller-looking hair in men.',
    longDescription:
      'Finasteride lowers DHT, a hormone that affects hair follicles over time, and is the active ingredient in an FDA-approved prescription tablet for men. Minoxidil is FDA-approved as a topical for the scalp and as a tablet for blood pressure; low-dose oral use for hair is off-label. This compounded capsule combines both and is not FDA-approved. Consistent daily use is part of the plan; any effect depends on continuing it and varies between people. Finasteride lowers PSA test results, so tell any doctor screening you for prostate cancer. Your prescriber decides whether it is appropriate for you.',
    bestFor: 'Men who want one daily capsule instead of a pill and a topical.',
    benefits: [
      'Finasteride supports fuller-looking hair by lowering DHT',
      'Low-dose oral minoxidil studied for hair density',
      'One capsule a day',
      'Nothing to apply to the scalp',
    ],
    whatsIncluded: [
      '30 capsules of compounded Finasteride + Minoxidil 1 mg / 2.5 mg',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'oral',
    cycleLength: '30-day supply',
    pricing: { monthly: 79, quarterly: 213, sixMonth: 378, annual: 660 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/fin-min-capsule.jpg',
    shot: true,
    gallery: ['/brand/products/fin-min-capsule.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Lower libido, or erectile or ejaculation changes, uncommonly',
      'Temporary shedding in the first weeks',
      'Unwanted facial or body hair growth',
      'Ankle swelling or fluid retention',
      'Fast heartbeat or lightheadedness',
      'Sexual side effects that, in some men, have continued after stopping',
      'Depression, and rarely suicidal thoughts (tell your prescriber at once)',
      'Male breast cancer, reported rarely: report any breast lump, pain or nipple discharge',
    ],
    contraindications: [
      'Not for use by women; anyone pregnant or who may become pregnant must not handle broken capsules',
      'Low blood pressure, heart failure or significant heart disease',
      'Pheochromocytoma',
      'Liver disease',
      'Known hypersensitivity to finasteride or minoxidil',
    ],
  },
  {
    id: 'fin-min-foam',
    name: 'Finasteride + Minoxidil Foam',
    tagline: 'For Men: Scalp Foam, No Daily Pill',
    category: 'skin-hair',
    shortDescription:
      'Topical finasteride and minoxidil in a foam applied to the scalp, for men who would rather not take a pill.',
    longDescription:
      'Minoxidil is the active ingredient in FDA-approved topical scalp products, and finasteride in an FDA-approved prescription tablet for men. Applying finasteride to the scalp is studied as a way to act on the follicle with less of the drug reaching the bloodstream, although some is still absorbed. This compounded foam combines the two and is not FDA-approved. Consistent daily use is part of the plan; any effect depends on continuing it and varies between people. Your prescriber decides whether it is appropriate for you.',
    bestFor: 'Men who prefer a topical to a daily pill.',
    benefits: [
      'Minoxidil supports fuller-looking hair on the top of the scalp',
      'Topical finasteride studied for lower blood levels than the tablet',
      'Both medicines in one foam',
      'No daily pill',
    ],
    whatsIncluded: [
      '30 mL of compounded Finasteride + Minoxidil topical foam (0.25 mg / 5 mg)',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'topical',
    cycleLength: '30-day supply',
    pricing: { monthly: 89, quarterly: 240, sixMonth: 426, annual: 960 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/fin-min-foam.jpg',
    shot: true,
    gallery: ['/brand/products/fin-min-foam.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Scalp itching, dryness or flaking',
      'Temporary shedding in the first weeks',
      'Unwanted hair growth where the foam touches the face',
      'Lower libido or erectile changes, uncommonly',
      'Dizziness or fast heartbeat, rarely',
      'Sexual side effects that, in some men, have continued after stopping',
      'Depression, and rarely suicidal thoughts (tell your prescriber at once)',
      'Male breast cancer, reported rarely: report any breast lump, pain or nipple discharge',
    ],
    contraindications: [
      'Not for use by women; anyone pregnant or who may become pregnant must not handle it',
      'Broken, irritated or sunburned scalp',
      'Heart disease or low blood pressure',
      'Known hypersensitivity to finasteride, minoxidil or any foam ingredient',
    ],
  },
  {
    id: 'min-12-fin',
    name: 'Minoxidil 12% + Finasteride',
    tagline: "Men's Higher-Strength Topical",
    category: 'skin-hair',
    shortDescription:
      'Minoxidil at 12%, more than twice the strength sold over the counter, with topical finasteride in one foam.',
    longDescription:
      'Minoxidil is the active ingredient in FDA-approved topical scalp products, sold over the counter at up to 5%. This compounded foam uses 12% minoxidil with topical finasteride, a strength that is not FDA-approved and has much less published research than 5%; it is usually considered when a standard strength has not been enough. A higher strength also means more scalp irritation and more chance of the drug reaching the bloodstream. Consistent daily use is part of the plan; any effect depends on continuing it and varies between people. Your prescriber decides whether it is appropriate for you.',
    bestFor: 'Men who have already tried standard-strength minoxidil.',
    benefits: [
      '12% minoxidil, above the 5% sold over the counter',
      'Topical finasteride in the same foam',
      'Both medicines in one product',
      'No daily pill',
    ],
    whatsIncluded: [
      '30 mL of compounded Finasteride + Minoxidil topical foam (0.25 mg / 12%)',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'topical',
    cycleLength: '30-day supply',
    pricing: { monthly: 99, quarterly: 267, sixMonth: 474, annual: 1020 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/min-12-fin.jpg',
    shot: true,
    gallery: ['/brand/products/min-12-fin.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Scalp itching, redness or flaking, more likely than at lower strengths',
      'Temporary shedding in the first weeks',
      'Unwanted hair growth where the foam touches the face',
      'Lower libido or erectile changes, uncommonly',
      'Dizziness, fast heartbeat or ankle swelling, rarely',
      'Sexual side effects that, in some men, have continued after stopping',
      'Depression, and rarely suicidal thoughts (tell your prescriber at once)',
      'Male breast cancer, reported rarely: report any breast lump, pain or nipple discharge',
    ],
    contraindications: [
      'Not for use by women; anyone pregnant or who may become pregnant must not handle it',
      'Broken, irritated or sunburned scalp',
      'Heart disease or low blood pressure',
      'Known hypersensitivity to finasteride, minoxidil or any foam ingredient',
    ],
  },
  {
    id: 'fin-min-tret',
    name: 'Finasteride + Minoxidil + Tretinoin Foam',
    tagline: "Men's Three-Ingredient Topical",
    category: 'skin-hair',
    shortDescription:
      'Topical finasteride and minoxidil with a low dose of tretinoin, studied for helping the scalp respond to minoxidil.',
    longDescription:
      'Tretinoin is a retinoid and the active ingredient in FDA-approved prescription skin creams. Small studies have looked at combining it with minoxidil on the scalp, where it may increase minoxidil absorption and response; the evidence is early. This compounded foam combines finasteride, minoxidil and tretinoin and is not FDA-approved. Tretinoin makes skin more sensitive to the sun. Consistent daily use is part of the plan; any effect depends on continuing it and varies between people. Your prescriber decides whether it is appropriate for you.',
    bestFor: 'Men discussing a combined scalp topical with a prescriber.',
    benefits: [
      'Finasteride and minoxidil in one foam',
      'Low-dose tretinoin studied alongside minoxidil',
      'One product instead of three',
      'No daily pill',
    ],
    whatsIncluded: [
      '30 mL of compounded Finasteride + Minoxidil + Tretinoin topical foam (0.25 mg / 5 mg / 0.03%)',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'topical',
    cycleLength: '30-day supply',
    pricing: { monthly: 99, quarterly: 267, sixMonth: 474, annual: 960 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/fin-min-tret.jpg',
    shot: true,
    gallery: ['/brand/products/fin-min-tret.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Scalp redness, dryness, peeling or itching',
      'Sun sensitivity on the scalp',
      'Temporary shedding in the first weeks',
      'Unwanted hair growth where the foam touches the face',
      'Lower libido or erectile changes, uncommonly',
      'Sexual side effects that, in some men, have continued after stopping',
      'Depression, and rarely suicidal thoughts (tell your prescriber at once)',
      'Male breast cancer, reported rarely: report any breast lump, pain or nipple discharge',
    ],
    contraindications: [
      'Not for use by women; anyone pregnant or who may become pregnant must not handle it',
      'Broken, irritated or sunburned scalp, or scalp eczema',
      'Heart disease or low blood pressure',
      'Known hypersensitivity to finasteride, minoxidil, tretinoin or any foam ingredient',
    ],
  },
  {
    id: 'finasteride',
    name: 'Finasteride',
    tagline: "Men's Daily DHT Blocker",
    category: 'skin-hair',
    shortDescription:
      'A once-daily tablet that lowers DHT, a hormone that affects hair follicles, to support fuller-looking hair in men.',
    longDescription:
      'Finasteride blocks the enzyme that turns testosterone into DHT, a hormone that affects hair follicles over time. Finasteride 1 mg is the active ingredient in an FDA-approved prescription tablet for men, studied at the crown and mid-scalp. What we dispense is compounded, and compounded preparations are not FDA-approved. Consistent daily use is part of the plan, and any effect depends on continuing it. Finasteride lowers PSA test results, so tell any doctor screening you for prostate cancer. Your prescriber decides whether it is appropriate for you.',
    bestFor: 'Men who want a simple daily tablet to support their hair.',
    benefits: [
      'Supports fuller-looking hair by lowering DHT',
      'Studied at the crown and mid-scalp',
      'One small tablet a day',
      'Decades of clinical use',
    ],
    whatsIncluded: [
      '30 tablets of compounded Finasteride 1 mg',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'oral',
    cycleLength: '30-day supply',
    pricing: { monthly: 85, quarterly: 231, sixMonth: 408, annual: 780 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/finasteride.jpg',
    shot: true,
    gallery: ['/brand/products/finasteride.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Lower libido, uncommonly',
      'Erectile or ejaculation changes, uncommonly',
      'Breast tenderness or enlargement, rarely',
      'Sexual side effects that, in some men, have continued after stopping',
      'Depression, and rarely suicidal thoughts (tell your prescriber at once)',
      'Male breast cancer, reported rarely: report any breast lump, pain or nipple discharge',
      'Temporary shedding in the first weeks',
    ],
    contraindications: [
      'Not for use by women; anyone pregnant or who may become pregnant must not handle broken tablets',
      'Liver disease, without prescriber clearance',
      'A history of depression, without discussing it with your prescriber',
      'Known hypersensitivity to finasteride',
    ],
  },
  {
    id: 'oral-minoxidil',
    name: 'Oral Minoxidil',
    tagline: 'Low-Dose Daily Tablet',
    category: 'skin-hair',
    shortDescription:
      'Low-dose minoxidil in a once-daily tablet, prescribed off-label to support hair density in men and women.',
    longDescription:
      'Minoxidil is FDA-approved as a tablet for blood pressure, at much higher doses, and as a topical for the scalp. Low-dose oral minoxidil for hair is off-label; published studies, mostly small and observational, have looked at hair density in men and women. What we dispense is compounded, and compounded preparations are not FDA-approved. Even at 2.5 mg a day it can lower blood pressure and cause fluid retention, so your prescriber needs to know about your heart health and any blood-pressure medicines. Consistent daily use is part of the plan, and any effect depends on continuing it.',
    bestFor: 'Men and women who prefer a tablet to a topical.',
    benefits: [
      'Studied for hair density at low doses',
      'One small tablet a day',
      'Nothing to apply to the scalp',
      'Used by both men and women',
    ],
    whatsIncluded: [
      '30 tablets of compounded Minoxidil 2.5 mg',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'oral',
    cycleLength: '30-day supply',
    pricing: { monthly: 85, quarterly: 231, sixMonth: 408, annual: 780 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/oral-minoxidil.jpg',
    shot: true,
    gallery: ['/brand/products/oral-minoxidil.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Unwanted facial or body hair growth',
      'Temporary shedding in the first weeks',
      'Ankle or facial swelling (fluid retention)',
      'Fast heartbeat or lightheadedness',
      'Headache',
    ],
    contraindications: [
      'Pheochromocytoma',
      'Heart failure, recent heart attack, or fluid around the heart',
      'Low blood pressure, or other blood-pressure medicines without prescriber review',
      'Pregnancy or breastfeeding',
      'Known hypersensitivity to minoxidil',
    ],
  },
  {
    id: 'spironolactone',
    name: 'Spironolactone',
    tagline: 'For Women: Hair & Skin Support',
    category: 'skin-hair',
    shortDescription:
      'A sustained-release capsule prescribed off-label to support fuller-looking hair and clear-looking skin in women.',
    longDescription:
      'Spironolactone blocks androgen receptors and lowers androgen activity. It is FDA-approved as a tablet for heart, blood-pressure and fluid-balance uses; use for hair and skin is off-label, supported by clinical experience and smaller studies. What we dispense is a compounded sustained-release capsule, which is not FDA-approved. It can raise potassium, so your prescriber may ask for blood work, and it must not be taken during pregnancy.',
    bestFor: 'Women discussing androgen-balancing support for hair and skin with a prescriber.',
    benefits: [
      'Supports fuller-looking hair in women',
      'Supports clear-looking skin along the jaw and chin',
      'Sustained-release, once a day',
      'A long record of clinical use',
    ],
    whatsIncluded: [
      '30 capsules of compounded Spironolactone SR 55 mg',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'oral',
    cycleLength: '30-day supply',
    pricing: { monthly: 69, quarterly: 186, sixMonth: 330, annual: 576 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/spironolactone.jpg',
    shot: true,
    gallery: ['/brand/products/spironolactone.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Irregular periods or spotting',
      'Breast tenderness',
      'Dizziness or lightheadedness',
      'More frequent urination',
      'Raised potassium levels, uncommonly',
    ],
    contraindications: [
      'Pregnancy, planning a pregnancy, or breastfeeding',
      'Kidney disease or high potassium',
      "Addison's disease",
      'Taking eplerenone, potassium supplements or other potassium-sparing medicines',
      'Known hypersensitivity to spironolactone',
    ],
  },

  // ============ SKIN (drafts) ============
  {
    id: 'tretinoin',
    name: 'Tretinoin Cream',
    tagline: 'Supports Smooth, Renewed Skin',
    category: 'skin-hair',
    shortDescription:
      'A prescription retinoid cream that supports healthy skin renewal, for smoother, more even-looking skin.',
    longDescription:
      'Tretinoin is a retinoid, a form of vitamin A, that speeds skin-cell turnover. It is the active ingredient in FDA-approved prescription skin creams, including a 0.02% strength used as part of a skin-care and sun-protection routine. What we dispense is a compounded cream, which is not FDA-approved. Expect dryness and peeling in the first weeks; consistent nightly use is part of the plan, and daily sunscreen is essential.',
    bestFor: 'Adults starting a prescription retinoid for smoother-looking skin.',
    benefits: [
      'Supports healthy skin renewal',
      'Supports smoother texture and a more even-looking tone',
      'A gentle starting strength',
      'Applied once a day, at night',
    ],
    whatsIncluded: [
      '30 mL of compounded Tretinoin 0.02% cream',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'topical',
    cycleLength: '30-day supply',
    pricing: { monthly: 59, quarterly: 168, sixMonth: 318, annual: 540 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/tretinoin.jpg',
    shot: true,
    gallery: ['/brand/products/tretinoin.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Dryness, peeling and flaking, especially in the first weeks',
      'Redness, stinging or warmth',
      'Increased sensitivity to the sun',
      'Temporary breakouts when starting',
      'Lightening or darkening of the skin, uncommonly',
    ],
    contraindications: [
      'Pregnancy, planning a pregnancy, or breastfeeding',
      'Eczema, sunburn or broken skin on the treatment area',
      'Using other retinoids or strong exfoliants, without prescriber review',
      'Known hypersensitivity to tretinoin or any ingredient',
    ],
  },
  {
    id: 'glow-cream',
    name: 'Glow Cream',
    tagline: 'Retinoid + Hyaluronic Acid + Vitamin C',
    category: 'skin-hair',
    shortDescription:
      'Tretinoin with hyaluronic acid and vitamin C in one cream, for texture, tone and hydration.',
    longDescription:
      'Tretinoin is a retinoid and the active ingredient in FDA-approved prescription skin creams. This compounded cream pairs tretinoin 0.05% with hyaluronic acid, a humectant that helps skin hold water, and vitamin C, an antioxidant studied for brightness. The combination is not FDA-approved. Tretinoin 0.05% is a mid-range strength, so expect some dryness and peeling in the first weeks; consistent nightly use is part of the plan, and daily sunscreen is essential.',
    bestFor: 'Adults who want a retinoid routine with added hydration.',
    benefits: [
      'Tretinoin supports healthy skin renewal',
      'Hyaluronic acid helps skin hold moisture',
      'Vitamin C supports a bright, even-looking tone',
      'Three ingredients, one step',
    ],
    whatsIncluded: [
      'One 30 g jar of compounded Tretinoin 0.05% + Hyaluronic Acid 0.1% + Vitamin C 2% cream',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'topical',
    cycleLength: '30-day supply',
    pricing: { monthly: 59, quarterly: 168, sixMonth: 318, annual: 540 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/glow-cream.jpg',
    shot: true,
    gallery: ['/brand/products/glow-cream.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Dryness, peeling and flaking, especially in the first weeks',
      'Redness, stinging or warmth',
      'Increased sensitivity to the sun',
      'Temporary breakouts when starting',
    ],
    contraindications: [
      'Pregnancy, planning a pregnancy, or breastfeeding',
      'Eczema, sunburn or broken skin on the treatment area',
      'Using other retinoids or strong exfoliants, without prescriber review',
      'Known hypersensitivity to tretinoin or any ingredient',
    ],
  },
  {
    id: 'clear-skin-cream',
    name: 'Clear Skin Cream',
    tagline: 'Tretinoin 0.1% + Clindamycin',
    category: 'skin-hair',
    shortDescription:
      'Tretinoin and the antibiotic clindamycin in one cream, to support clear, healthy-looking skin.',
    longDescription:
      'Tretinoin is a retinoid that helps keep pores clear; clindamycin is a topical antibiotic. Both are active ingredients in FDA-approved prescription skin treatments, and the two are approved together at lower strengths. This compounded cream uses tretinoin 0.1%, the highest common strength, with clindamycin 2%, and is not FDA-approved. Expect dryness and peeling in the first weeks, and possibly a temporary flare of breakouts when starting; consistent daily use is part of the plan.',
    bestFor: 'Adults who want a prescription step up from over-the-counter skincare.',
    benefits: [
      'Tretinoin helps keep pores clear',
      'Clindamycin, a topical antibiotic, supports a clear complexion',
      'Two prescription ingredients in one step',
      'Applied once a day, at night',
    ],
    whatsIncluded: [
      'One 30 g jar of compounded Tretinoin 0.1% + Clindamycin 2% cream',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'topical',
    cycleLength: '30-day supply',
    pricing: { monthly: 59, quarterly: 168, sixMonth: 318, annual: 540 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/clear-skin-cream.jpg',
    shot: true,
    gallery: ['/brand/products/clear-skin-cream.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Dryness, peeling and redness',
      'Stinging or burning on application',
      'Increased sensitivity to the sun',
      'Temporary flare of breakouts when starting',
      'Diarrhea, rarely (stop and contact your prescriber if it is severe or bloody)',
    ],
    contraindications: [
      'Pregnancy, planning a pregnancy, or breastfeeding',
      "Ulcerative colitis, Crohn's disease, or a history of antibiotic-associated colitis",
      'Eczema, sunburn or broken skin on the treatment area',
      'Known hypersensitivity to tretinoin, clindamycin or lincomycin',
    ],
  },
  {
    id: 'brightening',
    name: 'Brightening Cream',
    tagline: 'Hydroquinone 4% + Vitamin C',
    category: 'skin-hair',
    shortDescription:
      'Prescription hydroquinone 4% with vitamin C, to support a bright, even-looking complexion.',
    longDescription:
      'Hydroquinone slows the production of melanin, the pigment that gives skin its colour, and is an active ingredient in FDA-approved prescription products. Since 2020 it has been available in the US only on prescription. This compounded cream pairs hydroquinone 4% with vitamin C, an antioxidant studied for brightness, and is not FDA-approved. It is usually used in courses of a few months with breaks, and daily sunscreen is essential.',
    bestFor: 'Adults who want a brighter, more even-looking complexion.',
    benefits: [
      'Hydroquinone supports a more even-looking tone',
      'Vitamin C studied for brightness',
      'Prescription-only strength',
      'Used in short courses, with breaks',
    ],
    whatsIncluded: [
      'One 30 g jar of compounded Hydroquinone 4% + Vitamin C 2% cream',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'topical',
    cycleLength: '30-day supply',
    pricing: { monthly: 59, quarterly: 168, sixMonth: 318, annual: 540 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/brightening.jpg',
    shot: true,
    gallery: ['/brand/products/brightening.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Mild redness, stinging or dryness',
      'Increased sensitivity to the sun',
      'Uneven lightening, or a pale halo around treated spots',
      'Bluish-grey darkening of the skin (ochronosis) with long-term use, rarely',
    ],
    contraindications: [
      'Pregnancy or breastfeeding',
      'Sunburned, broken or irritated skin on the treatment area',
      'Using benzoyl peroxide or other peroxide products at the same time (can stain the skin)',
      'Known hypersensitivity to hydroquinone or any ingredient',
    ],
  },
  {
    id: 'even-tone-cream',
    name: 'Even Tone Cream',
    tagline: 'Maximum-Strength Hydroquinone 8%',
    category: 'skin-hair',
    shortDescription:
      'Hydroquinone 8% with tretinoin and hydrocortisone, a triple combination to support an even-looking complexion.',
    longDescription:
      'The best-studied prescription approach to an even skin tone combines hydroquinone, a retinoid and a mild steroid, and an FDA-approved triple-combination cream uses hydroquinone at 4%. This compounded cream uses hydroquinone 8%, twice that strength, with tretinoin 0.05% and hydrocortisone 2.5%, and is not FDA-approved. A higher strength means more irritation, so courses are kept short with breaks. Daily sunscreen is essential, because sun exposure works against an even tone.',
    bestFor: 'Adults who have tried standard-strength brightening products and want a stronger prescription option.',
    benefits: [
      'Hydroquinone supports a more even-looking tone',
      'Tretinoin supports skin renewal alongside hydroquinone',
      'Hydrocortisone to temper irritation',
      'Three prescription ingredients in one step',
    ],
    whatsIncluded: [
      'One 20 g tube of compounded Hydroquinone 8% + Tretinoin 0.05% + Hydrocortisone 2.5% cream',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'topical',
    cycleLength: '30-day supply',
    pricing: { monthly: 59, quarterly: 168, sixMonth: 318, annual: 540 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/even-tone-cream.jpg',
    shot: true,
    gallery: ['/brand/products/even-tone-cream.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Redness, peeling, dryness or stinging',
      'Increased sensitivity to the sun',
      'Skin thinning or small visible blood vessels with prolonged steroid use',
      'Uneven lightening, or a pale halo around treated areas',
      'Bluish-grey darkening of the skin (ochronosis) with long-term use, rarely',
    ],
    contraindications: [
      'Pregnancy, planning a pregnancy, or breastfeeding',
      'Eczema, rosacea, sunburn or broken skin on the treatment area',
      'Using benzoyl peroxide or other peroxide products at the same time (can stain the skin)',
      'Known hypersensitivity to hydroquinone, tretinoin, hydrocortisone or any ingredient',
    ],
  },
  {
    id: 'hq-free',
    name: 'Hydroquinone-Free Brightening',
    tagline: 'Kojic Acid + Vitamin C + Hyaluronic Acid',
    category: 'skin-hair',
    shortDescription:
      'Kojic acid, vitamin C and hyaluronic acid in one cream, to support a brighter, more even-looking tone without hydroquinone.',
    longDescription:
      'Kojic acid comes from fungi used in food fermentation and, like hydroquinone, slows the enzyme skin uses to make melanin. It is not an active ingredient in any FDA-approved drug, and its evidence base is smaller than hydroquinone’s, but it can be an option for people who cannot use hydroquinone. This compounded cream pairs kojic acid 5% with vitamin C and hyaluronic acid and is not FDA-approved. Daily sunscreen is essential.',
    bestFor: 'Adults who want a more even-looking tone and cannot use, or want a break from, hydroquinone.',
    benefits: [
      'Kojic acid supports a brighter, more even-looking tone',
      'Vitamin C studied for brightness',
      'Hyaluronic acid helps skin hold moisture',
      'No hydroquinone',
    ],
    whatsIncluded: [
      'One 30 g jar of compounded Kojic Acid 5% + Vitamin C 2% + Hyaluronic Acid 0.5% cream',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'topical',
    cycleLength: '30-day supply',
    pricing: { monthly: 59, quarterly: 168, sixMonth: 318, annual: 540 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/hq-free.jpg',
    shot: true,
    gallery: ['/brand/products/hq-free.jpg'],
    requiresReview: true,
    fdaApproved: false,
    sideEffects: [
      'Mild redness, stinging or itching',
      'Dryness',
      'Increased sensitivity to the sun',
      'Contact dermatitis, uncommonly',
    ],
    contraindications: [
      'Broken, irritated or sunburned skin on the treatment area',
      'Pregnancy or breastfeeding, without prescriber review',
      'Known allergy to kojic acid or any ingredient',
    ],
  },
  {
    id: 'clear-skin-capsules',
    name: 'Clear Skin Capsules',
    tagline: 'Doxycycline 50 mg',
    category: 'skin-hair',
    shortDescription:
      'Doxycycline 50 mg, an antibiotic prescribed off-label at a low dose to support a clear, calm-looking complexion.',
    longDescription:
      'Doxycycline is a tetracycline antibiotic. At low doses it is used mainly for its calming effect on the skin. The FDA-approved low-dose doxycycline product for skin is a different, 40 mg modified-release capsule. What we dispense is a compounded doxycycline 50 mg capsule, which is not FDA-approved and is prescribed off-label at a low dose. Take it with a full glass of water and stay upright afterwards.',
    bestFor: 'Adults discussing a low-dose oral option for clear, calm-looking skin with a prescriber.',
    benefits: [
      'Supports a clear, calm-looking complexion',
      'Prescribed off-label at a low dose',
      'Taken with a full glass of water, staying upright',
      'One capsule a day',
    ],
    whatsIncluded: [
      '30 capsules of compounded Doxycycline 50 mg',
      'Ongoing messaging with your prescriber',
    ],
    delivery: 'oral',
    cycleLength: '30-day supply',
    pricing: { monthly: 49, quarterly: 132, sixMonth: 234, annual: 408 },
    swatch: 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    image: '/brand/products/clear-skin-capsules.jpg',
    shot: true,
    gallery: ['/brand/products/clear-skin-capsules.jpg'],
    requiresReview: true,
    fdaApproved: true,
    sideEffects: [
      'Nausea or stomach upset',
      'Increased sensitivity to the sun',
      'Heartburn or throat irritation if taken lying down',
      'Diarrhea',
      'Vaginal yeast infection',
      'Rarely: severe headache with vision changes (stop and seek care)',
    ],
    contraindications: [
      'Pregnancy, planning a pregnancy, or breastfeeding',
      'Known hypersensitivity to doxycycline or any tetracycline',
      'Taking isotretinoin',
      'Taking blood thinners, or antacids or iron within a few hours of a dose, without prescriber review',
    ],
  },
];

// Branded vial renders (public/images/products) replace the stock photos.
// Orders currently ship in the pharmacy's own labelled vials, so product pages
// mark these as illustrative: an "Image for illustration" tag on the photo and
// a line in the disclosure (components/shop/pdpParts). Keep both while there
// is no white-label packaging.
{
  // Redesign packaging (clear vial, white label, butter cap).
  const BRAND: Record<string, string> = {
    'nad-plus': '/brand/vial-nad.jpg',
    glutathione: '/brand/vial-glutathione.jpg',
    'pt-141': '/brand/vial-pt141.jpg',
    sermorelin: '/brand/vial-sermorelin.jpg',
  };
  const RENDERED = new Set(['nad-plus', 'glutathione', 'pt-141', 'sermorelin']);
  for (const p of SHOP_PRODUCTS) {
    if (!RENDERED.has(p.id)) continue;
    p.image = BRAND[p.id] ?? `/images/products/${p.id}.jpg`;
    p.shot = true;
    p.gallery = [p.image, ...p.gallery.slice(1)];
  }
}

// Storage: injectables and the nasal spray are refrigerated; tablets,
// capsules, creams and foams are room temperature. The troches (ED Dual,
// oxytocin) stay unset until the pharmacy confirms: "as directed on the label".
{
  const LABEL = new Set(['sildenafil-tadalafil', 'oxytocin']);
  for (const p of SHOP_PRODUCTS) {
    if (LABEL.has(p.id)) continue;
    p.storage = p.delivery === 'oral' || p.delivery === 'topical' ? 'room' : 'refrigerated';
  }
}

/** Look up by id (slug). */
export function getShopProduct(id: string): ShopProduct | null {
  if (!isSellable(id)) return null;
  return SHOP_PRODUCTS.find((p) => p.id === id) ?? null;
}

/** The withheld ones, for order history and any record that must still render. */
export function getAnyShopProduct(id: string): ShopProduct | null {
  return SHOP_PRODUCTS.find((p) => p.id === id) ?? null;
}

/** Other products in the same category, excluding the given one. */
export function getRelatedProducts(p: ShopProduct, limit = 3): ShopProduct[] {
  return SHOP_PRODUCTS.filter(
    (x) => x.id !== p.id && x.category === p.category
  ).slice(0, limit);
}

/**
 * 12-month plans: oral solids only (tablets, capsules, troches). Compounded
 * oral solids usually carry a 180-day beyond-use date, so the year is billed
 * once and shipped in two 6-month boxes (see lib/annual-shipments). Creams,
 * injectables and sprays keep shorter plans.
 */
export const TWELVE_MONTH_PLAN: ReadonlySet<string> = new Set([
  'sildenafil',
  'sildenafil-tadalafil',
  'finasteride',
  'oral-minoxidil',
  'fin-min-capsule',
  'enclomiphene',
  'spironolactone',
  'clear-skin-capsules',
  'methylene-blue',
  'oxytocin',
]);

/** Whether this product sells a 12-month plan: its own setting, else the launch list. */
export function offersTwelveMonth(p: Pick<ShopProduct, 'id' | 'twelveMonthPlan'>): boolean {
  return p.twelveMonthPlan ?? TWELVE_MONTH_PLAN.has(p.id);
}

/** Boxes shipped per billing cycle: a 12-month plan ships twice. */
export function shipmentsPerCycle(cadence: string): number {
  return cadence === 'annual' ? 2 : 1;
}

/** Cadence helper. Return per-month price and discount label. */
export interface CadenceTier {
  key: 'monthly' | 'quarterly' | 'sixMonth' | 'annual';
  label: string;
  description: string;
  total: number;
  perMonth: number;
  saveLabel?: string;
  /** What the plan actually includes, shown under the selected option. */
  breakdown: string[];
}

/**
 * `shipPrice` is the per-box shipping the customer pays (Admin → Settings;
 * see lib/shipping-settings). It only feeds the "Save $X" figures, so a
 * caller without settings at hand may leave the default.
 */
export function cadenceTiersForProduct(p: ShopProduct, shipPrice: number = shippingPriceFor(p)): CadenceTier[] {
  const m = p.pricing.monthly;
  const q = p.pricing.quarterly;
  const s = p.pricing.sixMonth;
  const y = offersTwelveMonth(p) ? p.pricing.annual : 0;
  // What a longer plan saves against ordering monthly, shipping included:
  // every monthly order ships (and pays shipping) on its own, a 3- or 6-month
  // plan ships once, a 12-month plan twice.
  const ship = shipPrice;
  const saved = (months: number, total: number, shipments: number) => m * months + ship * months - (total + ship * shipments);
  const saveLine = (dollars: number, months: number) =>
    `Save $${dollars} vs. ${months} monthly orders, shipping included`;
  const common = [
    'Ships on the same prescription until it expires',
    'Adjust your refill date whenever you like',
    'Pause or cancel before the next billing date',
    'Ongoing prescriber messaging throughout',
  ];
  const plan = (
    key: CadenceTier['key'],
    label: string,
    months: number,
    total: number,
    billing: string,
    shipping: string,
    shipments = 1,
  ): CadenceTier => {
    const dollars = saved(months, total, shipments);
    return {
      key,
      label,
      description: `${billing} · ${shipping}`,
      total,
      perMonth: Math.round(total / months),
      saveLabel: dollars > 0 ? `Save $${dollars}` : undefined,
      breakdown: [...(dollars > 0 ? [saveLine(dollars, months)] : []), `${billing}, ${shipping.toLowerCase()}`, ...common],
    };
  };
  // Monthly stays first: callers fall back to tiers[0] for an unknown cadence.
  return [
    {
      key: 'monthly',
      label: 'Monthly',
      description: 'Billed monthly · Cancel anytime',
      total: m,
      perMonth: m,
      breakdown: ['Billed monthly, shipped monthly', ...common],
    },
    plan('quarterly', 'Quarterly', 3, q, 'Billed every 3 months', 'Ships every 3 months'),
    ...(s ? [plan('sixMonth', '6-month', 6, s, 'Billed every 6 months', 'Ships every 6 months')] : []),
    ...(y ? [plan('annual', '12-month', 12, y, 'Billed every 12 months', 'Ships every 6 months', 2)] : []),
  ];
}

/**
 * The plan a product page opens on: the lowest per-month price, the shorter
 * plan on a tie (a longer plan that saves nothing is not the default).
 */
export function defaultTier(tiers: CadenceTier[]): CadenceTier {
  return tiers.reduce((a, b) => (b.perMonth < a.perMonth ? b : a));
}

/**
 * What we are allowed to sell, as opposed to what we can make.
 *
 * Three separate gates landed on nearly the same answer, which is why this is
 * one list rather than three:
 *
 *   • 503A — none of the withheld substances are on the FDA Bulks List, so
 *     compounding them sits outside the exemption. Six of them (BPC-157,
 *     TB-500, KPV, MOTS-c, Semax, Epitalon) came off Category 2 in April 2026
 *     and were voted onto the path to the list by PCAC in July, but the
 *     Secretary has not signed. Recommended is not listed.
 *   • The payment processor's prohibited-products list, which allows exactly
 *     the five below.
 *   • LegitScript, which reviews the live catalogue as part of certification.
 *
 * Withheld, not deleted. The product data, imagery and clinical copy stay
 * intact so a single edit here puts one back the day it is cleared.
 */
const WITHHELD = new Set([
  // The prescriber does not intend to write it. A catalogue that lists what
  // nobody will sign is the same defect as listing what nobody can compound.
  'sermorelin',
  // LegitScript's analyst flagged tesamorelin under Healthcare Standard 2: not
  // on the 503A bulks list, not a component of an FDA-approved drug for
  // compounding purposes, and therefore a barrier to certification. The brand
  // being approved is not the same thing as the bulk substance being permitted.
  'tesamorelin',
  'ghk-cu',
  'cjc-ipamorelin',
  'ipamorelin',
  'selank',
  'semax',
  'epitalon',
  'bpc-157',
  'tb-500',
  'bpc-tb500',
  'thymosin-alpha-1',
  'mots-c',
  'kpv',
  'dsip',
  'klow',
]);

/**
 * Never public, whatever the catalogue says: the withheld list plus the
 * compounded GLP-1s, which the site does not sell. lib/catalog forces these
 * to withheld and Admin → Products refuses to set them live, so a stray
 * `live` row (or an edit here to DRAFT) cannot list them.
 */
export const NEVER_LIVE: ReadonlySet<string> = new Set([...WITHHELD, 'semaglutide', 'tirzepatide']);

/**
 * Seeded as drafts: in the catalogue for review, not listed or orderable until
 * an admin flips them to live in Admin → Products. Empty since 2026-09-28: the
 * whole lineup was published. Add an id here to hold a new product back.
 */
export const DRAFT = new Set<string>([]);

/** True when a product may be listed, linked, indexed or ordered. */
/**
 * Local dev previews drafts as live, so localhost shows the whole lineup the
 * way it will look once each product is cleared. Never on a Vercel build.
 */
export const PREVIEW_DRAFTS = process.env.NODE_ENV === 'development' && !process.env.VERCEL_ENV;

export function isSellable(id: string): boolean {
  return !NEVER_LIVE.has(id) && (PREVIEW_DRAFTS || !DRAFT.has(id));
}

/**
 * Products listed on the PUBLIC storefront (/shop).
 *
 * A withheld product must not merely lose its tile: an orphaned page that
 * still resolves, or a sitemap entry pointing at one, reads worse to a
 * certifier than never having withheld it at all.
 */
export const PUBLIC_PRODUCTS: ShopProduct[] = SHOP_PRODUCTS.filter((p) =>
  isSellable(p.id),
);

/** Categories that still have at least one product on the public storefront. */
export const PUBLIC_CATEGORIES = SHOP_CATEGORIES.filter((c) =>
  PUBLIC_PRODUCTS.some((p) => p.category === c.key)
);
