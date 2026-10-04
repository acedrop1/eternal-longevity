import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminPageHeader, headerButton } from '@/components/admin/IndexTable';
import { AdminProductsIndex, type ProductRowView } from '@/components/admin/AdminProductsIndex';
import { getSession, loginUrl } from '@/lib/auth-server';
import { catalogStore, getCatalog, getPharmacyEntries } from '@/lib/catalog';
import { SHOP_CATEGORIES } from '@/lib/shopProducts';
import { fromPrice } from '@/lib/lineup';
import { planEconomics } from '@/lib/profit';
import { shippingPriceFor } from '@/lib/shipping';

export const metadata: Metadata = { title: 'Products' };
export const dynamic = 'force-dynamic';

const STORE_NOTE: Record<ReturnType<typeof catalogStore>, string | null> = {
  supabase: null,
  file: 'Local preview: changes save to .data/products.json on this computer and are not on the live site.',
  none: 'Connect Supabase to edit products. The site is showing the built-in catalogue.',
};

export default async function AdminProductsPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const [products, pharmacy] = await Promise.all([getCatalog(), getPharmacyEntries()]);
  const note = STORE_NOTE[catalogStore()];
  const live = products.filter((p) => p.status === 'live').length;

  const rows: ProductRowView[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    image: p.image,
    status: p.status,
    category: SHOP_CATEGORIES.find((c) => c.key === p.category)?.label ?? p.category,
    monthly: p.pricing.monthly,
    from: fromPrice(p.pricing),
    hasSku: Boolean(pharmacy[p.id]?.sku),
    // Admin only (this page redirects everyone else): profit on each plan, from lib/profit.
    plans: pharmacy[p.id]?.unitCost
      ? (
          [
            ['Monthly', p.pricing.monthly, 1],
            ['3-mo', p.pricing.quarterly, 3],
            ['6-mo', p.pricing.sixMonth ?? 0, 6],
          ] as const
        )
          .filter(([, price]) => price > 0)
          .map(([label, price, months]) => {
            const e = planEconomics(price, shippingPriceFor(p), months, { ...pharmacy[p.id], storage: p.storage });
            return { label, profit: e.profit, margin: e.margin };
          })
      : [],
    edited:
      p.edited && p.updatedAt
        ? `edited ${new Date(p.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${
            p.updatedBy ? ` by ${p.updatedBy}` : ''
          }`
        : null,
  }));

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="space-y-5">
        <AdminPageHeader
          title="Products"
          subtitle={`${products.length} products · ${live} live. Only live products appear on the site.`}
          actions={
            catalogStore() !== 'none' && (
              <Link href="/portal/admin/products/new" className={headerButton}>
                Add product
              </Link>
            )
          }
        />

        {note && (
          <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[14px] text-amber-900">{note}</p>
        )}

        <AdminProductsIndex products={rows} />
      </div>
    </PortalShell>
  );
}
