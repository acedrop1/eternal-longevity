import type { CatalogProduct } from './catalog';
import type { PharmacyItem } from './pharmacy-catalog';
import type { ProductInput } from './product-actions';
import { offersTwelveMonth } from './shopProducts';

/** A stored product as the editor's form (Admin → Products, Admin → Pricing). */
export function toProductInput(p: CatalogProduct, rx: PharmacyItem): ProductInput {
  return {
    id: p.id,
    isNew: false,
    status: p.status,
    name: p.name,
    tagline: p.tagline,
    category: p.category,
    delivery: p.delivery,
    cycleLength: p.cycleLength,
    shortDescription: p.shortDescription,
    longDescription: p.longDescription,
    bestFor: p.bestFor,
    benefits: p.benefits,
    whatsIncluded: p.whatsIncluded,
    sideEffects: p.sideEffects,
    contraindications: p.contraindications,
    pricing: p.pricing,
    twelveMonthPlan: offersTwelveMonth(p),
    image: p.image,
    popular: Boolean(p.popular),
    fdaApproved: Boolean(p.fdaApproved),
    addon: Boolean(p.addon),
    addonPitch: p.addonPitch ?? '',
    addonFor: p.addonFor ?? [],
    pharmacy: { ...rx, sku: rx.sku ?? '', defaultSig: rx.defaultSig ?? '' },
  };
}
