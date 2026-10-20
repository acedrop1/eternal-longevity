import 'server-only';

/**
 * RxHere's live catalog and our products' live prices (admin only).
 *
 * The catalog is read through the API and kept for an hour per server, so
 * margins, Admin → Pharmacy and the cost snapshot at payment all use what
 * RxHere charges today without calling it on every request. No key, or no
 * answer: callers fall back to the stored cost (lib/pharmacy-catalog).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { listCatalog } from '@/lib/rxhere';
import { catalogItems, type RxHereCatalogItem } from '@/lib/rxhere-rules';
import { getCatalog, getPharmacyEntries } from '@/lib/catalog';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';

const MAX_AGE_MS = 60 * 60_000;
const PAGES = 10; // ponytail: 1,000 products; raise if RxHere's catalog outgrows it
let memo: { at: number; items: RxHereCatalogItem[] } | null = null;

/** Every catalog product, at most an hour old. Null when there is no key or RxHere did not answer. */
export async function liveCatalog(): Promise<RxHereCatalogItem[] | null> {
  if (memo && Date.now() - memo.at < MAX_AGE_MS) return memo.items;
  if (!process.env.RXHERE_API_TOKEN) return null;
  let items: RxHereCatalogItem[] = [];
  for (let page = 1; page <= PAGES; page++) {
    const res = await listCatalog({ page, limit: 100 });
    if (!res.ok) return memo?.items ?? null;
    const batch = catalogItems(res.data);
    items = items.concat(batch);
    if (batch.length < 100) break;
  }
  memo = { at: Date.now(), items };
  return items;
}

/** catalog id → dollars per unit, or null. Never slower than `waitMs` (the payment path calls this). */
export async function livePrices(waitMs = 15_000): Promise<Map<string, number> | null> {
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), waitMs));
  const items = await Promise.race([liveCatalog().catch(() => null), timeout]);
  if (!items) return null;
  return new Map(items.filter((i) => typeof i.price_cents === 'number').map((i) => [i.id, i.price_cents! / 100]));
}

export interface OurPriceRow {
  productId: string;
  name: string;
  status: string;
  catalogId: string | null;
  catalogName: string | null;
  /** RxHere's price now, per unit. */
  live: number | null;
  /** The cost we store (Admin → Products / the seed). */
  stored: number;
}

/** Our products against RxHere today, for Admin → Pharmacy. */
export async function ourProductPrices(): Promise<OurPriceRow[]> {
  const [products, entries, items] = await Promise.all([getCatalog(), getPharmacyEntries(), liveCatalog().catch(() => null)]);
  const byId = new Map((items ?? []).map((i) => [i.id, i]));
  return products.map((p) => {
    const e = entries[p.id];
    const item = e?.sku ? byId.get(e.sku) : undefined;
    return {
      productId: p.id,
      name: p.name,
      status: p.status,
      catalogId: e?.sku ?? null,
      catalogName: item ? item.name : null,
      live: typeof item?.price_cents === 'number' ? item.price_cents / 100 : null,
      stored: e?.unitCost ?? 0,
    };
  });
}

const SNAPSHOT_KEY = 'rxhere_prices';
const db = () => createSupabaseAdminClient() as unknown as SupabaseClient;

/**
 * The daily check: our products whose RxHere price moved since the last run.
 * Keeps the last seen prices in site_settings; the first run only records.
 */
export async function priceChangesSinceLastCheck(): Promise<{ name: string; productId: string; from: number; to: number }[]> {
  if (!supabaseAdminConfigured()) return [];
  const rows = (await ourProductPrices()).filter((r) => r.live !== null && r.catalogId);
  if (!rows.length) return [];
  const { data } = await db().from('site_settings').select('value').eq('key', SNAPSHOT_KEY).maybeSingle();
  const before = (data?.value ?? null) as Record<string, number> | null;
  const now = Object.fromEntries(rows.map((r) => [r.catalogId!, r.live!]));
  await db().from('site_settings').upsert({ key: SNAPSHOT_KEY, value: now, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (!before) return [];
  return rows
    .filter((r) => typeof before[r.catalogId!] === 'number' && before[r.catalogId!] !== r.live)
    .map((r) => ({ name: r.name, productId: r.productId, from: before[r.catalogId!], to: r.live! }));
}

/** The pharmacy entries with each unit cost replaced by RxHere's live price where there is one (admin margin pages). */
export async function withLiveCosts<T extends { sku: string | null; unitCost: number }>(entries: Record<string, T>): Promise<Record<string, T>> {
  const live = await livePrices(5_000);
  if (!live) return entries;
  return Object.fromEntries(
    Object.entries(entries).map(([id, e]) => [id, e.sku && live.has(e.sku) ? { ...e, unitCost: live.get(e.sku)! } : e]),
  );
}
