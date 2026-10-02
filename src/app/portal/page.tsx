import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession, loginUrl } from '@/lib/auth-server';
import { getPendingVisit } from '@/lib/intake-actions';
import { intakeNeedsInfo, intakeStateFor, latestIntakeAnswers, pendingMediaFor } from '@/lib/intake-status';
import { loadCart } from '@/lib/profile-db';
import { memberNextStep } from '@/lib/member-next-step';
import { listOrders } from '@/lib/orders-db';
import { listOpenCheckinsForUser } from '@/lib/checkins-db';
import { STATUS_LABEL } from '@/lib/orders';
import { listMyMessages } from '@/lib/messages-db';
import { threadStatuses } from '@/lib/prescriber-view';
import { MEMBER_NAV, PageHeader, StatusChip, panel, sentenceCase } from '@/components/portal/ui';
import { listAssessmentDrafts } from '@/lib/assessment-drafts';
import { getAnyShopProduct } from '@/lib/shopProducts';
import { CATEGORY_LABEL } from '@/lib/intake-categories';
import { isCategoryKey } from '@/lib/intakeSchema';
import { formatDate } from '@/lib/format';

/** "Continue your Finasteride visit": what the unfinished run was for, and where it resumes. */
function resumeFor(entry: string): { title: string; href: string } {
  const product = getAnyShopProduct(entry);
  if (product) return { title: `Continue your ${product.name} visit`, href: `/start?product=${encodeURIComponent(entry)}` };
  if (isCategoryKey(entry)) return { title: `Continue your ${CATEGORY_LABEL[entry].toLowerCase()} visit`, href: `/start?category=${entry}` };
  return { title: 'Continue your assessment', href: '/start' };
}

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
  if (!user) redirect(await loginUrl());
  if (user.role !== 'member') redirect(user.redirectTo);

  const [pendingVisit, media, orders, checkins, doctorThread, drafts, state, latestAnswers, cart, needsInfo] = await Promise.all([
    getPendingVisit(),
    pendingMediaFor(user.id),
    listOrders().catch(() => []),
    listOpenCheckinsForUser(user.id).catch(() => []),
    listMyMessages('doctor').catch(() => []),
    listAssessmentDrafts().catch(() => []),
    intakeStateFor(user.id),
    latestIntakeAnswers(user.id),
    loadCart().catch(() => ({ items: [] })),
    intakeNeedsInfo(user.id).catch(() => false),
  ]);
  const unfinished = drafts[0] ? { ...drafts[0], ...resumeFor(drafts[0].entry) } : null;
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
  const next = memberNextStep({
    state,
    latestAnswers,
    orders,
    cart: cart.items,
    photosOwed: media.photos,
    hasDraft: Boolean(unfinished),
    needsInfo,
  });
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
          pendingVisit || preview || media.photos || unfinished || next
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

      {/* An assessment they started and left: the first thing to offer back. */}
      {unfinished && (
        <section
          aria-labelledby="resume-visit"
          className="rounded-shell bg-butter-soft p-5 ring-1 ring-butter-deep md:p-6"
        >
          <p className="mb-1 text-[13px] font-medium text-ink/60">Pick up where you left off</p>
          <h2
            id="resume-visit"
            className="text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[26px]"
          >
            {unfinished.title}
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10"
              role="progressbar"
              aria-label="Assessment progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={unfinished.progress}
            >
              <div className="h-full rounded-full bg-butter-deep" style={{ width: `${unfinished.progress}%` }} />
            </div>
            <span className="flex-none text-[13px] font-medium tabular-nums text-ink/60">
              {unfinished.progress}% done
            </span>
          </div>
          <p className="mt-2 text-[14px] text-ink/60">
            Your answers are saved. Last updated {formatDate(unfinished.updatedAt)}.
          </p>
          <Link
            href={unfinished.href}
            className="group mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-ink/85 sm:inline-flex sm:w-auto"
          >
            Continue
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </section>
      )}

      {/* One next step, named for the product it is about. Shown only when
          there is no unfinished assessment to continue (that card is the step). */}
      {next && !unfinished && (
        <section
          aria-labelledby="next-step"
          className="rounded-shell bg-butter-soft p-5 ring-1 ring-butter-deep md:p-6"
        >
          <p className="mb-1 text-[13px] font-medium text-ink/60">{next.eyebrow}</p>
          <h2
            id="next-step"
            className="text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[26px]"
          >
            {next.title}
          </h2>
          <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-ink-soft">{next.body}</p>
          <Link
            href={next.cta.href}
            className="group mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-ink/85 sm:inline-flex sm:w-auto"
          >
            {next.cta.label}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </section>
      )}
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
