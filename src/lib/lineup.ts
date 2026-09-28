/**
 * The full MedShiftRx lineup, grouped the way people shop (Hims-style
 * categories). Drives the category pages, the Shop mega menu and the mobile
 * menu in the redesign.
 *
 * `live` points at a product in the real catalogue (Admin → Products): while
 * that product is live the row is listed, shows its image and price and links
 * to its product page. Drafts are not listed at all unless LIST_DRAFTS is on.
 * ponytail: static list; move into Admin → Products before launch so checkout
 * and Stripe prices exist for every row.
 */

/**
 * Also list rows whose product isn't live yet, as "Coming soon" with no price,
 * linking to the assessment. Off until the payment processor clears the
 * lineup; the owner flips it. The lineup holds no NEVER_LIVE ids.
 */
export const LIST_DRAFTS = false;

export type Form = 'injection' | 'nasal' | 'capsule' | 'tablet' | 'cream' | 'foam';

export interface LineupItem {
  slug: string;
  name: string;
  /** What it's for, in plain words. */
  what: string;
  form: Form;
  live?: string;
  /** Product shot for items that aren't live yet (live items use the catalogue image). */
  image?: string;
  /** Shown only while the product is live. */
  badge?: 'New';
}

/**
 * The "from $X/mo" price for a product: its cheapest plan per month (the
 * 6-month plan, else quarterly). Lives here, not in shopProducts, so the menu
 * and tiles can use it without pulling the whole catalogue into the bundle.
 */
export function fromPrice(pricing: { quarterly: number; sixMonth?: number }): number {
  const q = Math.round(pricing.quarterly / 3);
  return pricing.sixMonth ? Math.min(q, Math.round(pricing.sixMonth / 6)) : q;
}

export interface Category {
  slug: string;
  name: string;
  /** One-line promise for the category hero and the menu. */
  line: string;
  image: string;
  /** Soft tile colour behind items that don't have a render yet. */
  tint: string;
  items: LineupItem[];
  /** Products whose home is another category that also belong here (e.g. Spironolactone: hair and skin). */
  also?: string[];
}

const PRIMARY: Category[] = [
  {
    slug: 'longevity',
    name: 'Longevity',
    line: 'Peptides, NAD+ and more, studied for energy and healthy ageing.',
    image: '/brand/cat-longevity.jpg',
    tint: 'bg-butter-soft',
    items: [
      { slug: 'nad-plus', name: 'NAD+ injection', what: 'Studied for cellular energy', form: 'injection', live: 'nad-plus' },
      { slug: 'glutathione', name: 'Glutathione injection', what: 'Antioxidant tripeptide', form: 'injection', live: 'glutathione' },
      { slug: 'nad-nasal', name: 'NAD+ nasal spray', what: 'NAD+ without the needle', form: 'nasal', live: 'nad-nasal', badge: 'New', image: '/brand/products/nad-nasal.jpg' },
      { slug: 'mic-b12', name: 'MIC + B12 injection', what: 'Vitamin B12 with lipotropics', form: 'injection', live: 'mic-b12', image: '/brand/products/mic-b12.jpg' },
      { slug: 'methylene-blue', name: 'Methylene blue', what: 'Studied for focus & cognition', form: 'capsule', live: 'methylene-blue', badge: 'New', image: '/brand/products/methylene-blue.jpg' },
    ],
  },
  {
    slug: 'sexual-health',
    name: 'Sexual health',
    line: 'Desire, performance and connection, for men and women.',
    image: '/brand/cat-sexual.jpg',
    tint: 'bg-[#FFE4D6]',
    items: [
      { slug: 'pt-141', name: 'PT-141 injection', what: 'Peptide studied for low desire', form: 'injection', live: 'pt-141' },
      { slug: 'ed-dual', name: 'ED Dual', what: 'Sildenafil + tadalafil in one', form: 'tablet', live: 'ed-dual', badge: 'New', image: '/brand/products/ed-dual.jpg' },
      { slug: 'sildenafil', name: 'Sildenafil', what: 'As-needed ED treatment', form: 'capsule', live: 'sildenafil', image: '/brand/products/sildenafil.jpg' },
      { slug: 'oxytocin', name: 'Oxytocin', what: 'Peptide hormone, studied for intimacy', form: 'tablet', live: 'oxytocin', image: '/brand/products/oxytocin.jpg' },
    ],
  },
  {
    slug: 'hormones',
    name: 'Hormones',
    line: 'Menopause care for women and hormone options for men, reviewed by a physician.',
    image: '/brand/cat-hormones.jpg',
    tint: 'bg-sky/40',
    items: [
      { slug: 'enclomiphene', name: 'Enclomiphene', what: 'For men: may help the body make its own testosterone', form: 'capsule', live: 'enclomiphene', badge: 'New', image: '/brand/products/enclomiphene.jpg' },
      { slug: 'hrt-cream', name: 'Bioidentical HRT cream', what: 'Menopause support for women', form: 'cream', live: 'hrt-cream', image: '/brand/products/hrt-cream.jpg' },
    ],
    also: ['oxytocin'],
  },
  {
    slug: 'hair',
    name: 'Hair',
    line: 'Treatments studied for hair loss, prescribed by a physician.',
    image: '/brand/cat-hair.jpg',
    tint: 'bg-milk-deep',
    items: [
      { slug: 'fin-min-capsule', name: 'Finasteride + minoxidil', what: 'For men: one daily capsule for hair loss', form: 'capsule', live: 'fin-min-capsule', badge: 'New', image: '/brand/products/fin-min-capsule.jpg' },
      { slug: 'fin-min-foam', name: 'Finasteride + minoxidil foam', what: 'For men: hair-loss foam, no pill', form: 'foam', live: 'fin-min-foam', image: '/brand/products/fin-min-foam.jpg' },
      { slug: 'min-12-fin', name: 'Minoxidil 12% + finasteride', what: 'For men: higher-strength topical foam', form: 'foam', live: 'min-12-fin', image: '/brand/products/min-12-fin.jpg' },
      { slug: 'fin-min-tret', name: 'Hair foam + tretinoin', what: 'For men: finasteride, minoxidil & tretinoin', form: 'foam', live: 'fin-min-tret', badge: 'New', image: '/brand/products/fin-min-tret.jpg' },
      { slug: 'finasteride', name: 'Finasteride', what: 'For men: may help slow hair loss', form: 'tablet', live: 'finasteride', image: '/brand/products/finasteride.jpg' },
      { slug: 'oral-minoxidil', name: 'Oral minoxidil', what: 'Low-dose tablet, prescribed off-label for hair loss', form: 'tablet', live: 'oral-minoxidil', image: '/brand/products/oral-minoxidil.jpg' },
      { slug: 'spironolactone', name: 'Spironolactone', what: 'For women: thinning hair & hormonal acne', form: 'capsule', live: 'spironolactone', image: '/brand/products/spironolactone.jpg' },
    ],
  },
  {
    slug: 'skin',
    name: 'Skin',
    line: 'Prescription skincare, made to order for your skin.',
    image: '/brand/cat-skin.jpg',
    tint: 'bg-lilac/40',
    items: [
      { slug: 'glow-cream', name: 'Glow cream', what: 'Retinoid + hyaluronic acid + vitamin C', form: 'cream', live: 'glow-cream', badge: 'New', image: '/brand/products/glow-cream.jpg' },
      { slug: 'tretinoin', name: 'Anti-aging tretinoin', what: 'Fine lines & texture', form: 'cream', live: 'tretinoin', image: '/brand/products/tretinoin.jpg' },
      { slug: 'acne-cream', name: 'Acne cream', what: 'Tretinoin 0.1% + clindamycin', form: 'cream', live: 'acne-cream', image: '/brand/products/acne-cream.jpg' },
      { slug: 'brightening', name: 'Brightening cream', what: 'Dark spots: hydroquinone 4% + vitamin C', form: 'cream', live: 'brightening', image: '/brand/products/brightening.jpg' },
      { slug: 'melasma', name: 'Melasma cream', what: 'Hydroquinone 8% formula', form: 'cream', live: 'melasma', image: '/brand/products/melasma.jpg' },
      { slug: 'hq-free', name: 'Hydroquinone-free brightening', what: 'Kojic acid + vitamin C + hyaluronic acid', form: 'cream', live: 'hq-free', badge: 'New', image: '/brand/products/hq-free.jpg' },
      { slug: 'rosacea', name: 'Rosacea & acne capsules', what: 'Doxycycline 50 mg, prescribed off-label', form: 'capsule', live: 'rosacea', image: '/brand/products/rosacea.jpg' },
    ],
    also: ['spironolactone'],
  },
];

/** Every product once, with its home category (counts, search, menus). */
export const ALL_ITEMS = PRIMARY.flatMap((c) => c.items.map((item) => ({ item, category: c })));

/** Categories as shown: home products first, then cross-listed ones. */
export const CATEGORIES: Category[] = PRIMARY.map((c) => ({
  ...c,
  items: [...c.items, ...(c.also ?? []).map((slug) => ALL_ITEMS.find((x) => x.item.slug === slug)!.item)],
}));

export const getCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

/**
 * The lineup as listed publicly: only rows whose catalogue product is live
 * (plus drafts when LIST_DRAFTS). Every category stays, possibly empty, so
 * callers decide whether to hide it or say more is coming.
 */
export function listedCategories(liveIds: Iterable<string>): Category[] {
  const live = new Set(liveIds);
  return CATEGORIES.map((c) => ({ ...c, items: c.items.filter((i) => LIST_DRAFTS || (i.live !== undefined && live.has(i.live))) }));
}

/** Each listed product once (home category first), for counts and search. */
export const listedItems = (cats: Category[]) =>
  [...new Map(cats.flatMap((c) => c.items.map((item) => [item.slug, { item, category: c }] as const))).values()];

/** "1 treatment" / "N treatments", or "Coming soon" for none. */
export const countLabel = (n: number) => (n ? `${n} ${n === 1 ? 'treatment' : 'treatments'}` : 'Coming soon');

/** Product page only when the catalogue product is live (pass it); otherwise the assessment. */
export const hrefFor = (item: LineupItem, live?: { id: string }) => (live ? `/shop/${live.id}` : `/start?product=${item.slug}`);

export const FORM_LABEL: Record<Form, string> = {
  injection: 'Injection',
  nasal: 'Nasal spray',
  capsule: 'Capsule',
  tablet: 'Tablet',
  cream: 'Cream',
  foam: 'Foam',
};
