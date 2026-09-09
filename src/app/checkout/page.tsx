import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';
import { getSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Checkout | Eternal Longevity',
};

export default async function CheckoutPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  return (
    <main className="theme-light relative min-h-screen bg-background text-foreground">
      <CheckoutFlow defaultEmail={user.email} defaultName={user.name} />
    </main>
  );
}
