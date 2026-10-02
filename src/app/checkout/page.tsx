import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';
import { getSession, loginUrl } from '@/lib/auth-server';
import { intakeStateFor } from '@/lib/intake-status';
import { checkoutPrefill } from '@/lib/checkout-prefill';
import { billingConfigured } from '@/lib/billing';
import { defaultCardSummary } from '@/lib/pay-on-approval';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import Link from 'next/link';
import { latestIntakeAnswers } from '@/lib/intake-status';
import { loadCart } from '@/lib/profile-db';
import { intakeCovers } from '@/lib/purchase-rules';
import { getAnyShopProduct } from '@/lib/shopProducts';

export const metadata: Metadata = {
  title: 'Checkout',
};

/**
 * The card on file, as the approval charge will find it (defaultCardFor).
 * Read only: a member with no Stripe customer yet gets one when they save a card.
 */
async function savedCardFor(userId: string): Promise<string | null> {
  if (!billingConfigured()) return null;
  const { data } = await createSupabaseAdminClient()
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();
  return data?.stripe_customer_id ? defaultCardSummary(data.stripe_customer_id) : null;
}

export default async function CheckoutPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'member') redirect(user.redirectTo);

  /*
   * The prescriber cannot review someone who has told us nothing. Send them to
   * the medical visit first rather than letting them fill in an address and a
   * card only to be rejected by the server at the end.
   */
  if ((await intakeStateFor(user.id)) !== 'submitted') {
    redirect('/portal/visit');
  }

  /*
   * Every product in the cart needs its own questions answered before it can
   * be checked out, not just an assessment for something. Stop here, before an
   * address and a card, rather than at Place order (which enforces it too).
   * Demo stores no intakes, so it skips this.
   */
  if (supabaseAdminConfigured()) {
    const [{ items }, answers] = await Promise.all([loadCart(), latestIntakeAnswers(user.id)]);
    const owed = [...new Set(items.map((i) => i.productId))]
      .filter((id) => !intakeCovers(answers, id))
      .map((id) => ({ id, name: getAnyShopProduct(id)?.name ?? 'This treatment' }));
    if (owed.length) {
      const first = owed[0];
      return (
        <main className="relative min-h-screen bg-white text-ink">
          <div className="mx-auto max-w-[640px] px-5 pb-20 pt-24 text-center md:pt-32">
            <h1 className="mb-4 text-[28px] font-semibold leading-[1.05] tracking-[-0.04em] [text-wrap:balance] md:text-[40px]">
              {owed.length === 1
                ? `A few questions about ${first.name} first.`
                : 'A few questions first.'}
            </h1>
            <p className="mb-8 text-[16px] leading-relaxed text-ink-soft">
              Dr. Elder reviews every treatment on its own, so each one needs its medical questions answered before
              checkout. It takes a few minutes, your details are already filled in, and you come straight back here.
            </p>
            <div className="flex flex-col items-center gap-3">
              {owed.map((p) => (
                <Link
                  key={p.id}
                  href={`/start?product=${encodeURIComponent(p.id)}`}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-butter px-6 py-3 text-[15px] font-semibold text-ink"
                >
                  Answer the {p.name} questions
                </Link>
              ))}
              <Link
                href="/portal"
                className="mt-2 text-[14px] text-ink-soft underline decoration-ink/30 underline-offset-[3px] hover:text-ink"
              >
                Back to your portal
              </Link>
            </div>
          </div>
        </main>
      );
    }
  }

  /*
   * They gave us a phone and a ZIP during the intake. Asking for them again at
   * checkout is asking someone to prove they meant it.
   */
  const [prefill, savedCard] = await Promise.all([checkoutPrefill(user.id), savedCardFor(user.id)]);

  return (
    <main className="relative min-h-screen bg-white text-ink">
      <CheckoutFlow
        defaultEmail={user.email}
        defaultName={prefill.fullName || user.name}
        defaultPhone={prefill.phone}
        defaultZip={prefill.zip}
        defaultState={prefill.state}
        googlePlacesKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY}
        savedCard={savedCard}
        stripePublishableKey={
          (process.env.STRIPE_PUBLISHABLE_KEY ?? '').startsWith('pk_')
            ? (process.env.STRIPE_PUBLISHABLE_KEY as string)
            : ''
        }
      />
    </main>
  );
}
