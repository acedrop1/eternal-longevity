import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { AccountSettings } from '@/components/profile/AccountSettings';
import { getSession } from '@/lib/auth-server';
import { paymentsOwed, resumeAfterNewCard } from '@/lib/refills';
import { MEMBER_NAV, PageHeader, btnPrimary } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Account',
};

const notice = 'rounded-shell bg-butter-soft p-5 ring-1 ring-butter-deep md:p-6';
const heading = 'text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[26px]';
const copy = 'mt-2 max-w-[60ch] text-[15px] leading-relaxed text-ink-soft';

/** Restart what a failed charge stopped, then land back here without the param, so a reload doesn't repeat it. */
async function restartAfterCard() {
  'use server';
  const user = await getSession();
  if (!user || user.role !== 'member') redirect('/login');
  const r = await resumeAfterNewCard(user);
  redirect(`/portal/account?card=saved&plans=${r.plans}&links=${r.payLinks}`);
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string; plans?: string; links?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  const { card, plans, links } = await searchParams;
  // Back from Stripe's hosted card page (billing.ts): the card is saved.
  if (card === 'added') await restartAfterCard();

  const owed = await paymentsOwed(user.id).catch(() => []);
  const refills = owed.filter((o) => o.refill);
  const firstOrders = owed.filter((o) => !o.refill);
  const restarted = Number(plans) > 0;
  const linked = Number(links) > 0;

  return (
    <PortalShell user={user} nav={MEMBER_NAV}>
      <PageHeader
        title="Your settings."
        intro="Update your profile, payment methods, and notification preferences. Changes save instantly to your account."
      />

      {card === 'saved' && (
        <section role="status" className={notice}>
          <h2 className={heading}>Your card is saved.</h2>
          <p className={copy}>
            {restarted
              ? 'Your plan is back on. We’ll charge your refill to your card within a day and send it to the pharmacy.'
              : linked
                ? 'We’ve emailed you a secure link to finish paying for your approved order.'
                : 'It’s used for your next refill. Nothing else needs doing.'}
          </p>
        </section>
      )}

      {/* A refill whose card was declined: restarts from the card on file. */}
      {refills.length > 0 && (
        <section aria-labelledby="refill-failed" className={notice}>
          <p className="mb-1 text-[13px] font-medium text-ink/60">Payment needed</p>
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
          <p className="mb-1 text-[13px] font-medium text-ink/60">Payment needed</p>
          <h2 className={heading}>Dr. Elder approved your {o.productName}</h2>
          <p className={copy}>Complete payment and we’ll send it to the pharmacy.</p>
          <Link
            href={`/portal/orders/pay/${encodeURIComponent(o.orderNumber)}`}
            prefetch={false}
            className={`${btnPrimary} mt-4`}
          >
            Complete payment
          </Link>
        </section>
      ))}

      <AccountSettings
        userName={user.name}
        userEmail={user.email}
        stripePublishableKey={
          (process.env.STRIPE_PUBLISHABLE_KEY ?? '').startsWith('pk_')
            ? (process.env.STRIPE_PUBLISHABLE_KEY as string)
            : ''
        }
      />
    </PortalShell>
  );
}
