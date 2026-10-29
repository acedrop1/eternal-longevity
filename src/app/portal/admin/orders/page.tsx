import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminPageHeader, secondaryButton } from '@/components/admin/IndexTable';
import { AdminOrdersIndex, type OrderIndexRow } from '@/components/admin/AdminOrdersIndex';
import { getSession, loginUrl } from '@/lib/auth-server';
import { listOrders } from '@/lib/orders-db';
import type { Order } from '@/lib/orders';

export const metadata: Metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';

/** Payment, Shopify style, from the order's status, its payment and its refund entries. */
function paymentOf(o: Order): OrderIndexRow['payment'] {
  const notes = (o.updates ?? []).map((u) => u.note);
  if (o.status === 'refunded' || notes.some((n) => n.startsWith('Refunded in full'))) return 'Refunded';
  if (notes.some((n) => /^Refunded \$/.test(n))) return 'Partially refunded';
  if (o.paidAt) return 'Paid';
  if (o.status === 'signed') return 'Awaiting payment';
  if (['pending', 'pending-admin', 'awaiting-visit', 'assigned'].includes(o.status)) return 'Pending';
  return 'Not charged';
}

/** Fulfillment, from where the order is in its life. */
function fulfillmentOf(o: Order): OrderIndexRow['fulfillment'] {
  switch (o.status) {
    case 'pending':
    case 'pending-admin':
    case 'awaiting-visit':
      return 'Health questions';
    case 'assigned':
      return 'With prescriber';
    case 'signed':
    case 'paid':
      return 'Unfulfilled';
    case 'compounding':
      return 'In progress';
    case 'shipped':
      return 'Shipped';
    case 'delivered':
      return 'Delivered';
    case 'declined-clinical':
      return 'Declined';
    default:
      return 'Cancelled';
  }
}

/**
 * Every order, Shopify style: tabs, search, filters, sort and export. Each row
 * opens the order page (refund, cancel, timeline). The fulfillment board,
 * where paid orders are placed and shipped, stays on its own tab.
 */
export default async function AdminOrdersPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const orders = await listOrders().catch(() => []);
  const rows: OrderIndexRow[] = orders.map((o) => ({
    ref: o.id,
    placedAt: o.placedAt,
    customer: o.memberName,
    email: o.memberEmail,
    state: o.state,
    total: o.total,
    items: o.lines.map((l) => `${l.productName}${l.cadenceLabel ? ` (${l.cadenceLabel})` : ''}`).join(', '),
    status: o.status,
    payment: paymentOf(o),
    fulfillment: fulfillmentOf(o),
    tracking: o.tracking ?? '',
    promo: o.promoCode ?? '',
    archived: o.archived,
  }));

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <AdminPageHeader
        title="Orders"
        subtitle="Every order, from checkout to delivery, including cancelled, declined and refunded ones."
        actions={
          <Link href="/portal/admin/fulfillment" className={secondaryButton}>
            Fulfillment board
          </Link>
        }
      />
      <div className="mt-5">
        <AdminOrdersIndex rows={rows} />
      </div>
    </PortalShell>
  );
}
