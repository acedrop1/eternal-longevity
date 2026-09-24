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

export default async function MemberMessagesPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  const [support, doctor] = await Promise.all([
    listMyMessages('support'),
    listMyMessages('doctor'),
  ]);

  return (
    <PortalShell user={user} nav={MEMBER_NAV}>
      <PageHeader
        title="Messages"
        intro="Support for orders and billing, or your doctor for treatment."
      />
      <MessagesPanel threads={{ support, doctor }} />
    </PortalShell>
  );
}
