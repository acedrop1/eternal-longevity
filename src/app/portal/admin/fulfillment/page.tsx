import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import {
  AdminFulfillment,
  type ReadyRxView,
  type SubmittedOrderView,
} from '@/components/admin/AdminFulfillment';
import { getSession } from '@/lib/auth-server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Fulfillment | Eternal Longevity',
};

const ADMIN_NAV = [
  { label: 'Overview', href: '/portal/admin' },
  { label: 'Members', href: '/portal/admin/members' },
  { label: 'Queue', href: '/portal/admin/queue' },
  { label: 'Billing', href: '/portal/admin/billing' },
  { label: 'Orders', href: '/portal/admin/fulfillment' },
  { label: 'Pharmacy', href: '/portal/admin/pharmacy' },
  { label: 'Settings', href: '/portal/admin/settings' },
];

const DEMO_READY: ReadyRxView[] = [
  {
    kind: 'prescription',
    id: 'demo-rx1',
    patientName: 'Priya Nair',
    protocolName: 'Recover Protocol',
  },
  {
    kind: 'prescription',
    id: 'demo-rx2',
    patientName: 'Hadi Karam',
    protocolName: 'Longevity Protocol',
  },
  {
    kind: 'draft',
    id: 'demo-draft1',
    patientName: 'Marcus Tran',
    protocolName: 'Refill cycle',
  },
];

const DEMO_SUBMITTED: SubmittedOrderView[] = [
  {
    id: 'demo-f1',
    orderRef: 'FUL-DEMO01',
    patientName: 'Marcus Tran',
    status: 'submitted',
    trackingCarrier: null,
    trackingNumber: null,
  },
  {
    id: 'demo-f2',
    orderRef: 'FUL-DEMO02',
    patientName: 'Lena Ruiz',
    status: 'shipped',
    trackingCarrier: 'FedEx',
    trackingNumber: '7712 4408 9921',
  },
];

export default async function AdminFulfillmentPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

  const live = supabaseAdminConfigured();
  let ready: ReadyRxView[] = DEMO_READY;
  let submitted: SubmittedOrderView[] = DEMO_SUBMITTED;

  if (live) {
    try {
      const db = createSupabaseAdminClient();

      const [{ data: rxs }, { data: orders }] = await Promise.all([
        db
          .from('prescriptions')
          .select('id, protocol_name, user_id')
          .eq('status', 'signed'),
        db
          .from('fulfillment_orders')
          .select(
            'id, order_ref, prescription_id, patient_name, status, cycle_label, tracking_carrier, tracking_number',
          )
          .order('created_at', { ascending: false }),
      ]);

      const allOrders = orders ?? [];

      submitted = allOrders
        .filter((o) => o.status !== 'draft')
        .map((o) => ({
          id: o.id,
          orderRef: o.order_ref,
          patientName: o.patient_name,
          status: o.status,
          trackingCarrier: o.tracking_carrier,
          trackingNumber: o.tracking_number,
        }));

      // Auto-generated refill drafts join the ready-to-submit list.
      const draftItems: ReadyRxView[] = allOrders
        .filter((o) => o.status === 'draft')
        .map((o) => ({
          kind: 'draft' as const,
          id: o.id,
          patientName: o.patient_name,
          protocolName: o.cycle_label ?? 'Refill cycle',
        }));

      const orderedRxIds = new Set(
        allOrders
          .map((o) => o.prescription_id)
          .filter((id): id is string => Boolean(id)),
      );
      const pending = (rxs ?? []).filter((r) => !orderedRxIds.has(r.id));

      // Resolve patient names for pending prescriptions.
      const userIds = [...new Set(pending.map((r) => r.user_id).filter(Boolean))];
      const nameById = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await db
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds as string[]);
        for (const p of profiles ?? []) {
          nameById.set(p.id, p.full_name ?? 'Patient');
        }
      }

      ready = [
        ...pending.map((r) => ({
          kind: 'prescription' as const,
          id: r.id,
          patientName: r.user_id
            ? nameById.get(r.user_id) ?? 'Patient'
            : 'Patient',
          protocolName: r.protocol_name,
        })),
        ...draftItems,
      ];
    } catch {
      ready = DEMO_READY;
      submitted = DEMO_SUBMITTED;
    }
  }

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          ORDERS
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(1.85rem, 4vw, 2.75rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Submit orders to the pharmacy.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Once a physician signs a prescription it lands here. Submit it to
          Kaduceus and they drop-ship straight to the patient — track every
          order through to delivery.
        </p>
      </div>

      <AdminFulfillment
        readyPrescriptions={ready}
        submittedOrders={submitted}
        live={live}
      />
    </PortalShell>
  );
}
