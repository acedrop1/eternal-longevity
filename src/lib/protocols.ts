export type DosingEntry = {
  peptide: string;
  dose: string;
  frequency: string;
  supply: string;
};

export type Protocol = {
  id: string;
  name: string;
  tagline: string; // short label e.g. "Recovery + Joint Care"
  category: string; // e.g. "RECOVERY"
  stack: string[]; // goal descriptors shown as public card chips — compound names are disclosed post-assessment in the member portal
  shortDescription: string; // one-liner for cards
  longDescription: string; // full PDP paragraph
  benefits: string[]; // bullets for accordion
  ingredients: string[]; // ingredient list
  dosing: DosingEntry[];
  pricing: {
    monthly: number;
    quarterly: number; // total for 3 months
    annual: number; // total for 12 months
  };
  swatch: string; // dark gradient base color
  image: string; // primary image
  gallery: string[]; // gallery thumbnails (first is hero)
  bestFor: string;
  cycleLength: string; // e.g. "3-month cycle"
};

// NOTE: Public marketing pages intentionally do not name individual compounds.
// The full formulation for each protocol is disclosed in the member portal
// after the assessment. Keep compound names out of these fields.
const FORMULATION_NOTE =
  'Full formulation disclosed after your assessment, in your member portal.';

export const PROTOCOLS: Protocol[] = [
  {
    id: 'recover',
    name: 'RECOVER',
    tagline: 'Recovery + Joint Care',
    category: 'RECOVERY',
    stack: ['Joint Support', 'Inflammation Control'],
    shortDescription:
      'A restorative stack for reduced inflammation, joint support, and connective tissue rejuvenation.',
    longDescription:
      'Built for athletes and anyone training hard, RECOVER pairs restorative compounds into one synergistic protocol: one calms inflammation, the other rejuvenates skin, joints, and connective tissue. The result: faster recovery between sessions, fewer setbacks, and a body that holds up under volume. ' +
      FORMULATION_NOTE,
    benefits: [
      'Reduces systemic and joint inflammation',
      'Improves recovery time between training sessions',
      'Supports skin, hair, and connective tissue health',
      'Long-term injury prevention',
    ],
    ingredients: ['Proprietary recovery blend (disclosed after assessment)', 'Bacteriostatic water'],
    dosing: [
      { peptide: 'Recovery blend', dose: '20 units', frequency: '5×/week', supply: '5 weeks' },
    ],
    pricing: { monthly: 280, quarterly: 750, annual: 2640 },
    swatch: '#1a1a1a',
    image: '/images/9.jpg',
    gallery: ['/images/9.jpg', '/images/11.jpg', '/images/13.jpg', '/images/14.jpg'],
    bestFor: 'Athletes, post-injury rehab, anyone training 4+ days a week',
    cycleLength: '3-month cycle',
  },
  {
    id: 'perform',
    name: 'PERFORM',
    tagline: 'Performance + Strength',
    category: 'PERFORMANCE',
    stack: ['GH-Axis Support', 'Body Composition'],
    shortDescription:
      'Growth hormone signaling and body composition support for cycle-based training.',
    longDescription:
      'PERFORM is engineered for body recomposition and athletic output: reduced visceral fat, improved metabolic markers, and pulsatile GH-axis support without crushing your natural production. Designed to run as 3-month cycles with off-cycle periods to maintain sensitivity. Comes with full dosing instructions and member support. ' +
      FORMULATION_NOTE,
    benefits: [
      'Enhances growth hormone signaling',
      'Improves body composition (lean mass up, visceral fat down)',
      'Improves recovery and sleep quality',
      'Sharpens cognitive clarity',
      'Cardiovascular and metabolic markers',
    ],
    ingredients: ['Proprietary performance blend (disclosed after assessment)', 'Bacteriostatic water'],
    dosing: [
      { peptide: 'Performance blend A', dose: '30 units', frequency: '5×/week', supply: '3 weeks' },
      { peptide: 'Performance blend B', dose: '20 units', frequency: '5×/week', supply: '4 weeks' },
    ],
    pricing: { monthly: 360, quarterly: 980, annual: 3480 },
    swatch: '#2d2419',
    image: '/images/7.jpg',
    gallery: ['/images/7.jpg', '/images/8.jpg', '/images/11.jpg', '/images/12.jpg'],
    bestFor: 'Cycle-based athletes and recomposition-focused users',
    cycleLength: '3-month cycle',
  },
  {
    id: 'longevity',
    name: 'LONGEVITY',
    tagline: 'Cellular + Cognitive',
    category: 'LONGEVITY',
    stack: ['Cellular Support', 'Cognitive Clarity'],
    shortDescription:
      'Cellular support, metabolic regulation, and cognitive clarity engineered for the long arc.',
    longDescription:
      'LONGEVITY is for the people thinking in decades, not seasons. The protocol supports telomere maintenance and circadian regulation, replenishes a key cellular cofactor that declines steeply with age, and supports cognitive clarity and stress regulation. Designed to be sustained across years with periodic protocol check-ins. ' +
      FORMULATION_NOTE,
    benefits: [
      'Cellular and mitochondrial support',
      'Sleep and circadian regulation',
      'Cognitive clarity and stress modulation',
      'Metabolic and energy markers',
      'Designed for long-arc adherence',
    ],
    ingredients: ['Proprietary longevity blend (disclosed after assessment)', 'Bacteriostatic water'],
    dosing: [
      { peptide: 'Longevity blend A', dose: '10 units', frequency: '5×/week', supply: '4 weeks' },
      { peptide: 'Longevity blend B', dose: '40 units', frequency: '3×/week', supply: '4 weeks' },
      { peptide: 'Longevity blend C', dose: '15 units', frequency: 'daily', supply: '3 weeks' },
    ],
    pricing: { monthly: 420, quarterly: 1140, annual: 4080 },
    swatch: '#3a2d1a',
    image: '/images/1.jpg',
    gallery: ['/images/1.jpg', '/images/2.jpg', '/images/9.jpg', '/images/13.jpg'],
    bestFor: '35+ adults focused on healthspan and cognitive maintenance',
    cycleLength: 'Ongoing. Renewed quarterly',
  },
  {
    id: 'sculpt',
    name: 'SCULPT',
    tagline: 'Composition + Metabolic',
    category: 'BODY COMPOSITION',
    stack: ['Appetite Regulation', 'Lean Mass Support'],
    shortDescription:
      'Weight management and body composition refinement with structured, titrated dosing.',
    longDescription:
      'SCULPT pairs appetite and glycemic regulation with targeted fat metabolism and lean mass preservation during caloric deficit. Dosing is titrated across a structured cycle with regular check-ins for tolerability and progress. ' +
      FORMULATION_NOTE,
    benefits: [
      'Appetite and glycemic regulation',
      'Targeted fat metabolism',
      'Lean mass preservation during deficit',
      'Structured, titrated dosing with check-ins',
      'Optional bridge protocol on completion',
    ],
    ingredients: ['Proprietary metabolic blend (disclosed after assessment)', 'Bacteriostatic water'],
    dosing: [
      { peptide: 'Metabolic blend A', dose: 'titrated', frequency: '1×/week', supply: '4 weeks' },
      { peptide: 'Metabolic blend B', dose: '30 units', frequency: '5×/week', supply: '4 weeks' },
      { peptide: 'Metabolic blend C', dose: 'oral, daily', frequency: 'daily', supply: '30 days' },
    ],
    pricing: { monthly: 480, quarterly: 1320, annual: 4680 },
    swatch: '#1f1612',
    image: '/images/8.jpg',
    gallery: ['/images/8.jpg', '/images/5.jpg', '/images/6.jpg', '/images/9.jpg'],
    bestFor: 'Adults pursuing body recomposition with structured support',
    cycleLength: '3-month cycle, optional bridge',
  },
];

export function getProtocol(id: string): Protocol | undefined {
  return PROTOCOLS.find((p) => p.id === id);
}

export function getOtherProtocols(currentId: string): Protocol[] {
  return PROTOCOLS.filter((p) => p.id !== currentId);
}
