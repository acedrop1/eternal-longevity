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
import { ADMIN_NAV } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Messages',
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
      nav={ADMIN_NAV}
    >
      <div>
        <p className="mb-2 font-mono text-[12px] text-foreground/55">
          Member messages
        </p>
        <h1
          className="font-display font-normal text-foreground"
          style={{
            fontSize: 'clamp(1.8rem, 1.5vw + 1rem, 2.6rem)',
            fontStretch: '75%',
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
