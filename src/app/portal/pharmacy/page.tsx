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

const DEMO_ORDERS: PharmacyOrderView[] = [
  {
    id: 'demo-f1',
    orderRef: 'FUL-DEMO01',
    patientName: 'Marcus Tran',
    patientDob: '1988-03-12',
    address: {
      line1: '1402 Garden St',
      line2: 'Apt 4B',
      city: 'Hoboken',
      state: 'NJ',
      zip: '07030',
    },
    prescriberName: 'Dr. M. Reyes',
    prescriberNpi: '1841299300',
    items: [
      {
        product: 'BPC-157 / TB-500',
        strength: '10 mg / 10 mg',
        size: '5 mL Vial',
        quantity: 1,
      },
    ],
    status: 'submitted',
    trackingCarrier: null,
    trackingNumber: null,
  },
  {
    id: 'demo-f2',
    orderRef: 'FUL-DEMO02',
    patientName: 'Lena Ruiz',
    patientDob: '1991-07-29',
    address: {
      line1: '88 Hudson Ave',
      city: 'Jersey City',
      state: 'NJ',
      zip: '07302',
    },
    prescriberName: 'Dr. M. Reyes',
    prescriberNpi: '1841299300',
    items: [
      {
        product: 'CJC-1295 / Ipamorelin',
        strength: '6 mg / 12 mg',
        size: '5 mL Vial',
        quantity: 1,
      },
    ],
    status: 'accepted',
    trackingCarrier: null,
    trackingNumber: null,
  },
];

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
