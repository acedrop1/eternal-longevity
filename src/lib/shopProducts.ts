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
    pricing: { monthly: 199, quarterly: 540, annual: 1910 },
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
    pricing: { monthly: 199, quarterly: 540, annual: 1910 },
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
    popular: true,
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
    popular: true,
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
    tagline: 'Cellular Energy',
    category: 'longevity',
    shortDescription:
      'The coenzyme central to mitochondrial energy metabolism. Levels fall with age.',
    longDescription:
      'NAD+ is a coenzyme present in every cell and required for mitochondrial energy production and DNA-repair signalling. Tissue levels decline with age, and supplementation is an active research area — although how much subcutaneous dosing raises intracellular NAD+ in humans is still debated. Offered for energy and longevity support in healthy adults.',
    bestFor: 'Members 40+ building a longevity protocol around energy and recovery.',
    benefits: [
      'Central to mitochondrial energy metabolism',
      'Studied for DNA-repair signalling pathways',
      'Subcutaneous dosing, no infusion appointment',
      'Commonly run alongside a GH-axis protocol',
    ],
    whatsIncluded: [
      '12 weeks of compounded NAD+ (200 mg/mL, 5 mL vial)',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 249, quarterly: 680, annual: 2390 },
    swatch: 'linear-gradient(180deg, #3d4560 0%, #000000 100%)',
    image: '/images/5.jpg',
    gallery: ['/images/5.jpg', '/images/9.jpg', '/images/14.jpg', '/images/7.jpg'],
    requiresReview: true,
    popular: true,
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
    tagline: 'Master Antioxidant',
    category: 'longevity',
    shortDescription:
      'The tripeptide your cells use to neutralise oxidative stress. Produced naturally, and depleted by age and load.',
    longDescription:
      'Glutathione is a tripeptide of glutamate, cysteine and glycine that every cell produces and uses in redox reactions and phase-II liver conjugation. Levels fall with age, illness, and sustained physical stress. How much injected glutathione raises intracellular levels in humans is still debated, and we make no skin-lightening claim of any kind — that use has drawn FDA warning letters and we do not offer it.',
    bestFor: 'Members building a longevity protocol around oxidative load and liver support.',
    benefits: [
      'Central to the body’s redox and detoxification pathways',
      'Studied for oxidative-stress markers',
      'Subcutaneous dosing, no infusion appointment',
      'Commonly run alongside NAD+',
    ],
    whatsIncluded: [
      '12 weeks of compounded Glutathione (200 mg/mL, 5 mL vial)',
      'Reconstitution kit',
      'Insulin syringes + alcohol prep pads',
      'Protocol check-in at week 6',
    ],
    delivery: 'sq',
    cycleLength: '12-week cycle',
    pricing: { monthly: 199, quarterly: 540, annual: 1910 },
    swatch: 'linear-gradient(180deg, #35555c 0%, #000000 100%)',
    image: '/images/9.jpg',
    gallery: ['/images/9.jpg', '/images/5.jpg', '/images/14.jpg', '/images/12.jpg'],
    requiresReview: true,
    popular: true,
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
    popular: true,
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
  key: 'monthly' | 'quarterly' | 'once';
  label: string;
  description: string;
  total: number;
  perMonth: number;
  saveLabel?: string;
  /** What the plan actually includes, shown under the selected option. */
  breakdown: string[];
}

export function cadenceTiersForProduct(p: ShopProduct): CadenceTier[] {
  const m = p.pricing.monthly;
  const q = p.pricing.quarterly;
  const qPerMonth = Math.round(q / 3);
  const qSave = Math.round((1 - q / (m * 3)) * 100);
  return [
    {
      key: 'monthly',
      label: 'Monthly',
      description: 'Billed monthly · Cancel anytime',
      total: m,
      perMonth: m,
      breakdown: [
        'Billed monthly, shipped monthly',
        'Ships on the same prescription until it expires',
        'Adjust your refill date whenever you like',
        'Pause or cancel before the next billing date',
        'Ongoing prescriber messaging throughout',
      ],
    },
    {
      key: 'quarterly',
      label: 'Quarterly',
      description: 'Billed every 3 months · Ships every 3 months',
      total: q,
      perMonth: qPerMonth,
      saveLabel: qSave > 0 ? `Save ${qSave}%` : undefined,
      breakdown: [
        'Billed every 3 months, shipped every 3 months',
        'Ships on the same prescription until it expires',
        'Adjust your refill date whenever you like',
        'Pause or cancel before the next billing date',
        'Ongoing prescriber messaging throughout',
      ],
    },
    {
      key: 'once',
      label: 'One-time',
      description: 'A single order · No subscription',
      // ponytail: flat $20 premium over the monthly rate; tune per product if
      // merch ever wants finer control.
      total: m + 20,
      perMonth: m + 20,
      breakdown: [
        'One order, one charge, nothing recurring',
        'Reviewed by a prescriber like any other order',
        'Order again whenever you want more',
      ],
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
