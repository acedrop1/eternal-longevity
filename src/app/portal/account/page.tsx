import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { AccountSettings } from '@/components/profile/AccountSettings';
import { getSession } from '@/lib/auth-server';
import { MEMBER_NAV, PageHeader } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Account',
};

export default async function AccountPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  return (
    <PortalShell user={user} nav={MEMBER_NAV}>
      <PageHeader
        title="Your settings."
        intro="Update your profile, payment methods, and notification preferences. Changes save instantly to your account."
      />

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
