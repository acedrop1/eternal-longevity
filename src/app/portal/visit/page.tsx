import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { IntakeWizard } from '@/components/intake/IntakeWizard';
import { getSession } from '@/lib/auth-server';
import { getPendingVisit } from '@/lib/intake-actions';
import { intakeStateFor } from '@/lib/intake-status';
import { getLiveProduct } from '@/lib/catalog';
import { MEMBER_NAV, EmptyState, PageHeader, btnPrimary } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Complete Your Visit',
};

/**
 * The clinical half of the intake, completed after checkout. The prescriber
 * does not review — and nothing is charged or shipped — until this is done.
 */
export default async function VisitPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  const [visit, state] = await Promise.all([
    getPendingVisit(),
    intakeStateFor(user.id),
  ]);
  const product = visit?.productId ? await getLiveProduct(visit.productId) : undefined;

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

  return (
    <PortalShell user={user} nav={nav}>
      <div>
        <PageHeader
          title="Complete your visit"
          intro={visit?.productName ? `For your ${visit.productName} order.` : undefined}
        />
        <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-[13px] text-black/70">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#D5A850]" />
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
      />
    </PortalShell>
  );
}
