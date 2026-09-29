import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import { getPendingVisit } from '@/lib/intake-actions';
import { getOnboardingSteps } from '@/lib/onboarding';
import { OnboardingChecklist } from '@/components/portal/OnboardingChecklist';
import { listOrders } from '@/lib/orders-db';
import { listOpenCheckinsForUser } from '@/lib/checkins-db';
import { STATUS_LABEL } from '@/lib/orders';
import { listMyMessages } from '@/lib/messages-db';
import { threadStatuses } from '@/lib/prescriber-view';
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

  const [pendingVisit, orders, checkins, doctorThread] = await Promise.all([
    getPendingVisit(),
    listOrders().catch(() => []),
    listOpenCheckinsForUser(user.id).catch(() => []),
    listMyMessages('doctor').catch(() => []),
  ]);
  // Their own thread only (RLS). Unanswered = the prescriber spoke last.
  const question = threadStatuses(
    doctorThread.map((m) => ({
      thread_user_id: 'me',
      sender_id: m.senderRole === 'member' ? 'me' : 'staff',
      body: m.body,
      created_at: m.createdAt,
    })),
  ).me;
  const preview =
    question?.state === 'waiting'
      ? question.question.length > 140
        ? `${question.question.slice(0, 140).trimEnd()}…`
        : question.question
      : null;
  const checkin = checkins[0] ?? null;
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
          pendingVisit || preview
            ? 'One thing needs your attention.'
            : latest
              ? 'Everything is on track.'
              : 'Ready when you are.'
        }
      />

      {preview && (
        <section
          aria-labelledby="dr-question"
          className="rounded-shell bg-butter-soft p-5 ring-1 ring-butter-deep md:p-6"
        >
          <p className="mb-1 text-[13px] font-medium text-ink/60">From your prescriber</p>
          <h2
            id="dr-question"
            className="text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[26px]"
          >
            Dr. Elder has a question for you
          </h2>
          <p className="mt-3 whitespace-pre-wrap break-words rounded-inner bg-white px-4 py-3 text-[15px] leading-relaxed text-ink ring-1 ring-ink/5">
            {preview}
          </p>
          <Link
            href="/portal/messages?thread=doctor"
            className="group mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-ink/85 sm:inline-flex sm:w-auto"
          >
            Reply
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </section>
      )}

      <OnboardingChecklist steps={onboarding} />

      {/* The visit used to get its own REQUIRED card here. The checklist
          above already opens on whichever step is outstanding, so this was the
          same call to action twice on one screen. */}
      {/* Latest order, one line */}
      {latest && (
        <Link
          href="/portal/orders"
          className={`${panel} flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-milk-deep md:px-6 md:py-5`}
        >
          <div className="min-w-0">
            <p className="mb-1 text-[13px] font-medium text-ink/55">Latest order</p>
            <p className="truncate text-[15px] text-ink">
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

      {/* 30-day check-in, only while one is open. Same flow as the email. */}
      {checkin && (
        <div className={`${panel} px-5 py-4 md:px-6 md:py-5`}>
          <p className="mb-1 text-[13px] font-medium text-ink/55">Check-in</p>
          <p className="text-[15px] text-ink">
            How’s it going with your treatment? 1 = not well, 5 = very well.
          </p>
          <div className="mt-3 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Link
                key={n}
                href={`/checkin/${checkin.token}?r=${n}`}
                aria-label={`Rate ${n} out of 5`}
                className="grid h-11 w-11 place-items-center rounded-full bg-white text-[15px] font-semibold tabular-nums text-ink ring-1 ring-ink/10 transition-colors hover:bg-butter"
              >
                {n}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Three tiles. That's the whole dashboard. */}
      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group flex flex-col rounded-shell bg-white p-5 ring-1 ring-ink/5 transition-colors hover:bg-milk md:p-6"
          >
            <p className="text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[26px]">
              {t.title}
            </p>
            <p className="mt-1.5 text-[15px] text-ink-soft">{t.body}</p>
            <span
              aria-hidden
              className="mt-6 grid h-8 w-8 place-items-center rounded-full bg-milk text-[14px] font-semibold text-ink/60 transition-transform group-hover:translate-x-1 group-hover:bg-butter group-hover:text-ink"
            >
              →
            </span>
          </Link>
        ))}
      </div>

      <p className="text-[14px] text-ink/55">
        Need anything?{' '}
        <Link
          href="/portal/messages"
          className="font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
        >
          Message us
        </Link>{' '}
        — replies within one business day.
      </p>
    </PortalShell>
  );
}
