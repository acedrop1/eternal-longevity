/**
 * What the pharmacy needs to know about each product we sell, keyed by our
 * product id (the catalogue id, which is also the lineup's `live` id).
 *
 * This is the SEED. The owner edits every field below in Admin → Products
 * (stored with the product, see lib/catalog); `pharmacyEntryFor` in
 * lib/catalog lays those values over this file, and everything that sends or
 * prefills reads that, never this map directly.
 *
 * Fields:
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
  'nad-plus': { sku: 'AA-NAD-02', name: 'NAD+ Injection', strength: '200 mg/mL', size: '5 mL Vial', dosageForm: 'Injectable Solution', defaultSig: null, quantity: 1 },
  glutathione: { sku: 'AA-GSH', name: 'Glutathione Injection', strength: '200 mg/mL', size: '10 mL Vial', dosageForm: 'Injectable Solution', defaultSig: null, quantity: 1 },
  'nad-nasal': { sku: 'AA-NADN', name: 'NAD+ Nasal Spray', strength: '300 mg/mL', size: '10 mL Bottle', dosageForm: 'Nasal Spray', defaultSig: null, quantity: 1 },
  'mic-b12': { sku: 'FL-LPB', name: 'MIC + B12 Lipotropic Injection', strength: 'Methionine 25 mg / Inositol 50 mg / Choline 50 mg / B12 1 mg per mL', size: '10 mL Vial', dosageForm: 'Injectable Solution', defaultSig: null, quantity: 1 },
  'methylene-blue': { sku: 'AA-MB', name: 'Methylene Blue', strength: '10 mg', size: '30 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 30 },

  // Sexual health
  'pt-141': { sku: 'SX-PT1', name: 'PT-141 (Bremelanotide) Injection', strength: '2 mg/mL', size: '5 mL Vial', dosageForm: 'Injectable Solution', defaultSig: null, quantity: 1 },
  'sildenafil-tadalafil': { sku: 'SX-STS', name: 'Sildenafil + Tadalafil Troche', strength: 'Sildenafil 120 mg / Tadalafil 22 mg', size: '30 Troches', dosageForm: 'Sublingual Troche', defaultSig: null, quantity: 30 },
  sildenafil: { sku: 'SX-SLD-02', name: 'Sildenafil', strength: '100 mg', size: '8 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 8 },
  oxytocin: { sku: 'HR-OXT', name: 'Oxytocin', strength: '50 IU', size: '30 Tablets', dosageForm: 'Rapid-Dissolve Tablet', defaultSig: null, quantity: 30 },
  enclomiphene: { sku: 'HR-ECC', name: 'Enclomiphene', strength: '12.5 mg', size: '30 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 30 },
  'hrt-cream': { sku: 'HR-EP', name: 'Estradiol + Progesterone Cream', strength: 'Estradiol 1 mg / Progesterone 100 mg per mL', size: '30 mL Tube', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1 },

  // Hair
  'fin-min-capsule': { sku: 'SK-FM-03', name: 'Finasteride + Minoxidil', strength: 'Finasteride 1 mg / Minoxidil 2.5 mg', size: '30 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 30 },
  'fin-min-foam': { sku: 'SK-FM', name: 'Finasteride + Minoxidil Topical Foam', strength: 'Finasteride 0.25 mg / Minoxidil 5 mg', size: '30 mL', dosageForm: 'Topical Foam', defaultSig: null, quantity: 1 },
  'min-12-fin': { sku: 'SK-FM-02', name: 'Minoxidil 12% + Finasteride Topical Foam', strength: 'Finasteride 0.25 mg / Minoxidil 12%', size: '30 mL', dosageForm: 'Topical Foam', defaultSig: null, quantity: 1 },
  'fin-min-tret': { sku: 'SK-FMT', name: 'Finasteride + Minoxidil + Tretinoin Topical Foam', strength: 'Finasteride 0.25 mg / Minoxidil 5 mg / Tretinoin 0.03%', size: '30 mL', dosageForm: 'Topical Foam', defaultSig: null, quantity: 1 },
  finasteride: { sku: 'SK-FIN-02', name: 'Finasteride', strength: '1 mg', size: '30 Tablets', dosageForm: 'Oral Tablet', defaultSig: null, quantity: 30 },
  'oral-minoxidil': { sku: 'SK-MNX', name: 'Minoxidil', strength: '2.5 mg', size: '30 Tablets', dosageForm: 'Oral Tablet', defaultSig: null, quantity: 30 },
  spironolactone: { sku: 'WL-SPR-02', name: 'Spironolactone SR', strength: '55 mg', size: '30 Capsules', dosageForm: 'Oral Capsule, Sustained Release', defaultSig: null, quantity: 30 },

  // Skin
  'glow-cream': { sku: 'DM-RA1', name: 'Tretinoin + Hyaluronic Acid + Vitamin C Cream', strength: 'Tretinoin 0.05% / Hyaluronic Acid 0.1% / Vitamin C 2%', size: '30 g Jar', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1 },
  tretinoin: { sku: 'SK-TRT-02', name: 'Tretinoin Cream', strength: '0.02%', size: '30 mL', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1 },
  'clear-skin-cream': { sku: 'DM-RA5', name: 'Tretinoin + Clindamycin Cream', strength: 'Tretinoin 0.1% / Clindamycin 2%', size: '30 g Jar', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1 },
  brightening: { sku: 'DM-HQ4A', name: 'Hydroquinone + Vitamin C Cream', strength: 'Hydroquinone 4% / Vitamin C 2%', size: '30 g Jar', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1 },
  'even-tone-cream': { sku: 'DM-HQ8A', name: 'Hydroquinone + Tretinoin + Hydrocortisone Cream', strength: 'Hydroquinone 8% / Tretinoin 0.05% / Hydrocortisone 2.5%', size: '20 g Tube', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1 },
  'hq-free': { sku: 'DM-KAH', name: 'Kojic Acid + Vitamin C + Hyaluronic Acid Cream', strength: 'Kojic Acid 5% / Vitamin C 2% / Hyaluronic Acid 0.5%', size: '30 g Jar', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1 },
  'clear-skin-capsules': { sku: 'WL-DOX-03', name: 'Doxycycline', strength: '50 mg', size: '30 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 30 },
};


/** The pharmacy fields Admin → Products stores with a product (lib/catalog). */
export interface StoredPharmacy {
  sku: string | null;
  quantity: number;
  defaultSig: string | null;
  name: string;
  strength: string;
  size: string;
  dosageForm: string;
}

const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Stored admin values over the seed. Once saved, the SKU and directions are the
 * admin's (blank = none); the name/strength/size/form fall back to the seed when
 * left blank; units fall back unless a whole number of at least 1.
 */
export function mergePharmacy(seed: PharmacyItem | undefined, stored: Partial<StoredPharmacy> | undefined, productName = ''): PharmacyItem {
  const s = stored ?? {};
  const owned = (k: 'sku' | 'defaultSig') => (k in s ? trim(s[k]) || null : (seed?.[k] ?? null));
  const label = (k: 'strength' | 'size' | 'dosageForm') => trim(s[k]) || seed?.[k] || '';
  return {
    sku: owned('sku'),
    defaultSig: owned('defaultSig'),
    name: trim(s.name) || seed?.name || productName,
    strength: label('strength'),
    size: label('size'),
    dosageForm: label('dosageForm'),
    quantity: Number.isInteger(s.quantity) && s.quantity! >= 1 ? s.quantity! : (seed?.quantity ?? 1),
  };
}

const SKU = /^[A-Za-z0-9._/-]+$/;

/** Validates the Admin → Products pharmacy section. Pure, so it can be checked outside Next. */
export function cleanPharmacy(input: unknown): { ok: true; value: StoredPharmacy } | { ok: false; message: string } {
  const p = (input ?? {}) as Record<string, unknown>;
  const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const sku = String(p.sku ?? '').trim();
  if (sku.length > 80 || (sku && !SKU.test(sku))) {
    return { ok: false, message: 'The pharmacy SKU is up to 80 letters, numbers, dashes, dots, underscores or slashes, with no spaces.' };
  }
  const quantity = Number(p.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
    return { ok: false, message: 'Units per 30-day supply is a whole number from 1 to 1,000.' };
  }
  const defaultSig = String(p.defaultSig ?? '').trim();
  if (defaultSig.length > 1000) return { ok: false, message: 'Default directions are 1,000 characters max.' };
  return {
    ok: true,
    value: {
      sku: sku || null,
      quantity,
      defaultSig: defaultSig || null,
      name: text(p.name, 120),
      strength: text(p.strength, 120),
      size: text(p.size, 120),
      dosageForm: text(p.dosageForm, 120),
    },
  };
}

// How each product ships (and what shipping costs the customer): see lib/shipping.
