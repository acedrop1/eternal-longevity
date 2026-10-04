import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { SubscriptionsManager } from '@/components/portal/SubscriptionsManager';
import { getSession, loginUrl } from '@/lib/auth-server';
import { loadSubscriptions } from '@/lib/member-portal';
import { MEMBER_NAV, PageHeader } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Treatments',
};

export default async function SubscriptionsPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'member') redirect(user.redirectTo);

  const plans = await loadSubscriptions(user.id);
  const active = plans.filter((s) => s.status === 'active').length;

  return (
    <PortalShell user={user} nav={MEMBER_NAV}>
      <PageHeader
        title="Your treatments"
        intro={
          plans.length
            ? `${active} active plan${active === 1 ? '' : 's'}. Change, skip or pause any time before your next charge.`
            : 'Your plans live here once Dr. Elder approves a treatment.'
        }
      />

      <SubscriptionsManager subscriptions={plans} />

      {/* With nothing to manage, the manager's empty state already points at the shop. */}
      {plans.length > 0 && (
        <div>
          <Link
            href="/shop"
            className="inline-flex min-h-[44px] items-center text-[16px] font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
          >
            Start a new treatment
          </Link>
        </div>
      )}
    </PortalShell>
  );
}
