import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { AccountSettings } from '@/components/profile/AccountSettings';
import { getSession, loginUrl } from '@/lib/auth-server';
import { paymentsOwed, resumeAfterNewCard } from '@/lib/refills';
import { frameAccountFor, paymentsConfigured } from '@/lib/payments';
import { MEMBER_NAV, PageHeader, btnPrimary } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Account',
};

const notice = 'rounded-shell bg-butter-soft p-5 ring-1 ring-butter-deep md:p-6';
const heading = 'text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[26px]';
const copy = 'mt-2 max-w-[60ch] text-[15px] leading-relaxed text-ink-soft';

/**
 * Restart what a failed charge stopped. A server action (POST) only, never a
 * page load: it can charge the card, so a link or a returning redirect must
 * not trigger it. Lands back here with what actually happened.
 */
async function restartAfterCard() {
  'use server';
  const user = await getSession();
  if (!user || user.role !== 'member') redirect(await loginUrl());
  const r = await resumeAfterNewCard(user);
  const q = new URLSearchParams({ done: '1', plans: String(r.plans), paid: String(r.charged), links: String(r.payLinks) });
  if (r.reason) q.set('why', r.reason);
  redirect(`/portal/account?${q}`);
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string; done?: string; plans?: string; paid?: string; links?: string; why?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'member') redirect(user.redirectTo);

  // card=added: CardsManager just saved a card. Only says so; restarting is a button.
  const { card, done, plans, paid, links, why } = await searchParams;

  // Card entry needs the server key (to save) and the browser key (to render the field).
  const cardsEnabled = paymentsConfigured() && Boolean(process.env.NEXT_PUBLIC_FRAME_PUBLISHABLE_KEY);
  const [owed, paymentAccountId] = await Promise.all([
    paymentsOwed(user.id).catch(() => []),
    cardsEnabled ? frameAccountFor(user.id).catch(() => null) : null,
  ]);
  const refills = owed.filter((o) => o.refill);
  const firstOrders = owed.filter((o) => !o.refill);
  const added = card === 'added';
  const result =
    done !== '1'
      ? null
      : why === 'noCard'
        ? { title: 'Add a card first.', body: 'We couldn’t find a card on your account. Add one below, then restart your plan.' }
        : why === 'notPaused'
          ? { title: 'Nothing to restart.', body: 'No plan is paused for a declined card, so nothing was charged.' }
          : {
              title: 'All set.',
              body: [
                Number(plans) > 0 && 'Your plan is back on. We’ll charge your refill to your card within a day and send it to the pharmacy.',
                Number(paid) > 0 && 'Payment went through. Your order is on its way to the pharmacy.',
                Number(links) > 0 && 'Your card didn’t go through for your approved order, so we’ve emailed you a secure link to finish paying.',
              ]
                .filter(Boolean)
                .join(' '),
            };

  return (
    <PortalShell user={user} nav={MEMBER_NAV}>
      <PageHeader
        title="Account"
        intro="Your profile, cards, addresses and notifications. Changes save as you go."
      />

      {(result || added) && (
        <section role="status" className={notice}>
          <h2 className={heading}>{result?.title ?? 'Your card is saved.'}</h2>
          <p className={copy}>
            {result?.body ??
              (owed.length
                ? 'One more step: use it below to finish what’s waiting.'
                : 'It’s used for your next refill. Nothing else needs doing.')}
          </p>
        </section>
      )}

      {/* A refill whose card was declined: restarts from the card on file. */}
      {refills.length > 0 && (
        <section aria-labelledby="refill-failed" className={notice}>
          <p className="mb-1 text-[14px] font-medium text-ink/70">Payment needed</p>
          <h2 id="refill-failed" className={heading}>
            Your {refills.map((o) => o.productName).join(' and ')} refill didn’t go through
          </h2>
          <p className={copy}>
            Add a working card below (make it your default if you have more than one), then restart your plan.
            We’ll charge the refill to it within a day.
          </p>
          <form action={restartAfterCard} className="mt-4">
            <button type="submit" className={btnPrimary}>
              Restart my plan
            </button>
          </form>
        </section>
      )}

      {/* An approved first order still waiting on money: pays by link. */}
      {firstOrders.map((o) => (
        <section key={o.orderNumber} className={notice}>
          <p className="mb-1 text-[14px] font-medium text-ink/70">Payment needed</p>
          <h2 className={heading}>Dr. Elder approved your {o.productName}</h2>
          <p className={copy}>
            {added
              ? 'Pay with the card you just saved and we’ll send it to the pharmacy.'
              : 'Complete payment and we’ll send it to the pharmacy.'}
          </p>
          {/* Just saved a card: charge it on an explicit press (POST). Otherwise the secure pay page. */}
          {added ? (
            <form action={restartAfterCard} className="mt-4">
              <button type="submit" className={btnPrimary}>
                Complete payment
              </button>
            </form>
          ) : (
            <Link
              href={`/portal/orders/pay/${encodeURIComponent(o.orderNumber)}`}
              prefetch={false}
              className={`${btnPrimary} mt-4`}
            >
              Complete payment
            </Link>
          )}
        </section>
      ))}

      <AccountSettings
        userName={user.name}
        userEmail={user.email}
        cardsEnabled={cardsEnabled}
        paymentAccountId={paymentAccountId ?? undefined}
      />
    </PortalShell>
  );
}
