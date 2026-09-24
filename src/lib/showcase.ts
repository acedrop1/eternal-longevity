import { getAnyShopProduct, type ShopProduct } from '@/lib/shopProducts';

/**
 * Products shown in the homepage Shop All rail and the mobile category strip.
 *
 * Live products come from the catalogue (lib/catalog, edited in Admin → Products). The preview entries render only in
 * local development (`next dev`): sermorelin is withheld, and semaglutide and
 * tirzepatide are compounded GLP-1s that the site does not sell. A production
 * build compiles `NODE_ENV === 'development'` to false and drops them, so none
 * of the three can reach etlongevity.com by accident.
 */
export interface ShowcaseItem {
  id: string;
  name: string;
  tagline: string;
  image: string;
  /**
   * Monthly price struck through beside the per-month price on the quarterly
   * plan: the same comparison the product page makes. null when unpriced.
   */
  price: { was: number; now: number } | null;
  /** null for preview cards: they have no live page to link to. */
  href: string | null;
  preview: boolean;
}

// Local-preview cards exist only in development (see PREVIEW below).
const DEV = process.env.NODE_ENV === 'development';

const priceOf = (p: ShopProduct) => ({
  was: p.pricing.monthly,
  now: Math.round(p.pricing.quarterly / 3),
});

const sermorelin = getAnyShopProduct('sermorelin');

const PREVIEW: ShowcaseItem[] =
  DEV
    ? [
        {
          id: 'sermorelin',
          name: 'Sermorelin',
          tagline: sermorelin?.tagline ?? 'Growth hormone support',
          image: sermorelin?.image ?? '/images/6.jpg',
          price: sermorelin ? priceOf(sermorelin) : null,
          href: null,
          preview: true,
        },
        { id: 'semaglutide', name: 'Semaglutide', tagline: 'Weight management', image: '/images/products/semaglutide.jpg', price: null, href: null, preview: true },
        { id: 'tirzepatide', name: 'Tirzepatide', tagline: 'Weight management', image: '/images/products/tirzepatide.jpg', price: null, href: null, preview: true },
      ]
    : [];

/**
 * Showcase list from the live catalogue (Admin → Products), plus the
 * local-preview cards in development. A preview whose product has since gone
 * live in admin is dropped so it never shows twice.
 */
export function buildShowcase(live: ShopProduct[]): ShowcaseItem[] {
  const items: ShowcaseItem[] = live.map((p) => ({
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    image: p.image,
    price: priceOf(p),
    href: `/shop/${p.id}`,
    preview: false,
  }));
  const liveIds = new Set(items.map((i) => i.id));
  return [...items, ...PREVIEW.filter((p) => !liveIds.has(p.id))];
}
