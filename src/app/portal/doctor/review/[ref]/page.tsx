import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { DOCTOR_NAV } from '@/components/portal/ui';
import { DoctorReview } from '@/components/doctor/DoctorReview';
import { getSession, loginUrl } from '@/lib/auth-server';
import { getOrder, ordersDbConfigured } from '@/lib/orders-db';
import { doctorThreadStatuses, reviewsForOrders, type PatientReview } from '@/lib/clinical-review';
import { getPharmacyEntries } from '@/lib/catalog';
import { signWindowOpen } from '@/lib/reauth';
import { orderRef } from '@/lib/format';
import type { Order } from '@/lib/orders';
import type { ThreadStatus } from '@/lib/prescriber-view';

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }): Promise<Metadata> {
  return { title: `Review ${orderRef(decodeURIComponent((await params).ref))}` };
}
export const dynamic = 'force-dynamic';

/**
 * One case from the clinical queue: the patient record and the decision
 * (sign, ask, photos, decline), or, once signed, its updates. `ref` is the
 * order number.
 */
export default async function DoctorReviewPage({ params }: { params: Promise<{ ref: string }> }) {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'doctor') redirect(user.redirectTo);

  const ref = decodeURIComponent((await params).ref);
  const live = await ordersDbConfigured();

  let order: Order | null = null;
  let review: PatientReview | undefined;
  let thread: ThreadStatus | undefined;
  let defaultSig = '';
  let sample = false;

  if (live) {
    order = await getOrder(ref).catch(() => null);
    if (order) {
      const [reviews, threads, pharmacy] = await Promise.all([
        reviewsForOrders([order.id]).catch(() => ({}) as Record<string, PatientReview>),
        doctorThreadStatuses([order.userId ?? '']),
        getPharmacyEntries(),
      ]);
      review = reviews[order.id];
      thread = threads[order.userId ?? ''];
      // Only the sig prefill crosses to the client, never the pharmacy mapping.
      defaultSig = pharmacy[order.lines[0]?.productId ?? '']?.defaultSig ?? '';
    }
  } else if (process.env.NODE_ENV === 'development') {
    // Dev only: the sample queue (see doctor/dev-sample). NODE_ENV is inlined at build.
    const s = await import('@/components/doctor/dev-sample');
    order = s.SAMPLE_DR_ORDERS.find((o) => o.id === ref) ?? null;
    if (order) {
      review = s.SAMPLE_DR_REVIEWS[order.id];
      thread = s.SAMPLE_DR_THREADS[order.userId ?? ''];
      defaultSig = s.SAMPLE_DR_SIGS[order.lines[0]?.productId ?? ''] ?? '';
      sample = true;
    }
  }

  if (!order) notFound();

  return (
    <PortalShell user={user} nav={DOCTOR_NAV}>
      <DoctorReview
        order={order}
        doctorName={user.name}
        signWindowOpen={await signWindowOpen(user.id)}
        review={review}
        thread={thread}
        defaultSig={defaultSig}
        sample={sample}
      />
    </PortalShell>
  );
}
