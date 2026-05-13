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
  stack: string[]; // ["BPC-157", "TB-500", ...]
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

export const PROTOCOLS: Protocol[] = [
  {
    id: 'recover',
    name: 'RECOVER',
    tagline: 'Recovery + Joint Care',
    category: 'RECOVERY',
    stack: ['BPC-157', 'TB-500', 'KPV', 'GHK-Cu'],
    shortDescription:
      'A four-peptide stack for accelerated soft tissue repair, reduced inflammation, and joint rejuvenation.',
    longDescription:
      'Built for athletes and anyone training hard, RECOVER combines four healing peptides into one synergistic protocol. BPC-157 and TB-500 accelerate soft tissue repair. KPV calms inflammation. GHK-Cu (which gives the vial its signature blue tint from natural copper ions) rejuvenates skin, joints, and connective tissue. The result: faster recovery between sessions, fewer setbacks, and a body that holds up under volume.',
    benefits: [
      'Accelerates soft tissue and tendon repair',
      'Reduces systemic and joint inflammation',
      'Improves recovery time between training sessions',
      'Supports skin, hair, and connective tissue health',
      'Long-term injury prevention',
    ],
    ingredients: ['BPC-157', 'TB-500', 'KPV', 'GHK-Cu', 'Bacteriostatic water'],
    dosing: [
      { peptide: 'BPC-157 / TB-500 / KPV / GHK-Cu blend', dose: '20 units', frequency: '5×/week', supply: '5 weeks' },
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
    stack: ['Tesamorelin', 'Ipamorelin', 'CJC-1295'],
    shortDescription:
      'Growth hormone signaling and body composition support for cycle-based training.',
    longDescription:
      'PERFORM is engineered for body recomposition and athletic output. Tesamorelin reduces visceral fat and improves metabolic markers. Ipamorelin + CJC-1295 stimulate pulsatile GH release without crushing your natural production. Designed to run as 3-month cycles with off-cycle periods to maintain sensitivity. Comes with full dosing instructions and clinical liaison support.',
    benefits: [
      'Enhances growth hormone signaling',
      'Improves body composition (lean mass up, visceral fat down)',
      'Improves recovery and sleep quality',
      'Sharpens cognitive clarity',
      'Cardiovascular and metabolic markers',
    ],
    ingredients: ['Tesamorelin', 'Ipamorelin', 'CJC-1295 (no DAC)', 'Bacteriostatic water'],
    dosing: [
      { peptide: 'Tesamorelin', dose: '30 units', frequency: '5×/week', supply: '3 weeks' },
      { peptide: 'Ipamorelin / CJC-1295', dose: '20 units', frequency: '5×/week', supply: '4 weeks' },
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
    stack: ['Epitalon', 'NAD+', 'Selank'],
    shortDescription:
      'Cellular support, metabolic regulation, and cognitive clarity engineered for the long arc.',
    longDescription:
      'LONGEVITY is for the people thinking in decades, not seasons. Epitalon supports telomere maintenance and circadian regulation. NAD+ replenishes a cofactor that declines steeply with age and underwrites mitochondrial energy. Selank supports cognitive clarity and stress regulation. Designed to be sustained across years with periodic re-evaluation by your physician.',
    benefits: [
      'Cellular and mitochondrial support',
      'Sleep and circadian regulation',
      'Cognitive clarity and stress modulation',
      'Metabolic and energy markers',
      'Designed for long-arc adherence',
    ],
    ingredients: ['Epitalon', 'NAD+', 'Selank', 'Bacteriostatic water'],
    dosing: [
      { peptide: 'Epitalon', dose: '10 units', frequency: '5×/week', supply: '4 weeks' },
      { peptide: 'NAD+', dose: '40 units', frequency: '3×/week', supply: '4 weeks' },
      { peptide: 'Selank', dose: '15 units', frequency: 'daily', supply: '3 weeks' },
    ],
    pricing: { monthly: 420, quarterly: 1140, annual: 4080 },
    swatch: '#3a2d1a',
    image: '/images/1.jpg',
    gallery: ['/images/1.jpg', '/images/2.jpg', '/images/9.jpg', '/images/13.jpg'],
    bestFor: '35+ adults focused on healthspan and cognitive maintenance',
    cycleLength: 'Ongoing — re-authorized quarterly',
  },
  {
    id: 'sculpt',
    name: 'SCULPT',
    tagline: 'Composition + Metabolic',
    category: 'BODY COMPOSITION',
    stack: ['Semaglutide', 'AOD-9604', '5-Amino-1MQ'],
    shortDescription:
      'Weight management and body composition refinement under physician-supervised dosing.',
    longDescription:
      'SCULPT pairs the appetite and glycemic regulation of Semaglutide with AOD-9604 (a fragment of growth hormone that targets fat metabolism) and 5-Amino-1MQ (an NNMT inhibitor that supports lean mass preservation during caloric deficit). Dosing is titrated by your physician across a structured cycle with regular check-ins for tolerability and progress.',
    benefits: [
      'Appetite and glycemic regulation',
      'Targeted fat metabolism',
      'Lean mass preservation during deficit',
      'Physician-titrated dosing with check-ins',
      'Optional bridge protocol on completion',
    ],
    ingredients: ['Semaglutide', 'AOD-9604', '5-Amino-1MQ', 'Bacteriostatic water'],
    dosing: [
      { peptide: 'Semaglutide', dose: 'titrated', frequency: '1×/week', supply: '4 weeks' },
      { peptide: 'AOD-9604', dose: '30 units', frequency: '5×/week', supply: '4 weeks' },
      { peptide: '5-Amino-1MQ', dose: 'oral, daily', frequency: 'daily', supply: '30 days' },
    ],
    pricing: { monthly: 480, quarterly: 1320, annual: 4680 },
    swatch: '#1f1612',
    image: '/images/8.jpg',
    gallery: ['/images/8.jpg', '/images/5.jpg', '/images/6.jpg', '/images/9.jpg'],
    bestFor: 'Adults pursuing body recomposition with clinical support',
    cycleLength: '3-month cycle, optional bridge',
  },
];

export function getProtocol(id: string): Protocol | undefined {
  return PROTOCOLS.find((p) => p.id === id);
}

export function getOtherProtocols(currentId: string): Protocol[] {
  return PROTOCOLS.filter((p) => p.id !== currentId);
}
