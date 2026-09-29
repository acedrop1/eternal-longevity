import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { IntakeWizard } from '@/components/intake/IntakeWizard';
import { getSession } from '@/lib/auth-server';
import { getPendingVisit } from '@/lib/intake-actions';
import { intakeStateFor } from '@/lib/intake-status';
import { getCatalogProduct } from '@/lib/catalog';
import { visitProducts } from '@/lib/visit-products';
import { MEMBER_NAV, EmptyState, PageHeader, btnPrimary } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Complete Your Visit',
};

/**
 * The clinical half of the intake, completed after checkout. The prescriber
 * does not review — and nothing is charged or shipped — until this is done.
 */
export default async function VisitPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  const { product: param } = await searchParams;
  const [visit, state, products] = await Promise.all([
    getPendingVisit(),
    intakeStateFor(user.id),
    // Intake's product, ?product=, undecided orders and cart: every category is asked.
    visitProducts(user.id, [param]),
  ]);
  const primaryId = products[0]?.id;
  const product = primaryId ? await getCatalogProduct(primaryId) : undefined;

  const nav = MEMBER_NAV;

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
      <div>
        <PageHeader
          title="Complete your visit"
          intro={visit?.productName ? `For your ${visit.productName} order.` : undefined}
        />
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-butter-soft px-3 py-1.5 text-[13px] font-medium text-ink ring-1 ring-inset ring-butter-deep/60">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          {visit ? 'Required before prescriber review' : 'Required before you can order'}
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
      />
    </PortalShell>
  );
}
