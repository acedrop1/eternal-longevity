import type { Metadata } from 'next';
import Link from 'next/link';
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

export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<{ channel?: string }> }) {
  const channel = (await searchParams).channel === 'doctor' ? 'doctor' : 'support';
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  let threads: MessageThread[] = await listMessageThreads(channel);
  let messagesByUser: Record<string, PortalMessage[]> = {};
  await Promise.all(
    threads.map(async (t) => {
      messagesByUser[t.userId] = await listThreadMessages(t.userId, channel);
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
          subtitle={
            channel === 'doctor'
              ? `Patients’ messages with Dr. Elder (read only). ${awaiting} awaiting his reply.`
              : `Member messages to support. ${awaiting} awaiting a reply.`
          }
        />
        <nav aria-label="Inbox" className="flex gap-2">
          {(
            [
              ['support', 'Support', '/portal/admin/messages'],
              ['doctor', 'Dr. Elder', '/portal/admin/messages?channel=doctor'],
            ] as const
          ).map(([key, label, href]) => (
            <Link
              key={key}
              href={href}
              aria-current={channel === key ? 'page' : undefined}
              className={`inline-flex min-h-[40px] items-center rounded-full px-4 text-[14px] font-semibold ${
                channel === key ? 'bg-ink text-white' : 'bg-milk text-ink hover:bg-milk-deep'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        {sample && (
          <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[14px] text-amber-900">
            Sample data (dev only). Replies need Supabase.
          </p>
        )}
        <AdminInbox key={channel} threads={threads} messagesByUser={messagesByUser} readOnly={channel === 'doctor'} />
      </div>
    </PortalShell>
  );
}
