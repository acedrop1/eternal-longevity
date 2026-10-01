/**
 * What the pharmacy needs to know about each product we sell, keyed by our
 * product id (the catalogue id, which is also the lineup's `live` id).
 *
 * Plain data with no server imports: the prescriber's sign step reads
 * `defaultSig` from here to prefill the directions.
 *
 * Filled in by hand:
 *   sku         — from the pharmacy's catalogue (owner). null = not on the
 *                 API yet: the order stays on the board to place by hand,
 *                 marked "No pharmacy SKU yet".
 *   defaultSig  — the directions Dr. Elder approves for this product. Only a
 *                 prefill: he can edit it per prescription, and what he signs
 *                 is what is sent.
 *   quantity    — units for ONE month of supply. A 3- or 6-month plan ships
 *                 that many months in one package, so the order carries
 *                 quantity × months (see pharmacyQuantity).
 *
 * name / strength / size / dosageForm are what the product pages say. The
 * pharmacy keys on the SKU; these are sent alongside so the pharmacist can see
 * the order matches what was prescribed. Blank means we don't know it yet and
 * it is left out of the order.
 */

export interface PharmacyItem {
  sku: string | null;
  name: string;
  strength: string;
  size: string;
  dosageForm: string;
  defaultSig: string | null;
  quantity: number;
}

export const PHARMACY_CATALOG: Record<string, PharmacyItem> = {
  // Longevity
  'nad-plus': { sku: null, name: 'NAD+ Injection', strength: '200 mg/mL', size: '5 mL Vial', dosageForm: 'Injectable Solution', defaultSig: null, quantity: 1 },
  glutathione: { sku: null, name: 'Glutathione Injection', strength: '200 mg/mL', size: '5 mL Vial', dosageForm: 'Injectable Solution', defaultSig: null, quantity: 1 },
  'nad-nasal': { sku: null, name: 'NAD+ Nasal Spray', strength: '300 mg/mL', size: '10 mL Bottle', dosageForm: 'Nasal Spray', defaultSig: null, quantity: 1 },
  'mic-b12': { sku: null, name: 'MIC + B12 Lipotropic Injection', strength: '', size: '10 mL Vial', dosageForm: 'Injectable Solution', defaultSig: null, quantity: 1 },
  'methylene-blue': { sku: null, name: 'Methylene Blue', strength: '25 mg', size: '30 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 1 },

  // Sexual health
  'pt-141': { sku: null, name: 'PT-141 (Bremelanotide) Injection', strength: '', size: '', dosageForm: 'Injectable Solution', defaultSig: null, quantity: 1 },
  'sildenafil-tadalafil': { sku: null, name: 'Sildenafil + Tadalafil Troche', strength: 'Sildenafil 120 mg / Tadalafil 22 mg', size: '30 Troches', dosageForm: 'Sublingual Troche', defaultSig: null, quantity: 1 },
  sildenafil: { sku: null, name: 'Sildenafil', strength: '100 mg', size: '8 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 1 },
  oxytocin: { sku: null, name: 'Oxytocin', strength: '50 IU', size: '30 Tablets', dosageForm: 'Rapid-Dissolve Tablet', defaultSig: null, quantity: 1 },
  enclomiphene: { sku: null, name: 'Enclomiphene', strength: '12.5 mg', size: '30 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 1 },
  'hrt-cream': { sku: null, name: 'Estradiol + Progesterone Cream', strength: 'Estradiol 1 mg / Progesterone 100 mg per mL', size: '30 mL Tube', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1 },

  // Hair
  'fin-min-capsule': { sku: null, name: 'Finasteride + Minoxidil', strength: 'Finasteride 1 mg / Minoxidil 2.5 mg', size: '30 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 1 },
  'fin-min-foam': { sku: null, name: 'Finasteride + Minoxidil Topical Foam', strength: 'Finasteride 0.25 mg / Minoxidil 5 mg', size: '30 mL', dosageForm: 'Topical Foam', defaultSig: null, quantity: 1 },
  'min-12-fin': { sku: null, name: 'Minoxidil 12% + Finasteride Topical Foam', strength: 'Finasteride 0.25 mg / Minoxidil 12%', size: '30 mL', dosageForm: 'Topical Foam', defaultSig: null, quantity: 1 },
  'fin-min-tret': { sku: null, name: 'Finasteride + Minoxidil + Tretinoin Topical Foam', strength: 'Finasteride 0.25 mg / Minoxidil 5 mg / Tretinoin 0.03%', size: '30 mL', dosageForm: 'Topical Foam', defaultSig: null, quantity: 1 },
  finasteride: { sku: null, name: 'Finasteride', strength: '1 mg', size: '30 Tablets', dosageForm: 'Oral Tablet', defaultSig: null, quantity: 1 },
  'oral-minoxidil': { sku: null, name: 'Minoxidil', strength: '2.5 mg', size: '30 Tablets', dosageForm: 'Oral Tablet', defaultSig: null, quantity: 1 },
  spironolactone: { sku: null, name: 'Spironolactone SR', strength: '55 mg', size: '30 Capsules', dosageForm: 'Oral Capsule, Sustained Release', defaultSig: null, quantity: 1 },

  // Skin
  'glow-cream': { sku: null, name: 'Tretinoin + Hyaluronic Acid + Vitamin C Cream', strength: 'Tretinoin 0.05% / Hyaluronic Acid 0.1% / Vitamin C 2%', size: '30 g Jar', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1 },
  tretinoin: { sku: null, name: 'Tretinoin Cream', strength: '0.02%', size: '30 mL', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1 },
  'clear-skin-cream': { sku: null, name: 'Tretinoin + Clindamycin Cream', strength: 'Tretinoin 0.1% / Clindamycin 2%', size: '30 g Jar', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1 },
  brightening: { sku: null, name: 'Hydroquinone + Vitamin C Cream', strength: 'Hydroquinone 4% / Vitamin C 2%', size: '30 g Jar', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1 },
  'even-tone-cream': { sku: null, name: 'Hydroquinone + Tretinoin + Hydrocortisone Cream', strength: 'Hydroquinone 8% / Tretinoin 0.05% / Hydrocortisone 2.5%', size: '20 g Tube', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1 },
  'hq-free': { sku: null, name: 'Kojic Acid + Vitamin C + Hyaluronic Acid Cream', strength: 'Kojic Acid 5% / Vitamin C 2% / Hyaluronic Acid 0.5%', size: '30 g Jar', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1 },
  'clear-skin-capsules': { sku: null, name: 'Doxycycline', strength: '50 mg', size: '30 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 1 },
};

/**
 * How the pharmacy ships it. The one place to change it: cold-chain products
 * go overnight, everything else two-day. `storage` is the product's own field
 * (Admin → Products); unset counts as room temperature.
 */
export function shippingMethodFor(storage: 'refrigerated' | 'room' | undefined): '2_DAY' | 'OVERNIGHT' {
  return storage === 'refrigerated' ? 'OVERNIGHT' : '2_DAY';
}
