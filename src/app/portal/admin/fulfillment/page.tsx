import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { AdminFulfillment, type ReadyRxView } from '@/components/admin/AdminFulfillment';
import { FulfillmentBoard } from '@/components/fulfillment/FulfillmentBoard';
import { loadFulfillmentBoard, type BoardRow } from '@/lib/fulfillment-core';
import { getSession, loginUrl } from '@/lib/auth-server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminPageHeader } from '@/components/admin/IndexTable';
import type { Order } from '@/lib/orders';

export const metadata: Metadata = {
  title: 'Fulfillment',
};


// Empty fallback: renders only if the Supabase query fails. Never invent
// patient or order data on a staff screen.
const DEMO_READY: ReadyRxView[] = [];

export default async function AdminFulfillmentPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const live = supabaseAdminConfigured();
  let ready: ReadyRxView[] = DEMO_READY;
  let board: BoardRow[] = [];

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
      board = await loadFulfillmentBoard();


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
    }
  }

  // Dev only: sample rows so the index can be designed without Supabase.
  // NODE_ENV is inlined at build, so production never loads the fixture.
  let sampleOrders: Order[] | undefined;
  if (process.env.NODE_ENV === 'development' && !live) {
    const sample = await import('@/components/admin/dev-sample');
    board = sample.SAMPLE_BOARD;
    ready = sample.SAMPLE_READY;
    sampleOrders = sample.SAMPLE_ORDERS;
  }

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <AdminPageHeader
        title="Orders"
        subtitle="Place each paid order with the pharmacy and mark it here. The prescriber sees the same list; patients are emailed at each step."
      />

      {!live && (
        <p className="mt-4 rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
          {sampleOrders ? 'Sample data (dev only). ' : 'Demo data. '}
          Real prescriptions and orders flow through once Supabase is connected.
        </p>
      )}

      <div className="mt-5">
        <FulfillmentBoard rows={board} admin sampleOrders={sampleOrders} />
      </div>

      <div className="mt-6">
        <AdminFulfillment readyPrescriptions={ready} />
      </div>
    </PortalShell>
  );
}
