import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { AdminInbox } from '@/components/admin/AdminInbox';
import { AdminPageHeader } from '@/components/admin/IndexTable';
import { getSession, loginUrl } from '@/lib/auth-server';
import {
  listMessageThreads,
  listThreadMessages,
  type MessageThread,
  type PortalMessage,
} from '@/lib/messages-db';
import { supabaseAdminConfigured } from '@/lib/supabase/admin';
import { ADMIN_NAV } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Messages',
};

export default async function AdminMessagesPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  let threads: MessageThread[] = await listMessageThreads('support');
  let messagesByUser: Record<string, PortalMessage[]> = {};
  await Promise.all(
    threads.map(async (t) => {
      messagesByUser[t.userId] = await listThreadMessages(t.userId, 'support');
    })
  );

  // Dev only: sample threads so the inbox can be designed without Supabase.
  // NODE_ENV is inlined at build, so production never loads the fixture.
  let sample = false;
  if (process.env.NODE_ENV === 'development' && !supabaseAdminConfigured()) {
    const fixture = await import('@/components/admin/dev-sample-pages');
    threads = fixture.SAMPLE_THREADS;
    messagesByUser = fixture.SAMPLE_MESSAGES;
    sample = true;
  }

  const awaiting = threads.filter((t) => t.awaitingReply).length;

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="space-y-5">
        <AdminPageHeader
          title="Inbox"
          subtitle={`Member messages to support. ${awaiting} awaiting a reply.`}
        />
        {sample && (
          <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
            Sample data (dev only). Replies need Supabase.
          </p>
        )}
        <AdminInbox threads={threads} messagesByUser={messagesByUser} />
      </div>
    </PortalShell>
  );
}
