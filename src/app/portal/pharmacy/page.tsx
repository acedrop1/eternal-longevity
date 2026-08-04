import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import {
  PharmacyQueue,
  type PharmacyOrderView,
  type FulfillmentItemView,
} from '@/components/pharmacy/PharmacyQueue';
import { getSession } from '@/lib/auth-server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Pharmacy | Eternal Longevity',
};

// Empty fallback: renders only if the Supabase query fails. Never invent
// patient or order data on a staff screen.
const DEMO_ORDERS: PharmacyOrderView[] = [];

function rowToView(row: {
  id: string;
  order_ref: string;
  patient_name: string;
  patient_dob: string | null;
  shipping_address: unknown;
  prescriber_name: string | null;
  prescriber_npi: string | null;
  items: unknown;
  status: string;
  tracking_carrier: string | null;
  tracking_number: string | null;
}): PharmacyOrderView {
  return {
    id: row.id,
    orderRef: row.order_ref,
    patientName: row.patient_name,
    patientDob: row.patient_dob,
    address:
      (row.shipping_address as PharmacyOrderView['address']) ?? null,
    prescriberName: row.prescriber_name,
    prescriberNpi: row.prescriber_npi,
    items: Array.isArray(row.items)
      ? (row.items as FulfillmentItemView[])
      : [],
    status: row.status,
    trackingCarrier: row.tracking_carrier,
    trackingNumber: row.tracking_number,
  };
}

export default async function PharmacyPortalPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'pharmacy') redirect(user.redirectTo);

  const live = supabaseAdminConfigured();
  let orders: PharmacyOrderView[] = DEMO_ORDERS;

  if (live) {
    try {
      const db = createSupabaseAdminClient();
      const { data } = await db
        .from('fulfillment_orders')
        .select('*')
        .in('status', ['submitted', 'accepted', 'shipped', 'delivered'])
        .order('created_at', { ascending: false })
        .limit(200);
      if (data) orders = data.map(rowToView);
    } catch {
      // fall back to demo orders
    }
  }

  return (
    <PortalShell
      user={user}
      nav={[{ label: 'Orders', href: '/portal/pharmacy' }]}
    >
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          FULFILLMENT QUEUE
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(1.85rem, 4vw, 2.75rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Orders to fulfill.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Accept each order, compound it, then add the shipment tracking. The
          patient is notified automatically when you add tracking.
        </p>
      </div>

      <PharmacyQueue orders={orders} live={live} />
    </PortalShell>
  );
}
