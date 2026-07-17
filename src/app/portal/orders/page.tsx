import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { MemberOrdersList } from '@/components/orders/MemberOrdersList';
import {
  MemberOrderHistory,
  type MemberOrderView,
} from '@/components/orders/MemberOrderHistory';
import { getSession } from '@/lib/auth-server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Orders | Eternal Longevity',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

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
    <PortalShell
      user={user}
      nav={[
        { label: 'Dashboard', href: '/portal' },
        { label: 'Shop', href: '/portal/shop' },
        { label: 'Orders', href: '/portal/orders' },
        { label: 'Subscriptions', href: '/portal/subscriptions' },
        { label: 'Account', href: '/portal/account' },
      ]}
    >
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          ORDERS
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Your shipments &amp; receipts.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Every cycle you&apos;ve ordered, with live status from order
          confirmation through delivery.
        </p>
      </div>

      {live ? (
        <MemberOrderHistory orders={orders} />
      ) : (
        <MemberOrdersList memberEmail={user.email} />
      )}
    </PortalShell>
  );
}
