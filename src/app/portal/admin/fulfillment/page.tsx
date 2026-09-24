import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { AdminLiveOrders } from '@/components/admin/AdminLiveOrders';
import { AdminFulfillment, type ReadyRxView } from '@/components/admin/AdminFulfillment';
import { FulfillmentBoard } from '@/components/fulfillment/FulfillmentBoard';
import { loadFulfillmentBoard, type BoardRow } from '@/lib/fulfillment-core';
import { getSession } from '@/lib/auth-server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { ADMIN_NAV } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Fulfillment',
};


// Empty fallback: renders only if the Supabase query fails. Never invent
// patient or order data on a staff screen.
const DEMO_READY: ReadyRxView[] = [];

export default async function AdminFulfillmentPage() {
  const user = await getSession();
  if (!user) redirect('/login');
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

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div>
        <p className="mb-2 font-mono text-[12px] text-foreground/55">
          Orders
        </p>
        <h1
          className="font-display font-normal text-foreground"
          style={{
            fontSize: 'clamp(1.8rem, 1.5vw + 1rem, 2.6rem)',
            fontStretch: '75%',
            lineHeight: 1.05,
          }}
        >
          Every order, and where it is.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Every paid order, new or refill, lands in <b>To place</b>. Place it
          in the Formula Health portal and mark it placed; Dr. Elder sees the
          same board, so whoever places it first marks it. Then add tracking
          and mark it delivered, and the patient is emailed at each step.
        </p>
      </div>

      <div className="mt-10">
        <FulfillmentBoard rows={board} />
      </div>

      <div className="mt-12">
        <AdminLiveOrders />
      </div>

      <AdminFulfillment readyPrescriptions={ready} live={live} />
    </PortalShell>
  );
}
