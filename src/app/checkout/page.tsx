import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';
import { getSession } from '@/lib/auth-server';
import { intakeStateFor } from '@/lib/intake-status';
import { checkoutPrefill } from '@/lib/checkout-prefill';

export const metadata: Metadata = {
  title: 'Checkout',
};

export default async function CheckoutPage() {
  const user = await getSession();
  if (!user) redirect('/login');
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
  const prefill = await checkoutPrefill(user.id);

  return (
    <main className="relative min-h-screen bg-background">
      <CheckoutFlow
        defaultEmail={user.email}
        defaultName={prefill.fullName || user.name}
        defaultPhone={prefill.phone}
        defaultZip={prefill.zip}
        stripePublishableKey={
          (process.env.STRIPE_PUBLISHABLE_KEY ?? '').startsWith('pk_')
            ? (process.env.STRIPE_PUBLISHABLE_KEY as string)
            : ''
        }
      />
    </main>
  );
}
