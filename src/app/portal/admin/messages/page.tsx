import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { StaffInbox } from '@/components/messages/StaffInbox';
import { getSession, loginUrl } from '@/lib/auth-server';
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
  if (!user) redirect(await loginUrl());
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
        <p className="mb-2 text-[13px] font-medium text-ink/65">
          Member messages
        </p>
        <h1
          className="text-[36px] font-semibold leading-[1] tracking-[-0.045em] text-ink [text-wrap:balance] md:text-[48px]"
        >
          Inbox
        </h1>
      </div>
      <StaffInbox channel="support" threads={threads} messagesByUser={messagesByUser} />
    </PortalShell>
  );
}
