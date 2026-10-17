import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminPageHeader } from '@/components/admin/IndexTable';
import { getSession, loginUrl } from '@/lib/auth-server';
import { getLiveProducts, getPharmacyEntries } from '@/lib/catalog';
import { SHOP_CATEGORIES, offersTwelveMonth } from '@/lib/shopProducts';
import { SHIPPING_COST } from '@/lib/shipping';
import { getShippingSettings } from '@/lib/shipping-settings';
import { COMPETITORS_CHECKED, COMPETITOR_PRICES } from '@/lib/competitor-prices';
import { PricingEditor, type PricingRow } from './PricingEditor';

export const metadata: Metadata = { title: 'Pricing' };
export const dynamic = 'force-dynamic';

/**
 * Admin → Pricing: every live product's cost to us (pharmacy unit cost in
 * Admin → Products, from the RxHere portal price), what each plan charges,
 * and what we keep after shipping and card fees, beside what competitors
 * charge. Same math as Products (lib/profit planEconomics). Admin only.
 */
export default async function AdminPricingPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const [products, pharmacy, shipping] = await Promise.all([getLiveProducts(), getPharmacyEntries(), getShippingSettings()]);
  const order = SHOP_CATEGORIES.map((c) => c.key);
  const rows: PricingRow[] = products
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name))
    .map((p) => {
      const rx = pharmacy[p.id];
      return {
        id: p.id,
        name: p.name,
        sub: rx ? [rx.strength, rx.size].filter(Boolean).join(' · ') : '',
        pricing: p.pricing,
        twelveMonthPlan: offersTwelveMonth(p),
        unitCost: rx?.unitCost ?? 0,
        quantity: rx?.quantity ?? 1,
        storage: p.storage,
        comp: COMPETITOR_PRICES[p.id],
      };
    });

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="space-y-5">
        <AdminPageHeader
          title="Pricing"
          subtitle={`Edit any price or cost and the profit updates as you type. Competitor prices checked ${COMPETITORS_CHECKED}.`}
        />
        <p className="rounded-inner bg-milk px-4 py-2.5 text-[14px] text-ink/75">
          Profit = plan price + ${shipping.pricePerShipment} shipping per box − our cost − ${SHIPPING_COST['2_DAY']} per box we pay the
          pharmacy − card fee (3.25% + $0.30). &ldquo;First&rdquo; is a member&apos;s first order, whose first box ships free. Prices are
          what each plan bills (a 3 month plan bills 3 months at once). Saving goes through{' '}
          <Link href="/portal/admin/products" className="underline underline-offset-2">
            Products
          </Link>
          , with the same checks and audit trail.
        </p>
        <PricingEditor rows={rows} shipping={shipping} />
      </div>
    </PortalShell>
  );
}
