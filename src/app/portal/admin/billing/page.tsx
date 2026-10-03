import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import {
  AdminBilling,
  type BillingCustomer,
  type BillingSummary,
} from '@/components/admin/AdminBilling';
import { getSession, loginUrl } from '@/lib/auth-server';
import { billingConfigured } from '@/lib/billing';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { ADMIN_NAV } from '@/components/portal/ui';
import { monthlyRecurringCents, paidRevenue } from '@/lib/revenue';
import { AdminPageHeader } from '@/components/admin/IndexTable';
import type { PromoCode } from '@/lib/promo-db';

export const metadata: Metadata = {
  title: 'Billing',
};


/*
 * Empty fallbacks, deliberately. These render only if the Supabase query
 * fails; showing invented customers or revenue to an admin would be worse
 * than showing nothing.
 */
const DEMO_CUSTOMERS: BillingCustomer[] = [];

const DEMO_SUMMARY: BillingSummary = {
  activeSubscriptions: 0,
  cycleRevenueCents: 0,
  paidOrders: 0,
  lifetimeRevenueCents: 0,
  recent: [],
};

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function AdminBillingPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  let customers: BillingCustomer[] = DEMO_CUSTOMERS;
  let summary: BillingSummary = DEMO_SUMMARY;

  if (supabaseAdminConfigured()) {
    try {
      const db = createSupabaseAdminClient();
      const [{ data: profiles }, { data: subs }, { data: orders }, paid] =
        await Promise.all([
          db
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'member')
            .order('created_at', { ascending: false })
            .limit(500),
          db.from('subscriptions').select('status, per_cycle_cents, cadence_label'),
          db
            .from('orders')
            .select('order_number, status, total_cents, created_at, paid_confirmed_at')
            .order('created_at', { ascending: false })
            .limit(100),
          // One definition of revenue for Overview, Billing and the daily report.
          paidRevenue(db),
        ]);

      if (profiles && profiles.length > 0) {
        customers = profiles.map((p) => ({
          id: p.id,
          name: p.full_name ?? 'Member',
          email: p.email ?? '',
        }));
      }

      const activeSubs = (subs ?? []).filter((s) => s.status === 'active');
      summary = {
        activeSubscriptions: activeSubs.length,
        cycleRevenueCents: monthlyRecurringCents(activeSubs),
        paidOrders: paid.orders,
        lifetimeRevenueCents: paid.cents,
        recent: (orders ?? []).slice(0, 6).map((o) => ({
          label: o.order_number,
          amountCents: o.total_cents ?? 0,
          when: fmtWhen(o.created_at),
          status: o.status,
          paid: Boolean(o.paid_confirmed_at),
        })),
      };
    } catch {
      customers = DEMO_CUSTOMERS;
      summary = DEMO_SUMMARY;
    }
  }

  // Dev only: sample rows so the page can be designed without Supabase.
  // NODE_ENV is inlined at build, so production never loads the fixture.
  let sampleCodes: PromoCode[] | undefined;
  if (process.env.NODE_ENV === 'development' && !supabaseAdminConfigured()) {
    const sample = await import('@/components/admin/dev-sample');
    customers = sample.SAMPLE_BILLING_CUSTOMERS;
    summary = sample.SAMPLE_BILLING_SUMMARY;
    sampleCodes = sample.SAMPLE_PROMOS;
  }

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <AdminPageHeader
        title="Billing"
        subtitle="Revenue totals, discount codes, and billing for a single customer."
      />

      <div className="mt-5">
        <AdminBilling
          customers={customers}
          live={billingConfigured()}
          summary={summary}
          sampleCodes={sampleCodes}
        />
      </div>
    </PortalShell>
  );
}
