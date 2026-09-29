import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { MessagesPanel } from '@/components/messages/MessagesPanel';
import { getSession } from '@/lib/auth-server';
import { listMyMessages } from '@/lib/messages-db';
import { MEMBER_NAV, PageHeader } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Messages',
};

export default async function MemberMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  const [support, doctor, { thread }] = await Promise.all([
    listMyMessages('support'),
    listMyMessages('doctor'),
    searchParams,
  ]);
  // Open the doctor thread when asked to, or when the prescriber spoke last.
  const initialChannel =
    thread === 'doctor' ||
    (thread !== 'support' && doctor.at(-1)?.senderRole === 'staff')
      ? 'doctor'
      : 'support';

  return (
    <PortalShell user={user} nav={MEMBER_NAV}>
      <PageHeader
        title="Messages"
        intro="Support for orders and billing, or your doctor for treatment."
      />
      <MessagesPanel threads={{ support, doctor }} initialChannel={initialChannel} />
    </PortalShell>
  );
}
