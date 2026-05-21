import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import {
  AdminBilling,
  type BillingCustomer,
  type BillingSummary,
} from '@/components/admin/AdminBilling';
import { getSession } from '@/lib/auth-server';
import { billingConfigured } from '@/lib/billing';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Billing | Eternal Longevity',
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

const DEMO_CUSTOMERS: BillingCustomer[] = [
  { id: 'demo-1', name: 'Marcus Thompson', email: 'marcus.t@protonmail.com' },
  { id: 'demo-2', name: 'Lena Rodriguez', email: 'lena.r@gmail.com' },
  { id: 'demo-3', name: 'Sam Park', email: 'sam.park@icloud.com' },
  { id: 'demo-4', name: 'Hadi Khoury', email: 'hadi.k@gmail.com' },
  { id: 'demo-5', name: 'Priya Narayan', email: 'priya.n@gmail.com' },
];

const DEMO_SUMMARY: BillingSummary = {
  activeSubscriptions: 38,
  cycleRevenueCents: 1_412_000,
  paidOrders: 126,
  lifetimeRevenueCents: 4_820_500,
  recent: [
    { label: 'EL-9F2K4', amountCents: 48000, when: 'Today' },
    { label: 'EL-9F1B7', amountCents: 24000, when: 'Today' },
    { label: 'EL-9EXR2', amountCents: 87000, when: 'Yesterday' },
    { label: 'EL-9EW8M', amountCents: 16000, when: 'Yesterday' },
    { label: 'EL-9ET5P', amountCents: 32000, when: '2 days ago' },
  ],
};

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const REVENUE_STATUSES = ['paid', 'compounding', 'shipped', 'delivered'];

export default async function AdminBillingPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

  let customers: BillingCustomer[] = DEMO_CUSTOMERS;
  let summary: BillingSummary = DEMO_SUMMARY;

  if (supabaseAdminConfigured()) {
    try {
      const db = createSupabaseAdminClient();
      const [{ data: profiles }, { data: subs }, { data: orders }] =
        await Promise.all([
          db
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'member')
            .order('created_at', { ascending: false })
            .limit(500),
          db.from('subscriptions').select('status, per_cycle_cents'),
          db
            .from('orders')
            .select('order_number, status, total_cents, created_at')
            .order('created_at', { ascending: false })
            .limit(100),
        ]);

      if (profiles && profiles.length > 0) {
        customers = profiles.map((p) => ({
          id: p.id,
          name: p.full_name ?? 'Member',
          email: p.email ?? '',
        }));
      }

      const activeSubs = (subs ?? []).filter((s) => s.status === 'active');
      const revenueOrders = (orders ?? []).filter((o) =>
        REVENUE_STATUSES.includes(o.status),
      );

      summary = {
        activeSubscriptions: activeSubs.length,
        cycleRevenueCents: activeSubs.reduce(
          (sum, s) => sum + (s.per_cycle_cents ?? 0),
          0,
        ),
        paidOrders: revenueOrders.length,
        lifetimeRevenueCents: revenueOrders.reduce(
          (sum, o) => sum + (o.total_cents ?? 0),
          0,
        ),
        recent: (orders ?? []).slice(0, 6).map((o) => ({
          label: o.order_number,
          amountCents: o.total_cents ?? 0,
          when: fmtWhen(o.created_at),
        })),
      };
    } catch {
      customers = DEMO_CUSTOMERS;
      summary = DEMO_SUMMARY;
    }
  }

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="mb-8">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          BILLING
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(1.85rem, 4vw, 2.75rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Revenue & billing.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          The numbers across the top are your totals. To bill a specific
          customer, search for them below. Customers add their own cards through
          Stripe — the app never stores a raw card number.
        </p>
      </div>

      <AdminBilling
        customers={customers}
        live={billingConfigured()}
        summary={summary}
      />
    </PortalShell>
  );
}
