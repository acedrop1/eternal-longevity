import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { IntakeWizard } from '@/components/intake/IntakeWizard';
import { getSession } from '@/lib/auth-server';
import { getPendingVisit } from '@/lib/intake-actions';
import { getShopProduct } from '@/lib/shopProducts';

export const metadata: Metadata = {
  title: 'Complete Your Visit | Eternal Longevity',
};

/**
 * The clinical half of the intake, completed after checkout. The prescriber
 * does not review — and nothing is charged or shipped — until this is done.
 */
export default async function VisitPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  const visit = await getPendingVisit();
  const product = visit?.productId ? getShopProduct(visit.productId) : undefined;

  const nav = [
    { label: 'Dashboard', href: '/portal' },
    { label: 'Shop', href: '/portal/shop' },
    { label: 'Orders', href: '/portal/orders' },
    { label: 'Messages', href: '/portal/messages' },
    { label: 'Subscriptions', href: '/portal/subscriptions' },
    { label: 'Account', href: '/portal/account' },
  ];

  if (!visit) {
    return (
      <PortalShell user={user} nav={nav}>
        <div className="mx-auto max-w-xl pt-10 text-center">
          <h1 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">
            No visit to complete.
          </h1>
          <p className="mb-8 text-foreground/60 leading-relaxed">
            You have no open clinical visit right now. If you just placed an
            order, your visit may already be with your prescriber.
          </p>
          <Link
            href="/portal"
            className="pill bg-accent px-7 py-3 font-semibold text-black"
          >
            Back to dashboard
          </Link>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell user={user} nav={nav}>
      <div className="mb-2">
        <p className="mb-2 text-[11px] tracking-widest text-accent">
          REQUIRED BEFORE PRESCRIBER REVIEW
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Complete your visit
        </h1>
        {visit.productName && (
          <p className="mt-2 text-sm text-foreground/55">
            For your {visit.productName} order.
          </p>
        )}
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
