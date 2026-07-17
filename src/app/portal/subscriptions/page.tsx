import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import {
  SubscriptionsManager,
  type Subscription,
} from '@/components/portal/SubscriptionsManager';
import { getSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Subscriptions | Eternal Longevity',
};

const SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-recover',
    productName: 'Recover Protocol',
    cycleLabel: '12-week cycle',
    cadenceLabel: 'Quarterly · billed every 3 months',
    perMonth: 160,
    nextBillingDate: 'Aug 9, 2026',
    initialStatus: 'active',
    image: '/images/11.jpg',
    swatch: 'linear-gradient(180deg, #1a4a3e 0%, #000000 100%)',
  },
  {
    id: 'sub-cjc',
    productName: 'CJC-1295 / Ipamorelin',
    cycleLabel: '12-week cycle',
    cadenceLabel: 'Monthly · billed every month',
    perMonth: 240,
    nextBillingDate: 'June 12, 2026',
    initialStatus: 'pending-review',
    image: '/images/9.jpg',
    swatch: 'linear-gradient(180deg, #3a5a4e 0%, #000000 100%)',
  },
];

export default async function SubscriptionsPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  const activeCount = SUBSCRIPTIONS.filter(
    (s) => s.initialStatus !== 'pending-review',
  ).length;

  return (
    <PortalShell
      user={user}
      nav={[
        { label: 'Dashboard', href: '/portal' },
        { label: 'Shop', href: '/portal/shop' },
        { label: 'Orders', href: '/portal/orders' },
        { label: 'Subscriptions', href: '/portal/subscriptions' },
        { label: 'Account', href: '/portal/account' },
      ]}
    >
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          SUBSCRIPTIONS · {activeCount} ACTIVE
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Manage your subscriptions.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Pause between cycles, skip a single cycle, or cancel any time before
          the next cycle is confirmed. No mid-cycle billing.
        </p>
      </div>

      <SubscriptionsManager subscriptions={SUBSCRIPTIONS} />

      <section className="mt-12 rounded-3xl border border-line bg-surface p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
              Add another peptide
            </h2>
            <p className="text-sm text-foreground/65 leading-relaxed">
              Browse the catalog and subscribe to anything that fits your
              protocol. Every addition is third-party tested before it ships.
            </p>
          </div>
          <Link
            href="/portal/shop"
            className="inline-flex items-center justify-center rounded-full bg-accent text-black font-semibold px-6 py-3 text-sm hover:bg-accent-soft transition-colors"
          >
            Browse the shop →
          </Link>
        </div>
      </section>
    </PortalShell>
  );
}
