import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { AdminQueueList } from '@/components/admin/AdminQueueList';
import { getSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Review Queue | Eternal Longevity',
};

const ADMIN_NAV = [
  { label: 'Overview', href: '/portal/admin' },
  { label: 'Members', href: '/portal/admin/members' },
  { label: 'Queue', href: '/portal/admin/queue' },
  { label: 'Billing', href: '/portal/admin/billing' },
  { label: 'Fulfillment', href: '/portal/admin/fulfillment' },
  { label: 'Pharmacy', href: '/portal/admin/pharmacy' },
  { label: 'Settings', href: '/portal/admin/settings' },
];

export default async function AdminQueuePage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          REVIEW QUEUE · ADMIN TRIAGE
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(1.85rem, 4vw, 2.75rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Triage incoming orders.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Every new order lands here first. Approve and assign to a licensed
          physician, or deny with a reason. Once you assign, the order moves to
          the chosen physician&apos;s clinical queue.
        </p>
      </div>

      <AdminQueueList />
    </PortalShell>
  );
}
