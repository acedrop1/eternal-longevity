'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ShopProduct } from '@/lib/shopProducts';
import { buildShowcase, type ShowcaseItem } from '@/lib/showcase';

/**
 * Live catalogue for client components (product strip, rail, price chart,
 * cart). The root layout loads it on the server from lib/catalog and passes
 * it down once, so client code never reaches for the seed file directly.
 */
interface CatalogValue {
  /** Live products only. */
  products: ShopProduct[];
  /** Live products as showcase cards, plus local-preview cards in development. */
  showcase: ShowcaseItem[];
}

const CatalogContext = createContext<CatalogValue>({ products: [], showcase: [] });

export function CatalogProvider({ products, children }: { products: ShopProduct[]; children: ReactNode }) {
  const value = useMemo(() => ({ products, showcase: buildShowcase(products) }), [products]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  return useContext(CatalogContext);
}
