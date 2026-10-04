import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { MemberChat } from './MemberChat';
import { memberSamples, SAMPLE_THREADS } from '@/lib/dev-member-samples';
import { getSession, loginUrl } from '@/lib/auth-server';
import { listMyMessages } from '@/lib/messages-db';
import { MEMBER_NAV, PageHeader, EmptyState, btnPrimary } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Messages',
};

export default async function MemberMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'member') redirect(user.redirectTo);

  const [threads, { thread }] = await Promise.all([
    // Dev without a database: sample threads (lib/dev-member-samples).
    memberSamples
      ? [SAMPLE_THREADS.support, SAMPLE_THREADS.doctor]
      : Promise.all([listMyMessages('support'), listMyMessages('doctor')]).catch(() => null),
    searchParams,
  ]);

  // Couldn't read the threads: say so, rather than show an empty conversation.
  if (!threads) {
    return (
      <PortalShell user={user} nav={MEMBER_NAV}>
        <PageHeader title="Messages" />
        <div className="mt-8">
          <EmptyState
            action={
              <a href="/portal/messages" className={btnPrimary}>
                Try again
              </a>
            }
          >
            Couldn&apos;t load messages – try again.
          </EmptyState>
        </div>
      </PortalShell>
    );
  }
  const [support, doctor] = threads;
  // Open the doctor thread when asked to, or when the prescriber spoke last.
  const initialChannel =
    thread === 'doctor' ||
    (thread !== 'support' && doctor.at(-1)?.senderRole === 'staff')
      ? 'doctor'
      : 'support';

  return (
    <PortalShell user={user} nav={MEMBER_NAV}>
      <PageHeader title="Messages" />
      <MemberChat
        threads={{ support, doctor }}
        initialChannel={initialChannel}
        // The care team spoke last: a reply is waiting on the member.
        waiting={(['doctor', 'support'] as const).filter((c) => ({ support, doctor })[c].at(-1)?.senderRole === 'staff')}
      />
    </PortalShell>
  );
}
