import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';
import { getSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Checkout',
};

export default async function CheckoutPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  return (
    <main className="relative min-h-screen bg-background">
      <CheckoutFlow
        defaultEmail={user.email}
        defaultName={user.name}
        stripePublishableKey={
          (process.env.STRIPE_PUBLISHABLE_KEY ?? '').startsWith('pk_')
            ? (process.env.STRIPE_PUBLISHABLE_KEY as string)
            : ''
        }
      />
    </main>
  );
}
