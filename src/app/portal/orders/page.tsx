import type { Metadata } from 'next';
import { formatDate as fmtDate } from '@/lib/format';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { MemberOrdersList } from '@/components/orders/MemberOrdersList';
import {
  MemberOrderHistory,
  type MemberOrderView,
} from '@/components/orders/MemberOrderHistory';
import { getSession } from '@/lib/auth-server';
import { MEMBER_NAV, PageHeader } from '@/components/portal/ui';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Orders',
};


function flattenItems(raw: unknown): { label: string; detail: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((it) => {
    const o =
      it && typeof it === 'object' ? (it as Record<string, unknown>) : {};
    const label = String(o.name ?? o.product ?? o.productName ?? 'Item');
    const detail = [
      o.dose,
      o.strength,
      o.size,
      o.quantity ? `x${o.quantity}` : '',
    ]
      .filter(Boolean)
      .map(String)
      .join(' ');
    return { label, detail };
  });
}

export default async function OrdersPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  const live = supabaseAdminConfigured();
  let orders: MemberOrderView[] = [];

  if (live) {
    try {
      const db = createSupabaseAdminClient();
      const { data } = await db
        .from('fulfillment_orders')
        .select(
          'id, order_ref, status, items, tracking_carrier, tracking_number, created_at',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) {
        orders = data.map((o) => ({
          id: o.id,
          ref: o.order_ref,
          status: o.status,
          placedAt: fmtDate(o.created_at),
          items: flattenItems(o.items),
          trackingCarrier: o.tracking_carrier,
          trackingNumber: o.tracking_number,
        }));
      }
    } catch {
      orders = [];
    }
  }

  return (
    <PortalShell user={user} nav={MEMBER_NAV}>
      <PageHeader
        title="Your shipments & receipts."
        intro="Every cycle you've ordered, with live status from order confirmation through delivery."
      />

      {/* Two complementary views: the workflow orders the member placed, and
          the pharmacy shipment history from fulfillment_orders. */}
      <MemberOrdersList memberEmail={user.email} />
      {live && orders.length > 0 && <MemberOrderHistory orders={orders} />}
    </PortalShell>
  );
}
