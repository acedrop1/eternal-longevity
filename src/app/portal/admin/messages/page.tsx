import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { StaffInbox } from '@/components/messages/StaffInbox';
import { getSession } from '@/lib/auth-server';
import {
  listMessageThreads,
  listThreadMessages,
  type PortalMessage,
} from '@/lib/messages-db';

export const metadata: Metadata = {
  title: 'Messages | Eternal Longevity',
};

export default async function AdminMessagesPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

  const threads = await listMessageThreads('support');
  const messagesByUser: Record<string, PortalMessage[]> = {};
  await Promise.all(
    threads.map(async (t) => {
      messagesByUser[t.userId] = await listThreadMessages(t.userId, 'support');
    })
  );

  return (
    <PortalShell
      user={user}
      nav={[
        { label: 'Overview', href: '/portal/admin' },
        { label: 'Members', href: '/portal/admin/members' },
        { label: 'Queue', href: '/portal/admin/queue' },
        { label: 'Messages', href: '/portal/admin/messages' },
        { label: 'Billing', href: '/portal/admin/billing' },
        { label: 'Orders', href: '/portal/admin/fulfillment' },
        { label: 'Pharmacy', href: '/portal/admin/pharmacy' },
        { label: 'Settings', href: '/portal/admin/settings' },
      ]}
    >
      <div className="mb-8">
        <p className="mb-2 text-[11px] tracking-widest text-accent">
          MEMBER MESSAGES
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Inbox
        </h1>
      </div>
      <StaffInbox channel="support" threads={threads} messagesByUser={messagesByUser} />
    </PortalShell>
  );
}
