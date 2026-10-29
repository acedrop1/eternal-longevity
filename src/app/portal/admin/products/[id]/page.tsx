import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminProductEditor } from '@/components/admin/AdminProductEditor';
import { getSession, loginUrl } from '@/lib/auth-server';
import { catalogStore, getCatalog, getCatalogProduct, pharmacyEntryFor } from '@/lib/catalog';
import type { ProductInput } from '@/lib/product-actions';
import { toProductInput } from '@/lib/product-input';
import { getShippingCost, getShippingSettings } from '@/lib/shipping-settings';
import { shippingCostFor } from '@/lib/shipping';
import { liveCatalog } from '@/lib/pharmacy-prices';
import { PRODUCT_CATEGORY } from '@/lib/intake-categories';
import type { DeliveryForm, ShopCategory } from '@/lib/shopProducts';

export const metadata: Metadata = { title: 'Edit product' };
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  /** new?rx=<RxHere catalog id>: "Add to site" from Admin → Pharmacy. */
  searchParams: Promise<{ rx?: string }>;
}

/** RxHere's catalog categories → our shop categories (hormones sit under longevity, as enclomiphene does). */
const RX_CATEGORY: Record<string, ShopCategory> = {
  'Weight Loss & Metabolic Health': 'metabolic',
  'Cognitive & Mood Support': 'cognitive',
  'Beauty, Skin & Hair': 'skin-hair',
  'Sexual Health': 'sexual',
  'Pain, Injury & Joint Support': 'recovery',
  'Performance Optimization': 'growth',
  'Immune & Inflammation Support': 'immune',
};

/** A new draft filled in from one RxHere catalog product; copy, price and photo are left to the admin. */
async function fromRxHere(rxId: string): Promise<ProductInput | null> {
  const item = (await liveCatalog().catch(() => null))?.find((i) => i.id === rxId);
  if (!item || item.controlled_substance) return null;
  const form = (item.dosage_form ?? '').toLowerCase();
  const delivery: DeliveryForm = /inject/.test(form) ? 'sq' : /nasal/.test(form) ? 'nasal' : /cream|foam|solution|gel|ointment/.test(form) ? 'topical' : 'oral';
  const strength = Array.isArray(item.strengths) ? item.strengths.join(' / ') : item.strengths ? String(item.strengths) : '';
  // Capsules, tablets and troches are priced per unit: 30 a month to start. Vials, tubes and sprays: one.
  const perUnit = /capsule|tablet|troche|insert/.test(form);
  const name = item.name.slice(0, 60);
  return {
    ...BLANK,
    id: `${name}${strength ? ` ${strength}` : ''}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40).replace(/-$/, ''),
    name,
    category: RX_CATEGORY[item.category ?? ''] ?? 'longevity',
    delivery,
    pharmacy: {
      sku: item.id,
      quantity: perUnit ? 30 : 1,
      defaultSig: '',
      name: item.name,
      strength,
      size: '',
      dosageForm: item.dosage_form ?? '',
      unitCost: typeof item.price_cents === 'number' ? item.price_cents / 100 : 0,
    },
  };
}

// A new product starts as a draft: nothing reaches the site until an admin
// fills it in and deliberately sets it live.
const BLANK: ProductInput = {
  id: '',
  isNew: true,
  status: 'draft',
  name: '',
  tagline: '',
  category: 'longevity',
  delivery: 'sq',
  cycleLength: '12-week cycle',
  shortDescription: '',
  longDescription: '',
  bestFor: '',
  benefits: [],
  whatsIncluded: [],
  sideEffects: [],
  contraindications: [],
  pricing: { monthly: 199, quarterly: 540, sixMonth: 1020, annual: 2040 },
  twelveMonthPlan: false,
  image: '',
  popular: false,
  fdaApproved: false,
  addon: false,
  addonPitch: '',
  addonFor: [],
  pharmacy: { sku: '', quantity: 1, defaultSig: '', name: '', strength: '', size: '', dosageForm: '', unitCost: 0 },
};

export default async function AdminProductPage({ params, searchParams }: PageProps) {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const { id } = await params;
  let initial: ProductInput = BLANK;
  let storage: 'refrigerated' | 'room' | undefined;
  if (id !== 'new') {
    const [p, rx] = await Promise.all([getCatalogProduct(id), pharmacyEntryFor(id)]);
    if (!p || !rx) notFound();
    storage = p.storage;
    initial = toProductInput(p, rx);
  } else {
    const { rx } = await searchParams;
    if (rx) initial = (await fromRxHere(rx)) ?? BLANK;
  }
  // The assessment knows its products by id (lib/intake-categories); one it doesn't know can't go live.
  const inAssessment = Boolean(PRODUCT_CATEGORY[initial.id]);

  // Previous / next product, as Shopify's arrows in the page header.
  const ids = (await getCatalog()).map((x) => x.id);
  const at = ids.indexOf(id);
  const nav = at >= 0 ? { prev: ids[at - 1] ?? null, next: ids[at + 1] ?? null } : { prev: null, next: null };

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      {!inAssessment && (
        <p className="mb-4 rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[14px] leading-relaxed text-amber-900">
          Draft only for now. Before this product can go live it needs its assessment questions and safety screening added to
          the site, and Dr. Elder&apos;s sign-off on the wording. Fill in the copy, price and photo here, then ask for it to be
          added to the assessment.
        </p>
      )}
      <AdminProductEditor
        initial={initial}
        canSave={catalogStore() !== 'none'}
        storage={storage}
        shipping={await getShippingSettings()}
        shipCost={shippingCostFor(storage, await getShippingCost())}
        nav={nav}
      />
    </PortalShell>
  );
}
