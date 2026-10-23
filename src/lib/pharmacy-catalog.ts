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
 *   sku         — the RxHere catalog id (a UUID, Admin → Settings → Pharmacy
 *                 catalog), matched to each product on Oct 20 2026. Admin →
 *                 Products can set another catalog id; an old partner-API SKU
 *                 saved there (AA-NAD-02…) is ignored in favour of this one.
 *   defaultSig  — the directions Dr. Elder approves for this product. Only a
 *                 prefill: he can edit it per prescription, and what he signs
 *                 is what is sent.
 *   quantity    — units for ONE month of supply. A 3- or 6 month plan ships
 *                 that many months in one package, so the order carries
 *                 quantity × months (see pharmacyQuantity).
 *   unitCost    — what the pharmacy charges us per unit, in dollars, priced
 *                 the way it sells it: per vial, tube, jar or bottle, or per
 *                 capsule / tablet / troche. One month costs unitCost ×
 *                 quantity. ADMIN ONLY: feeds lib/profit, never a member or
 *                 the prescriber. RxHere catalog prices for our account,
 *                 Oct 20 2026, after RxHere's Oct 20 re-pricing.
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
  /** What the pharmacy charges us per unit, in dollars (admin only, see lib/profit). */
  unitCost: number;
}

export const PHARMACY_CATALOG: Record<string, PharmacyItem> = {
  // Longevity
  'nad-plus': { sku: 'a2cae7e8-3f40-40ef-ab1f-9ff4943bc269', name: 'NAD+ Injection', strength: '200 mg/mL', size: '5 mL Vial', dosageForm: 'Injectable Solution', defaultSig: null, quantity: 1, unitCost: 50 },
  glutathione: { sku: '3753ce95-1f64-4fa7-a1ff-d6f007518292', name: 'Glutathione Injection', strength: '200 mg/mL', size: '10 mL Vial', dosageForm: 'Injectable Solution', defaultSig: null, quantity: 1, unitCost: 25 },
  'nad-nasal': { sku: 'eb45eaaf-9a89-4fc6-be24-391575f68369', name: 'NAD+ Nasal Spray', strength: '300 mg/mL', size: '10 mL Bottle', dosageForm: 'Nasal Spray', defaultSig: null, quantity: 1, unitCost: 52.5 },
  'mic-b12': { sku: 'bba24b0e-b161-41c6-a5ee-9c60f7c77da3', name: 'MIC + B12 Lipotropic Injection', strength: 'Methionine 25 mg / Inositol 50 mg / Choline 50 mg / B12 1 mg per mL', size: '10 mL Vial', dosageForm: 'Injectable Solution', defaultSig: null, quantity: 1, unitCost: 30 },
  'methylene-blue': { sku: '23613e08-47df-4d3a-acf1-f73312561a58', name: 'Methylene Blue', strength: '10 mg', size: '30 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 30, unitCost: 0.88 },

  // Sexual health
  'pt-141': { sku: 'f700db3c-9da3-451e-8763-145da93e9899', name: 'PT-141 (Bremelanotide) Injection', strength: '2 mg/mL', size: '5 mL Vial', dosageForm: 'Injectable Solution', defaultSig: null, quantity: 1, unitCost: 73.5 },
  'sildenafil-tadalafil': { sku: '4ca875e9-9c2f-4aa6-9493-ff6b096a5b63', name: 'Sildenafil + Tadalafil Troche', strength: 'Sildenafil 120 mg / Tadalafil 22 mg', size: '8 Troches', dosageForm: 'Sublingual Troche', defaultSig: null, quantity: 8, unitCost: 1.88 },
  sildenafil: { sku: '5bfd062e-495d-4915-be9a-87ce7629cc34', name: 'Sildenafil', strength: '100 mg', size: '8 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 8, unitCost: 1.25 },
  oxytocin: { sku: '4c4170a7-2f1c-430c-9604-bc006167bb6b', name: 'Oxytocin', strength: '50 IU', size: '30 Tablets', dosageForm: 'Rapid-Dissolve Tablet', defaultSig: null, quantity: 30, unitCost: 0.94 },
  enclomiphene: { sku: '7978a96f-f53d-49c2-a313-fa9125ed3d93', name: 'Enclomiphene', strength: '12.5 mg', size: '30 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 30, unitCost: 0.84 },
  'hrt-cream': { sku: '1c64f98b-1cd6-4e75-a8f9-91decb575d4f', name: 'Estradiol + Progesterone Cream', strength: 'Estradiol 1 mg / Progesterone 100 mg per mL', size: '30 mL Tube', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1, unitCost: 21 },

  // Hair
  'fin-min-capsule': { sku: 'fb1fa801-66af-4d35-bf1e-a47d892fbd81', name: 'Finasteride + Minoxidil', strength: 'Finasteride 1 mg / Minoxidil 2.5 mg', size: '30 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 30, unitCost: 0.7 },
  'fin-min-foam': { sku: 'ba5b9e0d-d0bf-44bd-a5b5-a4cef4f8a07f', name: 'Finasteride + Minoxidil Topical Foam', strength: 'Finasteride 0.25 mg / Minoxidil 5 mg', size: '30 mL', dosageForm: 'Topical Foam', defaultSig: null, quantity: 1, unitCost: 25 },
  'min-12-fin': { sku: '4baf58e7-093e-49ca-82f6-fa00ec6f02c1', name: 'Minoxidil 12% + Finasteride Topical Foam', strength: 'Finasteride 0.25 mg / Minoxidil 12%', size: '30 mL', dosageForm: 'Topical Foam', defaultSig: null, quantity: 1, unitCost: 25 },
  'fin-min-tret': { sku: '3d58950c-8b4a-483f-accc-3027264a5291', name: 'Finasteride + Minoxidil + Tretinoin Topical Foam', strength: 'Finasteride 0.25 mg / Minoxidil 5 mg / Tretinoin 0.03%', size: '30 mL', dosageForm: 'Topical Foam', defaultSig: null, quantity: 1, unitCost: 25 },
  finasteride: { sku: '759fa50e-4f90-4e40-89b7-00488887a5af', name: 'Finasteride', strength: '1 mg', size: '30 Tablets', dosageForm: 'Oral Tablet', defaultSig: null, quantity: 30, unitCost: 0.85 },
  'oral-minoxidil': { sku: 'b0e0941e-5c4a-4496-af27-c8b29c2ba73d', name: 'Minoxidil', strength: '2.5 mg', size: '30 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 30, unitCost: 0.85 },
  spironolactone: { sku: 'f9ed0864-1b5e-4db4-8b5c-6bfbe86eeecf', name: 'Spironolactone SR', strength: '55 mg', size: '30 Capsules', dosageForm: 'Oral Capsule, Sustained Release', defaultSig: null, quantity: 30, unitCost: 0.75 },

  // Skin
  'glow-cream': { sku: 'b07040e6-6318-40b4-80a3-9a3b491ff647', name: 'Tretinoin + Hyaluronic Acid + Vitamin C Cream', strength: 'Tretinoin 0.05% / Hyaluronic Acid 0.1% / Vitamin C 2%', size: '30 g Jar', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1, unitCost: 31.5 },
  tretinoin: { sku: '60f1df3c-1e5e-4ab6-b9c3-7463787d8389', name: 'Tretinoin Cream', strength: '0.02%', size: '30 mL', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1, unitCost: 21 },
  'clear-skin-cream': { sku: 'd359c4c6-7a1e-442a-a8b0-bdba81919944', name: 'Tretinoin + Clindamycin Cream', strength: 'Tretinoin 0.1% / Clindamycin 2%', size: '30 g Jar', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1, unitCost: 31.5 },
  brightening: { sku: 'e9e95161-220f-4874-a17d-fcdc95c64c5f', name: 'Hydroquinone + Vitamin C Cream', strength: 'Hydroquinone 4% / Vitamin C 2%', size: '30 g Jar', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1, unitCost: 31.5 },
  'even-tone-cream': { sku: '94b7e7a2-d1a0-4261-89ff-6076230b66d0', name: 'Hydroquinone + Tretinoin + Hydrocortisone Cream', strength: 'Hydroquinone 8% / Tretinoin 0.05% / Hydrocortisone 2.5%', size: '20 g Tube', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1, unitCost: 31.5 },
  'hq-free': { sku: '6183e54d-1933-4d2a-94e8-7285949c098e', name: 'Kojic Acid + Vitamin C + Hyaluronic Acid Cream', strength: 'Kojic Acid 5% / Vitamin C 2% / Hyaluronic Acid 0.5%', size: '30 g Jar', dosageForm: 'Topical Cream', defaultSig: null, quantity: 1, unitCost: 31.5 },
  'clear-skin-capsules': { sku: '739e7406-8ebf-44a0-910c-28d5e79d1eac', name: 'Doxycycline', strength: '50 mg', size: '30 Capsules', dosageForm: 'Oral Capsule', defaultSig: null, quantity: 30, unitCost: 0.55 },
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
  unitCost: number;
}

const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Stored admin values over the seed. Once saved, the SKU and directions are the
 * admin's (blank = none); the name/strength/size/form fall back to the seed when
 * left blank; units fall back unless a whole number of at least 1.
 */
/** RxHere catalog id (a UUID). Inlined here: rxhere-rules is server-only and this file reaches the browser. */
const isCatalogId = (v: string | null | undefined) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((v ?? '').trim());

export function mergePharmacy(seed: PharmacyItem | undefined, stored: Partial<StoredPharmacy> | undefined, productName = ''): PharmacyItem {
  const s = stored ?? {};
  const owned = (k: 'sku' | 'defaultSig') => (k in s ? trim(s[k]) || null : (seed?.[k] ?? null));
  const label = (k: 'strength' | 'size' | 'dosageForm') => trim(s[k]) || seed?.[k] || '';
  return {
    // A real catalog id wins wherever it is; an old partner-API SKU saved in admin never hides the seed's.
    sku: isCatalogId(owned('sku')) || !isCatalogId(seed?.sku) ? owned('sku') : (seed?.sku ?? null),
    defaultSig: owned('defaultSig'),
    name: trim(s.name) || seed?.name || productName,
    strength: label('strength'),
    size: label('size'),
    dosageForm: label('dosageForm'),
    quantity: Number.isInteger(s.quantity) && s.quantity! >= 1 ? s.quantity! : (seed?.quantity ?? 1),
    // Saved cost wins (0 included); a row saved before costs existed keeps the seed's.
    unitCost: typeof s.unitCost === 'number' && Number.isFinite(s.unitCost) && s.unitCost >= 0 ? s.unitCost : (seed?.unitCost ?? 0),
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
  const unitCost = Number(String(p.unitCost ?? 0).replace(/[$,\s]/g, '') || 0);
  if (!Number.isFinite(unitCost) || unitCost < 0 || unitCost > 100_000) {
    return { ok: false, message: 'Your cost is a dollar amount from 0 to 100,000.' };
  }
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
      unitCost: Math.round(unitCost * 10_000) / 10_000,
    },
  };
}

// How each product ships (and what shipping costs the customer): see lib/shipping.
