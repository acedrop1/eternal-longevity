import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminSubscriptions, type SubRow } from '@/components/admin/AdminSubscriptions';
import { getSession, loginUrl } from '@/lib/auth-server';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';

export const metadata: Metadata = { title: 'Subscriptions' };
export const dynamic = 'force-dynamic';

/**
 * Every plan, across every member: who, what, how much, and when it renews
 * (and, for 12 month plans, when the second box ships). Soonest renewal first.
 */
export default async function AdminSubscriptionsPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  let rows: SubRow[] = [];
  if (supabaseAdminConfigured()) {
    const db = createSupabaseAdminClient();
    const { data: subs } = await db
      .from('subscriptions')
      .select('id, user_id, product_name, status, cadence_label, per_cycle_cents, next_billing_date, next_shipment_date, last_charged_at, prescription_id, created_at')
      .order('next_billing_date', { ascending: true, nullsFirst: false })
      .limit(2000);
    const userIds = [...new Set((subs ?? []).map((s) => s.user_id))];
    const rxIds = [...new Set((subs ?? []).map((s) => s.prescription_id).filter((x): x is string => Boolean(x)))];
    const [{ data: people }, { data: rxs }] = await Promise.all([
      userIds.length ? db.from('profiles').select('id, full_name, email').in('id', userIds) : Promise.resolve({ data: [] }),
      rxIds.length ? db.from('prescriptions').select('id, refills_remaining, expires_at').in('id', rxIds) : Promise.resolve({ data: [] }),
    ]);
    const who = new Map((people ?? []).map((p) => [p.id, p]));
    const rx = new Map((rxs ?? []).map((r) => [r.id, r]));
    const plansPer = new Map<string, number>();
    for (const s of subs ?? []) if (s.status === 'active' || s.status === 'paused') plansPer.set(s.user_id, (plansPer.get(s.user_id) ?? 0) + 1);

    rows = (subs ?? []).map((s) => {
      const p = who.get(s.user_id);
      const r = s.prescription_id ? rx.get(s.prescription_id) : undefined;
      return {
        id: s.id,
        userId: s.user_id,
        member: p?.full_name || 'Unnamed',
        email: p?.email ?? '',
        product: s.product_name,
        plan: s.cadence_label ?? '—',
        perCycle: (s.per_cycle_cents ?? 0) / 100,
        status: s.status,
        nextBilling: s.next_billing_date,
        nextShipment: s.next_shipment_date,
        lastCharged: s.last_charged_at,
        refillsLeft: r?.refills_remaining ?? null,
        rxExpires: r?.expires_at ?? null,
        otherPlans: Math.max(0, (plansPer.get(s.user_id) ?? 1) - 1),
      };
    });
  }

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <AdminSubscriptions rows={rows} />
    </PortalShell>
  );
}
