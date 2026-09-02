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
      <StaffInbox channel="doctor" threads={threads} messagesByUser={messagesByUser} />
    </PortalShell>
  );
}
