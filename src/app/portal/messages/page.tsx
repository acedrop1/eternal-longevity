import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { MessagesPanel } from '@/components/messages/MessagesPanel';
import { getSession } from '@/lib/auth-server';
import { listMyMessages } from '@/lib/messages-db';

export const metadata: Metadata = {
  title: 'Messages | Eternal Longevity',
};

export default async function MemberMessagesPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  const [support, doctor] = await Promise.all([
    listMyMessages('support'),
    listMyMessages('doctor'),
  ]);

  return (
    <PortalShell
      user={user}
      nav={[
        { label: 'Dashboard', href: '/portal' },
        { label: 'Shop', href: '/portal/shop' },
        { label: 'Orders', href: '/portal/orders' },
        { label: 'Messages', href: '/portal/messages' },
        { label: 'Subscriptions', href: '/portal/subscriptions' },
        { label: 'Account', href: '/portal/account' },
      ]}
    >
      <div className="mb-8">
        <p className="mb-2 text-[11px] tracking-widest text-accent">
          SUPPORT &amp; DOCTOR
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Messages
        </h1>
      </div>
      <MessagesPanel threads={{ support, doctor }} />
    </PortalShell>
  );
}
