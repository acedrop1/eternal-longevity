import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { DOCTOR_NAV } from '@/components/portal/ui';
import { AdminPageHeader } from '@/components/admin/IndexTable';
import { DoctorHistory, type SignedRx } from '@/components/doctor/DoctorHistory';
import { getSession, loginUrl } from '@/lib/auth-server';
import { listOrders, ordersDbConfigured } from '@/lib/orders-db';
import type { Order } from '@/lib/orders';

export const metadata: Metadata = {
  title: 'Signed Rx',
};

/** Orders this physician has acted on, newest first. */
function toSignedRx(orders: Order[]): SignedRx[] {
  const acted = orders.filter((o) =>
    ['signed', 'paid', 'compounding', 'shipped', 'delivered', 'declined-clinical'].includes(
      o.status,
    ),
  );
  return [...acted].sort((a, b) => b.placedAt - a.placedAt).map((o) => ({
    id: o.id,
    patient: o.memberName || o.memberEmail,
    state: o.state,
    protocol: o.lines.map((l) => l.productName).join(' + ') || '—',
    // When he signed (or declined), from the timeline; paidAt is when the money landed.
    signedAt: new Date(
      o.updates?.find((u) => u.statusChange === 'signed' || u.statusChange === 'declined-clinical')?.at ?? o.placedAt,
    ).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    cycle: o.lines[0]?.cadenceLabel ?? '—',
    status:
      o.status === 'declined-clinical'
        ? 'declined'
        : o.status === 'delivered'
          ? 'completed'
          : 'active',
    // A declined case has no order to place; its own page carries his reason.
    href:
      o.status === 'declined-clinical'
        ? `/portal/doctor/review/${encodeURIComponent(o.id)}`
        : `/portal/admin/orders/${encodeURIComponent(o.id)}`,
  }));
}

export default async function DoctorHistoryPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'doctor') redirect(user.redirectTo);

  let orders = await listOrders();
  // Dev only: the sample cases (see doctor/dev-sample). NODE_ENV is inlined at build.
  let sample = false;
  if (process.env.NODE_ENV === 'development' && !(await ordersDbConfigured())) {
    orders = (await import('@/components/doctor/dev-sample')).SAMPLE_DR_ORDERS;
    sample = true;
  }
  const signed = toSignedRx(orders);

  return (
    <PortalShell
      user={user}
      nav={DOCTOR_NAV}
    >
      <div className="space-y-5">
        <AdminPageHeader
          title="My signed Rx"
          subtitle={
            <span className="text-[15px] md:text-[13px]">
              Every prescription you&apos;ve signed or declined, newest first. {signed.length} total.
            </span>
          }
        />
        {sample && (
          <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[15px] text-amber-900 md:text-[13px]">
            Sample data (dev only).
          </p>
        )}
        <DoctorHistory rows={signed} />
      </div>
    </PortalShell>
  );
}
