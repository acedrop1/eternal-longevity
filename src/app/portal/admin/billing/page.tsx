import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import {
  AdminBilling,
  type BillingCustomer,
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
  { label: 'Pharmacy', href: '/portal/admin/pharmacy' },
  { label: 'Settings', href: '/portal/admin/settings' },
];

// Stand-in customers for demo mode (no Supabase connected).
const DEMO_CUSTOMERS: BillingCustomer[] = [
  { id: 'demo-1', name: 'Marcus Tran', email: 'marcus@example.com' },
  { id: 'demo-2', name: 'Lena Ruiz', email: 'lena@example.com' },
  { id: 'demo-3', name: 'Sam Patel', email: 'sam@example.com' },
];

export default async function AdminBillingPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

  let customers: BillingCustomer[] = DEMO_CUSTOMERS;

  if (supabaseAdminConfigured()) {
    try {
      const db = createSupabaseAdminClient();
      const { data } = await db
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'member')
        .order('created_at', { ascending: false })
        .limit(200);
      if (data && data.length > 0) {
        customers = data.map((p) => ({
          id: p.id,
          name: p.full_name ?? 'Member',
          email: p.email ?? '',
        }));
      }
    } catch {
      // Fall back to demo customers.
    }
  }

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="mb-10">
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
          Bill a customer.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Customers add their own cards through Stripe&apos;s secure pages. From
          here you can subscribe them, charge a one-off amount, or issue a
          refund. The app never sees or stores a raw card number.
        </p>
      </div>

      <AdminBilling customers={customers} live={billingConfigured()} />
    </PortalShell>
  );
}
