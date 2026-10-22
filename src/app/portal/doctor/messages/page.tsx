import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { DOCTOR_NAV } from '@/components/portal/ui';
import { AdminPageHeader } from '@/components/admin/IndexTable';
import { DoctorInbox, type ThreadOrder } from '@/components/doctor/DoctorInbox';
import { statusLabel } from '@/lib/orders';
import { getSession, loginUrl } from '@/lib/auth-server';
import {
  listMessageThreads,
  listThreadMessages,
  type MessageThread,
  type PortalMessage,
} from '@/lib/messages-db';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Messages',
};

export default async function DoctorMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'doctor') redirect(user.redirectTo);

  let threads: MessageThread[] = await listMessageThreads('doctor');
  let messagesByUser: Record<string, PortalMessage[]> = {};
  await Promise.all(
    threads.map(async (t) => {
      messagesByUser[t.userId] = await listThreadMessages(t.userId, 'doctor');
    })
  );

  // Dev only: sample threads so the inbox can be designed without Supabase.
  // NODE_ENV is inlined at build, so production never loads the fixture.
  let sample = false;
  if (process.env.NODE_ENV === 'development' && !supabaseAdminConfigured()) {
    const fixture = await import('@/components/doctor/dev-sample');
    threads = fixture.SAMPLE_DR_INBOX;
    messagesByUser = fixture.SAMPLE_DR_MESSAGES;
    sample = true;
  }

  // Each patient's orders, newest first: chips in the chat header open the order to act on it.
  const ordersByUser: Record<string, ThreadOrder[]> = {};
  const ids = threads.map((t) => t.userId);
  if (ids.length && supabaseAdminConfigured()) {
    const db = createSupabaseAdminClient();
    const { data: orders } = await db
      .from('orders')
      .select('id, order_number, status, created_at, user_id')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(500);
    const orderIds = (orders ?? []).map((o) => o.id);
    const { data: items } = orderIds.length
      ? await db.from('order_items').select('order_id, product_name').in('order_id', orderIds)
      : { data: [] };
    const names: Record<string, string[]> = {};
    for (const i of items ?? []) (names[i.order_id] ??= []).push(i.product_name);
    for (const o of orders ?? []) {
      if (!o.user_id) continue;
      (ordersByUser[o.user_id] ??= []).push({
        ref: o.order_number,
        status: statusLabel(o.status),
        products: (names[o.id] ?? []).join(', '),
      });
    }
  }

  const awaiting = threads.filter((t) => t.awaitingReply).length;
  const { u } = await searchParams;

  return (
    <PortalShell
      user={user}
      nav={DOCTOR_NAV}
    >
      <div className="space-y-5">
        <AdminPageHeader
          title="Inbox"
          subtitle={
            <span className="text-[15px] md:text-[14px]">
              Your threads with patients. {awaiting} awaiting a reply.
            </span>
          }
        />
        {sample && (
          <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[15px] text-amber-900 md:text-[14px]">
            Sample data (dev only). Replies need Supabase.
          </p>
        )}
        <DoctorInbox threads={threads} messagesByUser={messagesByUser} ordersByUser={ordersByUser} initialUserId={u} />
      </div>
    </PortalShell>
  );
}
