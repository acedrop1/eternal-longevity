import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { MemberOrdersList } from '@/components/orders/MemberOrdersList';
import { getSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Orders — Eternal Longevity',
};

export default async function OrdersPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  return (
    <PortalShell
      user={user}
      nav={[
        { label: 'Dashboard', href: '/portal' },
        { label: 'Shop', href: '/portal/shop' },
        { label: 'Orders', href: '/portal/orders' },
      ]}
    >
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          ORDERS
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Your shipments &amp; receipts.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Every cycle you&apos;ve ordered, with live status from physician
          review through delivery.
        </p>
      </div>

      <MemberOrdersList memberEmail={user.email} />
    </PortalShell>
  );
}
