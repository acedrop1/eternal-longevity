import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminProductEditor } from '@/components/admin/AdminProductEditor';
import { getSession, loginUrl } from '@/lib/auth-server';
import { catalogStore, getCatalog, getCatalogProduct, pharmacyEntryFor } from '@/lib/catalog';
import type { ProductInput } from '@/lib/product-actions';
import { toProductInput } from '@/lib/product-input';
import { getShippingSettings } from '@/lib/shipping-settings';

export const metadata: Metadata = { title: 'Edit product' };
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
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

export default async function AdminProductPage({ params }: PageProps) {
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
  }

  // Previous / next product, as Shopify's arrows in the page header.
  const ids = (await getCatalog()).map((x) => x.id);
  const at = ids.indexOf(id);
  const nav = at >= 0 ? { prev: ids[at - 1] ?? null, next: ids[at + 1] ?? null } : { prev: null, next: null };

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <AdminProductEditor
        initial={initial}
        canSave={catalogStore() !== 'none'}
        storage={storage}
        shipping={await getShippingSettings()}
        nav={nav}
      />
    </PortalShell>
  );
}
