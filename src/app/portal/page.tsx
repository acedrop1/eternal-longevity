import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import { getPendingVisit } from '@/lib/intake-actions';
import { getOnboardingSteps } from '@/lib/onboarding';
import { OnboardingChecklist } from '@/components/portal/OnboardingChecklist';
import { listOrders } from '@/lib/orders-db';
import { STATUS_LABEL } from '@/lib/orders';
import { MEMBER_NAV, PageHeader, StatusChip, panel, sentenceCase } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Portal',
};

/**
 * Member home. Deliberately minimal: a greeting, ONE required action if there
 * is one, the latest order's status, and three big tiles. Everything else
 * lives on its own page.
 */
export default async function MemberPortalPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  const [pendingVisit, orders] = await Promise.all([
    getPendingVisit(),
    listOrders().catch(() => []),
  ]);
  const onboarding = await getOnboardingSteps(orders);
  const latest = orders[0] ?? null;
  const firstName = (user.name ?? 'there').trim().split(/\s+/)[0];

  const tiles = [
    {
      href: '/portal/shop',
      title: 'Shop',
      body: 'Browse the peptide catalog.',
    },
    {
      href: '/portal/orders',
      title: 'Orders',
      body: latest
        ? `Latest: ${sentenceCase(STATUS_LABEL[latest.status] ?? latest.status)}`
        : 'No orders yet.',
    },
    {
      href: '/portal/messages',
      title: 'Messages',
      body: 'Your care team and doctor.',
    },
  ];

  return (
    <PortalShell user={user} nav={MEMBER_NAV}>
      <PageHeader
        title={`Hi ${firstName}.`}
        intro={
          pendingVisit
            ? 'One thing needs your attention.'
            : latest
              ? 'Everything is on track.'
              : 'Ready when you are.'
        }
      />

      <OnboardingChecklist steps={onboarding} />

      {/* The visit used to get its own REQUIRED card here. The checklist
          above already opens on whichever step is outstanding, so this was the
          same call to action twice on one screen. */}
      {/* Latest order, one line */}
      {latest && (
        <Link
          href="/portal/orders"
          className={`${panel} flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[#EAEAE7] md:px-6 md:py-5`}
        >
          <div className="min-w-0">
            <p className="mb-1 font-mono text-[13px] text-black/55">Latest order</p>
            <p className="truncate text-[15px] text-black">
              {latest.lines.map((l) => l.productName).join(', ')}
            </p>
          </div>
          <span className="flex-none">
            <StatusChip tone="gold">
              {sentenceCase(STATUS_LABEL[latest.status] ?? latest.status)}
            </StatusChip>
          </span>
        </Link>
      )}

      {/* Three tiles. That's the whole dashboard. */}
      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group flex flex-col rounded-[4px] bg-white p-5 ring-1 ring-black/10 transition-colors hover:bg-[#F2F2F0] md:p-6"
          >
            <p
              className="font-display font-normal text-black"
              style={{ fontSize: '1.5rem', fontStretch: '75%', lineHeight: 1.1 }}
            >
              {t.title}
            </p>
            <p className="mt-1.5 text-[15px] text-black/60">{t.body}</p>
            <span
              aria-hidden
              className="mt-6 font-mono text-[13px] text-black/45 transition-transform group-hover:translate-x-1 group-hover:text-black"
            >
              →
            </span>
          </Link>
        ))}
      </div>

      <p className="text-[14px] text-black/55">
        Need anything?{' '}
        <Link
          href="/portal/messages"
          className="text-black underline decoration-black/40 underline-offset-[3px] hover:decoration-black"
        >
          Message us
        </Link>{' '}
        — replies within one business day.
      </p>
    </PortalShell>
  );
}
