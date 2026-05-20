import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { AccountSettings } from '@/components/profile/AccountSettings';
import { getSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Account | Eternal Longevity',
};

export default async function AccountPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  return (
    <PortalShell
      user={user}
      nav={[
        { label: 'Dashboard', href: '/portal' },
        { label: 'Shop', href: '/portal/shop' },
        { label: 'Orders', href: '/portal/orders' },
        { label: 'Subscriptions', href: '/portal/subscriptions' },
        { label: 'Account', href: '/portal/account' },
      ]}
    >
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          ACCOUNT
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Your settings.
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-foreground/65">
          Update your profile, payment methods, and notification preferences.
          Changes save instantly to your account.
        </p>
      </div>

      <AccountSettings userName={user.name} userEmail={user.email} />
    </PortalShell>
  );
}
