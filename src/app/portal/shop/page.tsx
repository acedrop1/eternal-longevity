import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ShopCatalog } from '@/components/shop/ShopCatalog';
import { getSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse our full peptide catalog. Compounded to prescription by a licensed 503A pharmacy.',
};

export default async function ShopPage() {
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
        { label: 'Messages', href: '/portal/messages' },
        { label: 'Subscriptions', href: '/portal/subscriptions' },
        { label: 'Account', href: '/portal/account' },
      ]}
    >
      {/* === HERO === */}
      <header className="mb-10 md:mb-12">
        <p className="mb-3 text-[11px] tracking-widest text-accent">
          MEMBER SHOP
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground max-w-3xl"
          style={{
            fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
            letterSpacing: '-0.025em',
            lineHeight: 1.02,
          }}
        >
          Build the protocol that fits you.
        </h1>
        <p className="mt-4 max-w-2xl text-foreground/65 leading-relaxed">
          Every product is compounded to prescription by a licensed 503A
          pharmacy, tested for purity and potency before release, and
          cold-chain shipped. Cancel between cycles, never mid-cycle.
        </p>

      </header>

      <ShopCatalog />
    </PortalShell>
  );
}
