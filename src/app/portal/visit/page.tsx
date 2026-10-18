import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { IntakeWizard } from '@/components/intake/IntakeWizard';
import { getSession, loginUrl } from '@/lib/auth-server';
import { getPendingVisit } from '@/lib/intake-actions';
import { intakeStateFor, latestIntakeAnswers, pendingMediaFor } from '@/lib/intake-status';
import { getCatalogProduct } from '@/lib/catalog';
import { visitProducts } from '@/lib/visit-products';
import { MEMBER_NAV, EmptyState, PageHeader, btnPrimary } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Complete Your Visit',
};

/**
 * What is left after checkout: the photos (hair, skin) and optional lab
 * results. Every question is answered in the assessment before checkout.
 * LEGACY: an intake opened before that change ('awaiting_visit') still
 * completes its full clinical visit here.
 */
export default async function VisitPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; ordered?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'member') redirect(user.redirectTo);

  const { product: param, ordered: justOrdered } = await searchParams;
  const ordered = justOrdered === '1';
  const [visit, state, products, onFile] = await Promise.all([
    getPendingVisit(),
    intakeStateFor(user.id),
    // Intake's product, ?product=, undecided orders and cart: every category is asked.
    visitProducts(user.id, [param]),
    latestIntakeAnswers(user.id),
  ]);
  const primaryId = products[0]?.id;
  const product = primaryId ? await getCatalogProduct(primaryId) : undefined;

  const nav = MEMBER_NAV;

  const media = state === 'submitted' ? await pendingMediaFor(user.id) : null;
  if (media?.stepIds.length) {
    return (
      <PortalShell user={user} nav={nav}>
        <div>
          <PageHeader
            title={media.photos ? 'Add your photos' : 'Add your lab results'}
            intro={
              media.photos
                ? 'The last thing your physician needs before reviewing your treatment.'
                : 'Optional. Your physician can use recent results in the review.'
            }
          />
        </div>
        <IntakeWizard mode="media" mediaStepIds={media.stepIds} />
      </PortalShell>
    );
  }

  // No intake yet: the assessment is where every question is asked now.
  if (state === 'none') {
    return (
      <PortalShell user={user} nav={nav}>
        <PageHeader title="Find your treatment." />
        <EmptyState
          action={
            <Link href="/shop" className={btnPrimary}>
              Find your treatment
            </Link>
          }
        >
          A few questions about your health and goals. A licensed physician reviews them before anything is prescribed.
        </EmptyState>
      </PortalShell>
    );
  }

  if (state === 'submitted') {
    return (
      <PortalShell user={user} nav={nav}>
        <PageHeader title="No visit to complete." />
        <EmptyState
          action={
            <Link href="/portal" className={btnPrimary}>
              Back to dashboard
            </Link>
          }
        >
          You have no open clinical visit right now. If you just placed an
          order, your visit may already be with your prescriber.
        </EmptyState>
      </PortalShell>
    );
  }

  // submitVisitAction refuses a new visit after a decline; say so up front
  // rather than after twenty questions.
  if (state === 'declined') {
    return (
      <PortalShell user={user} nav={nav}>
        <PageHeader title="Your last visit was closed." />
        <EmptyState
          action={
            <Link href="/portal/messages" className={btnPrimary}>
              Message your care team
            </Link>
          }
        >
          A new visit can&rsquo;t be started while your last one is closed. If
          something has changed, message your care team and they can reopen it.
        </EmptyState>
      </PortalShell>
    );
  }

  return (
    <PortalShell user={user} nav={nav}>
      <div className="[&:has([data-visit-done])_.visit-intro]:hidden">
      <div className="visit-intro">
        <PageHeader
          title={ordered ? 'Your order is in. A few quick questions for Dr. Elder.' : 'A few quick questions for Dr. Elder.'}
          intro={`${ordered ? 'Nothing has been charged. ' : ''}These health questions take about 2 minutes, and Dr. Elder reviews your ${visit?.productName ?? 'order'} as soon as they’re done. You’re charged only if he approves.`}
        />
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-butter-soft px-3 py-1.5 text-[13px] font-medium text-ink ring-1 ring-inset ring-butter-deep/60">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Needed before Dr. Elder can review your order
        </p>
      </div>
      <IntakeWizard
        mode="visit"
        product={
          product
            ? {
                id: product.id,
                name: product.name,
                tagline: product.tagline,
                contraindications: product.contraindications,
              }
            : undefined
        }
        visitProducts={products}
        // Answered before checkout; the health questions depend on it (pregnancy).
        seed={typeof onFile.sex === 'string' ? { sex: onFile.sex } : undefined}
      />
      </div>
    </PortalShell>
  );
}
