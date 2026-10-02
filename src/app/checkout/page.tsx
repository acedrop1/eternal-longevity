import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';
import { getSession, loginUrl } from '@/lib/auth-server';
import { intakeStateFor } from '@/lib/intake-status';
import { checkoutPrefill } from '@/lib/checkout-prefill';
import { billingConfigured } from '@/lib/billing';
import { defaultCardSummary } from '@/lib/pay-on-approval';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

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
