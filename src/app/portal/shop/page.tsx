import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ShopCatalog } from '@/components/shop/ShopCatalog';
import { getSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Shop — Eternal Longevity',
  description: 'Browse our full peptide catalog. Physician-reviewed, 503A compounded, subscription-only.',
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
      ]}
    >
      {/* === HERO === */}
      <header className="mb-10 md:mb-12">
        <p className="mb-3 text-[11px] tracking-widest text-accent">
          MEMBER SHOP · SUBSCRIPTION-ONLY
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
          Every product is reviewed by your physician, compounded by a
          503A pharmacy, and cold-chain shipped. Subscribe monthly, quarterly,
          or annually — and cancel between cycles, never mid-cycle.
        </p>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '⚕', label: 'Physician-reviewed' },
            { icon: '✓', label: '503A pharmacy' },
            { icon: '◯', label: '99%+ purity' },
            { icon: '⤴', label: 'Cold-chain shipping' },
          ].map((t) => (
            <div
              key={t.label}
              className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-foreground/5 text-accent text-xs">
                {t.icon}
              </span>
              <span className="text-[11px] tracking-wider text-foreground/70">
                {t.label.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </header>

      <ShopCatalog />
    </PortalShell>
  );
}
