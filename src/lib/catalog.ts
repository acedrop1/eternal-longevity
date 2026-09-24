/**
 * The product catalogue, editable from Admin → Products.
 *
 * `shopProducts.ts` is the seed: every product ships with a known-good record
 * there, and with no edits the catalogue is exactly that file. Admin edits are
 * stored as one row per product and laid over the seed field by field; a row
 * with an id the seed doesn't know is a new product.
 *
 * Where the rows live:
 *   - Supabase `products` table when the service role is configured (production).
 *   - `.data/products.json` in local development without Supabase, so the
 *     admin tab can be tried on localhost. Never used in a production build.
 *   - Nowhere otherwise: the seed alone, and saving is refused.
 *
 * Status is the compliance gate. Only `live` products are listed, linked,
 * indexed or orderable; the seed marks everything on the old WITHHELD list as
 * `withheld`, so nothing changes until an admin deliberately flips a status.
 */
import 'server-only';
import { cache } from 'react';
import { promises as fs } from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SHOP_PRODUCTS, isSellable, type ShopProduct } from './shopProducts';
import { createSupabaseAdminClient, supabaseAdminConfigured } from './supabase/admin';

export type ProductStatus = 'draft' | 'live' | 'withheld';
export const PRODUCT_STATUSES: ProductStatus[] = ['live', 'draft', 'withheld'];

export interface CatalogProduct extends ShopProduct {
  status: ProductStatus;
  /** True when the record has been edited (or created) in admin. */
  edited: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

/** One stored row. `data` holds every ShopProduct field except the id. */
interface ProductRow {
  id: string;
  status: ProductStatus;
  data: Omit<ShopProduct, 'id'>;
  updated_at: string;
  updated_by: string | null;
}

const DEV_FILE = path.join(process.cwd(), '.data', 'products.json');

type Store = 'supabase' | 'file' | 'none';

export function catalogStore(): Store {
  if (supabaseAdminConfigured()) return 'supabase';
  if (process.env.NODE_ENV === 'development') return 'file';
  return 'none';
}

// The generated Database types predate this table; an untyped client keeps
// the queries honest without hand-editing the generated file.
function db(): SupabaseClient {
  return createSupabaseAdminClient() as unknown as SupabaseClient;
}

async function readRows(): Promise<ProductRow[]> {
  const store = catalogStore();
  if (store === 'supabase') {
    const { data, error } = await db().from('products').select('*');
    // A read failure falls back to the seed rather than emptying the shop.
    if (error) return [];
    return (data ?? []) as ProductRow[];
  }
  if (store === 'file') {
    try {
      return JSON.parse(await fs.readFile(DEV_FILE, 'utf8')) as ProductRow[];
    } catch {
      return [];
    }
  }
  return [];
}

export async function writeRow(row: ProductRow): Promise<void> {
  const store = catalogStore();
  if (store === 'supabase') {
    const { error } = await db().from('products').upsert(row);
    if (error) throw new Error(error.message);
    return;
  }
  if (store === 'file') {
    const rows = (await readRows()).filter((r) => r.id !== row.id);
    rows.push(row);
    await fs.mkdir(path.dirname(DEV_FILE), { recursive: true });
    await fs.writeFile(DEV_FILE, JSON.stringify(rows, null, 2));
    return;
  }
  throw new Error('Connect Supabase to save products.');
}

const seedStatus = (id: string): ProductStatus => (isSellable(id) ? 'live' : 'withheld');

/** Every product, any status, seed order first then new products by name. */
export const getCatalog = cache(async (): Promise<CatalogProduct[]> => {
  const rows = new Map((await readRows()).map((r) => [r.id, r]));

  const fromSeed: CatalogProduct[] = SHOP_PRODUCTS.map((seed) => {
    const row = rows.get(seed.id);
    rows.delete(seed.id);
    if (!row) return { ...seed, status: seedStatus(seed.id), edited: false, updatedAt: null, updatedBy: null };
    return {
      ...seed,
      ...row.data,
      id: seed.id,
      status: row.status,
      edited: true,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    };
  });

  const added: CatalogProduct[] = [...rows.values()]
    .map((row) => ({
      ...row.data,
      id: row.id,
      status: row.status,
      edited: true,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...fromSeed, ...added];
});

/** Products that may be listed, linked, indexed or ordered. */
export async function getLiveProducts(): Promise<CatalogProduct[]> {
  return (await getCatalog()).filter((p) => p.status === 'live');
}

/** A live product, or null (withheld and draft products don't exist publicly). */
export async function getLiveProduct(id: string): Promise<CatalogProduct | null> {
  return (await getLiveProducts()).find((p) => p.id === id) ?? null;
}

/** Any product regardless of status: admin editing and order history only. */
export async function getCatalogProduct(id: string): Promise<CatalogProduct | null> {
  return (await getCatalog()).find((p) => p.id === id) ?? null;
}

export async function isLive(id: string): Promise<boolean> {
  return (await getLiveProduct(id)) !== null;
}

/** Strips the catalogue-only fields so a product can go to the client as a ShopProduct. */
export function toShopProduct(p: CatalogProduct): ShopProduct {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { status, edited, updatedAt, updatedBy, ...product } = p;
  return product;
}
