import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV, DOCTOR_NAV } from '@/components/portal/ui';
import { OrderDetail } from '@/components/admin/orders/OrderDetail';
import { loadFulfillmentBoard, type BoardRow } from '@/lib/fulfillment-core';
import { getOrder } from '@/lib/orders-db';
import { loadOrderExtras, type OrderExtras } from '@/lib/order-detail';
import { getSession, loginUrl } from '@/lib/auth-server';
import { supabaseAdminConfigured } from '@/lib/supabase/admin';
import type { Order } from '@/lib/orders';

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }): Promise<Metadata> {
  const ref = decodeURIComponent((await params).ref);
  return { title: `Order ${/^\d+$/.test(ref) ? `#${ref}` : ref}` };
}
export const dynamic = 'force-dynamic';

/**
 * One order, Shopify style: everything the Orders index used to expand in
 * place. Staff only. Admin and the prescriber share the fulfillment steps
 * (fulfillment-actions lets both); cancelling and the member record stay
 * admin's, as on the index.
 *
 * `ref` is the order number, or the shipment ref (FUL-…) for an old shipment
 * that has none.
 */
export default async function OrderPage({ params }: { params: Promise<{ ref: string }> }) {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin' && user.role !== 'doctor') redirect(user.redirectTo);
  const admin = user.role === 'admin';

  const { ref: raw } = await params;
  const ref = decodeURIComponent(raw);
  const live = supabaseAdminConfigured();

  let board: BoardRow | undefined;
  let order: Order | null = null;
  let extras: OrderExtras | null = null;

  if (live) {
    // ponytail: the board loader reads every open shipment and this keeps one; a single-row loader if the board grows past its 500 cap.
    const [rows, o] = await Promise.all([loadFulfillmentBoard().catch(() => [] as BoardRow[]), getOrder(ref)]);
    board = rows.find((b) => b.orderNumber === ref || b.orderRef === ref);
    order = o;
    if (order) extras = await loadOrderExtras(order.id).catch(() => null);
  } else if (process.env.NODE_ENV === 'development') {
    // Dev only, as on the index: the sample rows. NODE_ENV is inlined at build.
    const sample = await import('@/components/admin/dev-sample');
    board = sample.SAMPLE_BOARD.find((b) => b.orderNumber === ref || b.orderRef === ref);
    order = sample.SAMPLE_ORDERS.find((o) => o.id === ref) ?? null;
    if (order) {
      extras = { promoCode: order.promoCode ?? null, discount: order.discount ?? 0, prescription: sample.SAMPLE_RX[ref] ?? null };
    }
  }

  if (!board && !order) notFound();

  return (
    <PortalShell user={user} nav={admin ? ADMIN_NAV : DOCTOR_NAV}>
      <OrderDetail board={board} order={order ?? undefined} extras={extras} admin={admin} />
    </PortalShell>
  );
}
