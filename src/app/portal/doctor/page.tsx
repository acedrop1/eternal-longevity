import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { DoctorQueueList } from '@/components/doctor/DoctorQueueList';
import { getSession } from '@/lib/auth-server';
import { listOrders } from '@/lib/orders-db';
import { reviewsForOrders } from '@/lib/clinical-review';

export const metadata: Metadata = {
  title: 'Clinical Queue',
};


export default async function DoctorPortalPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'doctor') redirect(user.redirectTo);

  /*
   * The intake behind each waiting order. Fetched here rather than in the
   * client component so the prescriber never sees a card he cannot act on —
   * the record loads with the queue, not after a second round trip.
   */
  const orders = await listOrders().catch(() => []);
  const waiting = orders
    .filter((o) => o.status === 'assigned')
    .map((o) => o.id);
  const reviews = await reviewsForOrders(waiting).catch(() => ({}));

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] tracking-widest text-sky-300">
            CLINICAL QUEUE
          </p>
          <h1
            className="font-semibold tracking-tight text-foreground"
            style={{
              fontSize: 'clamp(1.85rem, 4vw, 2.75rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            Welcome back, {user.name.split(' ').slice(-1)[0]}.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/65">
            Every order arrives here the moment a member checks out — a first
            order and a returning member&apos;s tenth alike. Signing charges
            their card and sends the prescription to the pharmacy; declining
            charges nothing.
          </p>
        </div>
      </div>

      <DoctorQueueList doctorName={user.name} reviews={reviews} />

    </PortalShell>
  );
}
