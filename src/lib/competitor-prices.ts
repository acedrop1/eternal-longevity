/**
 * What competitors charged for the closest equivalent of each product, per
 * month, read from their own sites on 2026-10-16 (S = secondhand). Shown on
 * Admin → Pricing next to our cost and profit. A snapshot: prices move, so
 * re-check before repricing. Full detail: 13 Pricing Audit (Drive).
 */
export const COMPETITORS_CHECKED = 'Oct 16, 2026';

export type Position = 'cheapest' | 'middle' | 'high';

export const COMPETITOR_PRICES: Record<string, { market: string; position: Position }> = {
  'fin-min-capsule': { market: 'Strut $69 · Keeps $70 → $52 · Happy Head $63–79 · Hims from $35', position: 'middle' },
  'fin-min-foam': { market: 'Ro $50 → $43 · Keeps $50 · Hims $50 (3 mo), $35 (5 mo) · Strut $59', position: 'high' },
  'min-12-fin': { market: 'Nobody above 8% · Happy Head 8% $79–99', position: 'high' },
  'fin-min-tret': { market: 'Ro Mane Spray $50 → $43 · Lemonaid $50 · Strut $59', position: 'high' },
  finasteride: { market: 'Ro $20 → $16 · Keeps $27 → $20 · Hims $22 · Strut $25', position: 'high' },
  'oral-minoxidil': { market: 'Strut $18 · Ro $30 → $24 · Nurx $16 · Hers $29', position: 'high' },
  spironolactone: { market: 'Nurx ~$15–30 + consult · Musely $32', position: 'high' },
  sildenafil: { market: 'Strut $38 · Rex MD $48 · Ro $80 (8 × 100 mg)', position: 'cheapest' },
  'sildenafil-tadalafil': { market: 'BlueChew combo $60 · Ro Sparks $91–96', position: 'cheapest' },
  'pt-141': { market: 'PlexusDx $189 → $159 · Hone $130 + membership · Telos $249 (S)', position: 'middle' },
  oxytocin: { market: 'Measured $159 · Maximus $199', position: 'cheapest' },
  enclomiphene: { market: 'Strut $99 · Hims $199 → $99 (10 mo prepaid) · Maximus $200 → $100 + labs', position: 'middle' },
  tretinoin: { market: 'Curology $30 · Ro $29 · Dermatica $30 · Nurx $30 + fees · Agency $55–65', position: 'high' },
  'glow-cream': { market: 'Curology $30–35 · Musely $35 · Agency $65', position: 'high' },
  'clear-skin-cream': { market: 'Curology $30 · Musely $30', position: 'high' },
  brightening: { market: 'Nurx $30 + fees · Agency $55', position: 'high' },
  'even-tone-cream': { market: 'Musely Spot Cream $36 · Nurx $30 · Strut $69', position: 'high' },
  'hq-free': { market: 'Musely $36 · Strut $49 · Agency $55', position: 'high' },
  'clear-skin-capsules': { market: 'Nurx $40 + $40 consult', position: 'cheapest' },
  'nad-plus': { market: 'System $129–179 · Eden $91 + $99/mo membership · Ivím $129 + $75 · Protocole $249', position: 'cheapest' },
  'nad-nasal': { market: 'System $129–179 · Eden $112 + membership', position: 'cheapest' },
  glutathione: { market: 'System $119–149 · Eden $95 + membership · Hone $99 + membership · Protocole $199', position: 'middle' },
  'mic-b12': { market: 'System $89 · Eden $73 + membership · HydraMed $125–145', position: 'high' },
  'methylene-blue': { market: 'Eden $89 + membership', position: 'cheapest' },
  'hrt-cream': { market: 'Winona $89 · Henry Meds $149 · Midi $90 + visit fees', position: 'cheapest' },
};
