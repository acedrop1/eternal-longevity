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
import { getLiveProducts } from '@/lib/catalog';
import { MEMBER_NAV, PageHeader, SectionTitle, btnPrimary, panel } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Subscriptions',
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

  const live = new Map((await getLiveProducts()).map((p) => [p.id, p]));
  return data.map((r) => {
    const product = live.get(r.product_id);
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
    <PortalShell user={user} nav={MEMBER_NAV}>
      <div>
        <PageHeader
          title="Manage your subscriptions."
          intro="Pause between cycles, skip a single cycle, or cancel any time before the next cycle is confirmed. No mid-cycle billing."
        />
        <p className="mt-3 font-mono text-[13px] tabular-nums text-black/55">
          {activeCount} active
        </p>
      </div>

      <SubscriptionsManager subscriptions={SUBSCRIPTIONS} />

      {/* With nothing to manage, the manager's empty state already points
          at the shop. */}
      {SUBSCRIPTIONS.length > 0 && (
        <section className={`${panel} p-5 md:p-8`}>
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <SectionTitle className="mb-2">Add another peptide</SectionTitle>
              <p className="max-w-xl text-[15px] leading-relaxed text-black/65">
                Browse the catalog and subscribe to anything that fits your
                protocol. Every addition goes back to the prescriber first.
              </p>
            </div>
            <Link href="/portal/shop" className={`${btnPrimary} self-start md:self-auto`}>
              Browse the shop →
            </Link>
          </div>
        </section>
      )}
    </PortalShell>
  );
}
