import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { DOCTOR_NAV } from '@/components/portal/ui';
import { StaffInbox } from '@/components/messages/StaffInbox';
import { getSession, loginUrl } from '@/lib/auth-server';
import {
  listMessageThreads,
  listThreadMessages,
  type PortalMessage,
} from '@/lib/messages-db';

export const metadata: Metadata = {
  title: 'Messages',
};

export default async function DoctorMessagesPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'doctor') redirect(user.redirectTo);

  const threads = await listMessageThreads('doctor');
  const messagesByUser: Record<string, PortalMessage[]> = {};
  await Promise.all(
    threads.map(async (t) => {
      messagesByUser[t.userId] = await listThreadMessages(t.userId, 'doctor');
    })
  );

  return (
    <PortalShell
      user={user}
      nav={DOCTOR_NAV}
    >
      {/* Same eyebrow colour and heading scale as Queue, Profile and Signed Rx
          — this page used to run a size larger in a different accent. */}
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
      <StaffInbox channel="doctor" threads={threads} messagesByUser={messagesByUser} />
    </PortalShell>
  );
}
