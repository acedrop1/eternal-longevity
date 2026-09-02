import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import {
  SubscriptionsManager,
  type Subscription,
} from '@/components/portal/SubscriptionsManager';
import { getSession } from '@/lib/auth-server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/env';
import { getShopProduct } from '@/lib/shopProducts';

export const metadata: Metadata = {
  title: 'Subscriptions | Eternal Longevity',
};


/** The member's real subscriptions. Empty until they have one. */
async function loadSubscriptions(userId: string): Promise<Subscription[]> {
  if (!supabaseConfigured) return [];
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  return data.map((r) => {
    const product = getShopProduct(r.product_id);
    return {
      id: r.id,
      productName: r.product_name,
      cycleLabel: product?.cycleLength ?? '',
      cadenceLabel: r.cadence_label ?? '',
      perMonth: Math.round((r.per_cycle_cents ?? 0) / 100),
      nextBillingDate: r.next_billing_date
        ? new Date(r.next_billing_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '—',
      initialStatus: r.status === 'pending_review' ? 'pending-review' : r.status,
      image: product?.image ?? '/images/9.jpg',
      swatch: product?.swatch ?? '#1a1a1a',
    } as Subscription;
  });
}

export default async function SubscriptionsPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  const SUBSCRIPTIONS = await loadSubscriptions(user.id);

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
        { label: 'Messages', href: '/portal/messages' },
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
