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
import { listMyMessages } from '@/lib/messages-db';
import { threadStatuses } from '@/lib/prescriber-view';
import { MEMBER_NAV, PageHeader, btnPrimary, btnSecondary, panel } from '@/components/portal/ui';
import Image from 'next/image';
import { loadSubscriptions } from '@/lib/member-portal';
import { treatmentCards } from '@/lib/member-view';
import { memberSamples, SAMPLE_ORDERS, SAMPLE_THREADS } from '@/lib/dev-member-samples';
import { cn } from '@/lib/utils';
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
 * Member home: a greeting, ONE required action if there is one, the draft to
 * pick back up, then "Your treatments": one card per order on its way and per
 * plan, each with a plain status and one button. The tab bar / sidebar covers
 * the rest.
 */
export default async function MemberPortalPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'member') redirect(user.redirectTo);

  const [pendingVisit, media, orders, checkins, doctorThread, drafts, state, latestAnswers, cart, needsInfo, plans] = await Promise.all([
    getPendingVisit(),
    pendingMediaFor(user.id),
    // Dev without a database: sample orders and threads (lib/dev-member-samples).
    memberSamples ? SAMPLE_ORDERS : listOrders().catch(() => []),
    listOpenCheckinsForUser(user.id).catch(() => []),
    memberSamples ? SAMPLE_THREADS.doctor : listMyMessages('doctor').catch(() => []),
    listAssessmentDrafts().catch(() => []),
    intakeStateFor(user.id),
    latestIntakeAnswers(user.id),
    loadCart().catch(() => ({ items: [] })),
    intakeNeedsInfo(user.id).catch(() => false),
    loadSubscriptions(user.id).catch(() => []),
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
  const treatments = treatmentCards(orders, plans, (id) => {
    const p = getAnyShopProduct(id);
    return { image: p?.image, overnight: p?.storage === 'refrigerated' };
  });
  /*
   * An unfinished assessment stands in for "get started" and "choose your
   * plan" (continuing it is that step). Anything urgent (payment, the
   * prescriber, needs-info, a decision) still shows, above the draft.
   */
  const step =
    next && unfinished && (next.eyebrow === 'Get started' || next.title.endsWith('assessment is complete')) ? null : next;
  const firstName = (user.name ?? 'there').trim().split(/\s+/)[0];

  return (
    <PortalShell user={user} nav={MEMBER_NAV}>
      <PageHeader
        title={`Hi ${firstName}.`}
        intro={
          pendingVisit || preview || media.photos || unfinished || step
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
          <p className="mb-1 text-[14px] font-medium text-ink/70">From your prescriber</p>
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

      {/* One next step, named for the product it is about. Urgent ones sit
          above an unfinished assessment; see `step`. */}
      {step && (
        <section
          aria-labelledby="next-step"
          className="rounded-shell bg-butter-soft p-5 ring-1 ring-butter-deep md:p-6"
        >
          <p className="mb-1 text-[14px] font-medium text-ink/70">{step.eyebrow}</p>
          <h2
            id="next-step"
            className="text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[26px]"
          >
            {step.title}
          </h2>
          <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-ink-soft">{step.body}</p>
          <Link
            href={step.cta.href}
            className="group mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-ink/85 sm:inline-flex sm:w-auto"
          >
            {step.cta.label}
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
          <p className="mb-1 text-[14px] font-medium text-ink/70">Pick up where you left off</p>
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
            <span className="flex-none text-[14px] font-medium tabular-nums text-ink/70">
              {unfinished.progress}% done
            </span>
          </div>
          <p className="mt-2 text-[14px] text-ink/70">
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

      {/* Your treatments: one card per order on its way and per plan. */}
      {treatments.length > 0 && (
        <section aria-labelledby="your-treatments">
          <h2
            id="your-treatments"
            className="text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[26px]"
          >
            Your treatments
          </h2>
          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {treatments.map((t, i) => (
              <li key={t.key} className={cn(panel, 'flex flex-col p-4 md:p-5')}>
                <div className="flex flex-1 gap-4">
                  <div className="relative h-[72px] w-[72px] flex-none overflow-hidden rounded-inner bg-milk-deep md:h-20 md:w-20">
                    <Image src={t.image} alt="" fill sizes="80px" priority={i < 2} className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[18px] font-semibold leading-snug tracking-[-0.01em] text-ink">{t.name}</h3>
                    <p className="text-[15px] text-ink/70">{t.plan}</p>
                    <p
                      className={cn(
                        'mt-1.5 flex items-start gap-1.5 text-[15px] font-medium leading-snug',
                        t.tone === 'attention' ? 'text-amber-900' : 'text-ink',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'mt-[7px] h-1.5 w-1.5 flex-none rounded-full',
                          { attention: 'bg-amber-500', ok: 'bg-emerald-600', muted: 'bg-ink/30' }[t.tone],
                        )}
                      />
                      {t.status}
                    </p>
                  </div>
                </div>
                <Link
                  href={t.cta.href}
                  prefetch={t.cta.href.startsWith('/portal/orders/pay') ? false : undefined}
                  {...(t.cta.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={cn(t.tone === 'attention' ? btnPrimary : btnSecondary, 'mt-4 w-full')}
                >
                  {t.cta.label}
                  {t.cta.external && <span aria-hidden>↗</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 30-day check-in, only while one is open. Same flow as the email. */}
      {checkin && (
        <div className={`${panel} px-5 py-4 md:px-6 md:py-5`}>
          <p className="mb-1 text-[14px] font-medium text-ink/70">Check-in</p>
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

      <Link
        href="/shop"
        className="group flex min-h-[56px] items-center justify-between gap-3 rounded-shell px-5 text-[16px] font-semibold text-ink ring-1 ring-ink/10 transition-colors hover:bg-milk"
      >
        <span className="flex items-center gap-3">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-butter text-[18px] leading-none">
            +
          </span>
          Start a new treatment
        </span>
        <span aria-hidden className="text-ink/70 transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </Link>

      <p className="text-[15px] text-ink/70">
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
