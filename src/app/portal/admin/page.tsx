import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession, loginUrl } from '@/lib/auth-server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { ADMIN_NAV } from '@/components/portal/ui';
import { monthlyRecurringCents, paidRevenue } from '@/lib/revenue';
import {
  LIVE_ORDER_STATUSES,
  selectStale,
  waited,
  type StaleKind,
  type SweepOrder,
  type SweepShipment,
} from '@/lib/order-health';
import { getPendingCounts } from '@/lib/pending-counts';
import type { OrderStatus } from '@/lib/orders';
import {
  AdminPageHeader,
  MetricCard,
  SectionCard,
  StatusBadge,
  type BadgeTone,
} from '@/components/admin/IndexTable';

export const metadata: Metadata = {
  title: 'Admin',
};

interface Overview {
  members: number;
  mrr: number;
  revenueToday: { orders: number; cents: number };
  revenueWeek: { orders: number; cents: number };
  messagesAwaiting: number;
  applications: number;
  awaitingVisit: number;
  shippedWeek: number;
  /** Orders still in motion (lib/order-health LIVE_ORDER_STATUSES). */
  orders: SweepOrder[];
  /** Fulfillment rows on the board's "To place" tab (draft or submitted). */
  toPlace: SweepShipment[];
  activity: { time: string; action: string }[];
}

const EMPTY: Overview = {
  members: 0,
  mrr: 0,
  revenueToday: { orders: 0, cents: 0 },
  revenueWeek: { orders: 0, cents: 0 },
  messagesAwaiting: 0,
  applications: 0,
  awaitingVisit: 0,
  shippedWeek: 0,
  orders: [],
  toPlace: [],
  activity: [],
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Live operational numbers. Everything comes from the database — no mock. */
async function loadOverview(): Promise<Overview> {
  if (!supabaseAdminConfigured()) return EMPTY;

  try {
    const db = createSupabaseAdminClient();
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

    const [members, subs, intakes, orders, shipments, shipped, updates, today, week, counts] =
      await Promise.all([
        db.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'member'),
        db.from('subscriptions').select('per_cycle_cents, cadence_label').eq('status', 'active'),
        db.from('intake_submissions').select('status'),
        // Same shape the hourly stale sweep reads (api/cron/stale-orders).
        db
          .from('orders')
          .select('order_number, status, created_at, paid_confirmed_at, order_updates(status_change, created_at)')
          .in('status', LIVE_ORDER_STATUSES as OrderStatus[])
          .order('created_at', { ascending: true })
          .limit(500),
        db
          .from('fulfillment_orders')
          .select('order_ref, status, created_at, submitted_at')
          .in('status', ['draft', 'submitted'])
          .order('created_at', { ascending: true })
          .limit(500),
        db
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'shipped')
          .gte('created_at', weekAgo),
        db
          .from('order_updates')
          .select('author, author_role, label, body, created_at')
          .order('created_at', { ascending: false })
          .limit(6),
        paidRevenue(db, startOfToday()),
        paidRevenue(db, weekAgo),
        // The nav badges' counts; "messages awaiting a reply" uses the inbox's rule.
        getPendingCounts('admin'),
      ]);

    const intakeRows = intakes.data ?? [];
    const countIntakes = (...s: string[]) => intakeRows.filter((r) => s.includes(r.status)).length;

    return {
      members: members.count ?? 0,
      // Same definition as Billing (lib/revenue).
      mrr: monthlyRecurringCents(subs.data ?? []),
      revenueToday: today,
      revenueWeek: week,
      messagesAwaiting: counts['/portal/admin/messages'] ?? 0,
      applications: countIntakes('submitted', 'in_review', 'needs_info'),
      awaitingVisit: countIntakes('awaiting_visit'),
      shippedWeek: shipped.count ?? 0,
      orders: (orders.data ?? []) as unknown as SweepOrder[],
      toPlace: shipments.data ?? [],
      activity: (updates.data ?? []).map((u) => ({
        time: fmtTime(u.created_at),
        action: [u.author ?? u.author_role ?? 'System', u.label, u.body ?? ''].filter(Boolean).join(' · '),
      })),
    };
  } catch {
    return EMPTY;
  }
}

/** Dev only, no Supabase: the same numbers worked out from the sample fixture. */
async function loadSample(): Promise<Overview> {
  const s = await import('@/components/admin/dev-sample');
  const iso = (ms: number) => new Date(ms).toISOString();
  const paidSince = (since: number) => {
    const paid = s.SAMPLE_ORDERS.filter((o) => o.paidAt && o.paidAt >= since);
    return { orders: paid.length, cents: paid.reduce((sum, o) => sum + o.total * 100, 0) };
  };
  return {
    ...EMPTY,
    members: s.SAMPLE_USERS.filter((u) => u.role === 'member').length,
    revenueToday: paidSince(Date.parse(startOfToday())),
    revenueWeek: paidSince(Date.now() - 7 * 86400_000),
    orders: s.SAMPLE_ORDERS.map((o) => ({
      order_number: o.id,
      status: o.status,
      created_at: iso(o.placedAt),
      paid_confirmed_at: o.paidAt ? iso(o.paidAt) : null,
    })),
    toPlace: s.SAMPLE_BOARD.filter((b) => b.status === 'draft' || b.status === 'submitted').map((b) => ({
      order_ref: b.orderRef,
      status: b.status,
      created_at: b.createdAt,
      submitted_at: null,
    })),
    activity: [...s.SAMPLE_ORDERS].sort((a, b) => b.placedAt - a.placedAt).slice(0, 4).map((o) => ({
      time: fmtTime(iso(o.placedAt)),
      action: `System · Order #${o.id} · ${o.memberName}`,
    })),
  };
}

const STALE: Record<StaleKind, [string, BadgeTone]> = {
  assigned: ['With the prescriber', 'attention'],
  unpaid: ['Approved, not paid', 'attention'],
  release: ['Never reached the prescriber', 'critical'],
  toPlace: ['Paid, not placed', 'attention'],
};

const money = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default async function AdminPortalPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const live = supabaseAdminConfigured();
  // NODE_ENV is inlined at build, so production never loads the fixture.
  const sample = process.env.NODE_ENV === 'development' && !live;
  const o = sample ? await loadSample() : await loadOverview();

  const by = (...s: string[]) => o.orders.filter((r) => s.includes(r.status));
  const withPrescriber = by('assigned');
  const unpaid = by('signed').filter((r) => !r.paid_confirmed_at);
  const failedRelease = by('pending-admin');
  const openOrders = by('pending-admin', 'assigned', 'signed', 'paid', 'compounding').length;
  const stale = selectStale(o.orders, o.toPlace, Date.now());
  const staleCount = (k: StaleKind) => stale.filter((s) => s.kind === k).length;

  // Board Issues not yet on the board, as the nav badge counts them, plus anything past its limit.
  const attention: { label: string; detail: string; href: string; tone: BadgeTone; badge: string }[] = [
    ...(failedRelease.length
      ? [{
          label: plural(failedRelease.length, 'order never reached', 'orders never reached') + ' the prescriber',
          detail: 'The release at checkout failed; it is retried hourly.',
          href: '/portal/admin/fulfillment?tab=issues',
          tone: 'critical' as const,
          badge: 'Issue',
        }]
      : []),
    ...(unpaid.length
      ? [{
          label: `${plural(unpaid.length, 'order')} approved, not paid`,
          detail: 'Signed by the prescriber; the money has not landed.',
          href: '/portal/admin/fulfillment?tab=issues',
          tone: 'attention' as const,
          badge: 'Unpaid',
        }]
      : []),
    ...(o.messagesAwaiting
      ? [{
          label: `${plural(o.messagesAwaiting, 'message')} awaiting a reply`,
          detail: 'Support threads where the member spoke last.',
          href: '/portal/admin/messages',
          tone: 'info' as const,
          badge: 'Inbox',
        }]
      : []),
    ...stale.map((s) => ({
      label: `Order #${s.ref}`,
      detail: `${STALE[s.kind][0]} for ${waited(s.hours)}`,
      href: '/portal/admin/fulfillment?tab=issues',
      tone: STALE[s.kind][1],
      badge: 'Stuck',
    })),
  ];

  const pipeline = [
    { label: 'Awaiting visit', count: o.awaitingVisit, href: '/portal/admin/queue' },
    { label: 'Applications', count: o.applications, href: '/portal/admin/queue' },
    { label: 'With prescriber', count: withPrescriber.length, href: '/portal/admin/fulfillment?tab=review' },
    { label: 'Compounding', count: by('signed', 'paid', 'compounding').length, href: '/portal/admin/fulfillment?tab=placed' },
    { label: 'Shipped (7d)', count: o.shippedWeek, href: '/portal/admin/fulfillment?tab=shipped' },
  ];

  const firstName = (user.name ?? '').split(' ')[0] || 'there';

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="space-y-5">
        <AdminPageHeader
          title="Overview"
          subtitle={`Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${firstName}. ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}.`}
        />

        {!live && (
          <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
            {sample ? 'Sample data (dev only). ' : 'Demo data. '}
            Real numbers appear once Supabase is connected.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label="Revenue today"
            value={money(o.revenueToday.cents)}
            hint={plural(o.revenueToday.orders, 'paid order')}
            href="/portal/admin/billing"
          />
          <MetricCard
            label="Revenue, 7 days"
            value={money(o.revenueWeek.cents)}
            hint={plural(o.revenueWeek.orders, 'paid order')}
            href="/portal/admin/billing"
          />
          <MetricCard
            label="With prescriber"
            value={withPrescriber.length}
            hint={staleCount('assigned') ? `${staleCount('assigned')} over 24h` : 'Awaiting sign-off'}
            href="/portal/admin/fulfillment?tab=review"
          />
          <MetricCard
            label="Approved, unpaid"
            value={unpaid.length}
            hint={staleCount('unpaid') ? `${staleCount('unpaid')} over 48h` : 'Signed, no payment yet'}
            href="/portal/admin/fulfillment?tab=issues"
          />
          <MetricCard
            label="To place"
            value={o.toPlace.length}
            hint={staleCount('toPlace') ? `${staleCount('toPlace')} over a day` : 'With the pharmacy next'}
            href="/portal/admin/fulfillment?tab=place"
          />
          <MetricCard
            label="Members"
            value={o.members}
            hint={`${money(o.mrr)} MRR`}
            href="/portal/admin/members?tab=members"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            <SectionCard
              flush
              title="Needs attention"
              description="Orders board issues, unanswered messages, and anything stuck past its limit."
            >
              {attention.length === 0 ? (
                <p className="px-4 py-6 text-[13px] text-ink/65">All clear. Nothing is waiting on the team.</p>
              ) : (
                <ul className="divide-y divide-ink/10">
                  {attention.map((a, i) => (
                    <li key={i}>
                      <Link
                        href={a.href}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-milk/70"
                      >
                        <StatusBadge tone={a.tone}>{a.badge}</StatusBadge>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-ink">{a.label}</span>
                          <span className="block truncate text-[12px] text-ink/65">{a.detail}</span>
                        </span>
                        <span aria-hidden className="flex-none text-ink/40">›</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard flush title="Recent activity" description="Order and clinical updates as they happen.">
              {o.activity.length === 0 ? (
                <p className="px-4 py-6 text-[13px] text-ink/65">
                  No activity yet. Order and clinical updates land here as they happen.
                </p>
              ) : (
                <ul className="divide-y divide-ink/10">
                  {o.activity.map((a, i) => (
                    <li key={i} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
                      <span className="flex-none text-[12px] text-ink/65 tabular-nums sm:w-28">{a.time}</span>
                      <span className="min-w-0 text-[13px] text-ink/85">{a.action}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <SectionCard flush title="Pipeline" description={`${plural(openOrders, 'open order')}`} className="self-start">
            <ul className="divide-y divide-ink/10">
              {pipeline.map((p) => (
                <li key={p.label}>
                  <Link
                    href={p.href}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px] transition-colors hover:bg-milk/70"
                  >
                    <span className="text-ink/75">{p.label}</span>
                    <span className="font-semibold tabular-nums text-ink">{p.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-t border-ink/10 px-4 py-2.5">
              <Link
                href="/portal/admin/queue"
                className="text-[13px] font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
              >
                See applications →
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </PortalShell>
  );
}
