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
  title: 'Messages',
};

export default async function DoctorMessagesPage() {
  const user = await getSession();
  if (!user) redirect('/login');
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
      nav={[
        { label: 'Queue', href: '/portal/doctor' },
        { label: 'Messages', href: '/portal/doctor/messages' },
        { label: 'My signed Rx', href: '/portal/doctor/history' },
        { label: 'Profile', href: '/portal/doctor/profile' },
      ]}
    >
      {/* Same eyebrow colour and heading scale as Queue, Profile and Signed Rx
          — this page used to run a size larger in a different accent. */}
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
      <StaffInbox channel="doctor" threads={threads} messagesByUser={messagesByUser} />
    </PortalShell>
  );
}
