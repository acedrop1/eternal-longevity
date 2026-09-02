import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Admin | Eternal Longevity',
};

interface Overview {
  members: number;
  mrr: number;
  pendingIntakes: number;
  openOrders: number;
  pipeline: { label: string; count: number }[];
  activity: { time: string; action: string }[];
}

/** Live operational numbers. Everything comes from the database — no mock. */
async function loadOverview(): Promise<Overview> {
  const empty: Overview = {
    members: 0,
    mrr: 0,
    pendingIntakes: 0,
    openOrders: 0,
    pipeline: [],
    activity: [],
  };
  if (!supabaseAdminConfigured()) return empty;

  try {
    const db = createSupabaseAdminClient();
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

    const [members, subs, intakes, orders, shipped, updates] =
      await Promise.all([
        db
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'member'),
        db
          .from('subscriptions')
          .select('per_cycle_cents, cadence_label')
          .eq('status', 'active'),
        db
          .from('intake_submissions')
          .select('status'),
        db
          .from('orders')
          .select('status'),
        db
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'shipped')
          .gte('created_at', weekAgo),
        db
          .from('order_updates')
          .select('author, author_role, note, status_change, created_at')
          .order('created_at', { ascending: false })
          .limit(6),
      ]);

    // Normalize each active subscription to a per-month figure.
    const mrr = (subs.data ?? []).reduce((sum, s) => {
      const cents = s.per_cycle_cents ?? 0;
      const label = (s.cadence_label ?? '').toLowerCase();
      const perMonth = label.includes('quarter')
        ? cents / 3
        : label.includes('annual')
          ? cents / 12
          : cents;
      return sum + perMonth;
    }, 0);

    const intakeRows = intakes.data ?? [];
    const orderRows = orders.data ?? [];
    const count = (rows: { status: string }[], ...statuses: string[]) =>
      rows.filter((r) => statuses.includes(r.status)).length;

    return {
      members: members.count ?? 0,
      mrr: Math.round(mrr / 100),
      pendingIntakes: count(intakeRows, 'submitted', 'in_review', 'needs_info'),
      openOrders: count(orderRows, 'pending-admin', 'assigned', 'signed', 'paid', 'compounding'),
      pipeline: [
        { label: 'Awaiting visit', count: count(intakeRows, 'awaiting_visit') },
        { label: 'Intake review', count: count(intakeRows, 'submitted', 'in_review', 'needs_info') },
        { label: 'Physician sign-off', count: count(orderRows, 'assigned') },
        { label: 'Compounding', count: count(orderRows, 'signed', 'paid', 'compounding') },
        { label: 'Shipped (7d)', count: shipped.count ?? 0 },
      ],
      activity: (updates.data ?? []).map((u) => ({
        time: new Date(u.created_at).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        action: [u.author ?? u.author_role ?? 'System', u.note ?? u.status_change ?? '']
          .filter(Boolean)
          .join(' · '),
      })),
    };
  } catch {
    return empty;
  }
}

export default async function AdminPortalPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

  const o = await loadOverview();
  const maxPipe = Math.max(1, ...o.pipeline.map((p) => p.count));

  const metrics = [
    { label: 'Active members', value: String(o.members) },
    { label: 'MRR (active subs)', value: `$${o.mrr.toLocaleString()}` },
    { label: 'Pending review', value: String(o.pendingIntakes) },
    { label: 'Open orders', value: String(o.openOrders) },
  ];

  return (
    <PortalShell
      user={user}
      nav={[
        { label: 'Overview', href: '/portal/admin' },
        { label: 'Members', href: '/portal/admin/members' },
        { label: 'Queue', href: '/portal/admin/queue' },
        { label: 'Messages', href: '/portal/admin/messages' },
        { label: 'Billing', href: '/portal/admin/billing' },
        { label: 'Orders', href: '/portal/admin/fulfillment' },
        { label: 'Pharmacy', href: '/portal/admin/pharmacy' },
        { label: 'Settings', href: '/portal/admin/settings' },
      ]}
    >
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          OPERATIONS ·{' '}
          {new Date()
            .toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })
            .toUpperCase()}
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'},{' '}
          {(user.name ?? '').split(' ')[0] || 'there'}.
        </h1>
      </div>

      {/* Metrics */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-3xl border border-line bg-surface p-5">
            <p className="mb-2 text-[10px] tracking-widest text-foreground/50">
              {m.label.toUpperCase()}
            </p>
            <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="mb-8 rounded-3xl border border-line bg-surface p-6">
        <p className="mb-1 text-[10px] tracking-widest text-foreground/50">PIPELINE</p>
        <h2 className="mb-5 text-xl font-semibold tracking-tight text-foreground">
          Members in motion
        </h2>
        {o.pipeline.every((p) => p.count === 0) ? (
          <p className="text-sm text-foreground/50">
            Nothing in flight right now. New intakes and orders appear here.
          </p>
        ) : (
          <div className="space-y-3">
            {o.pipeline.map((p) => (
              <div key={p.label} className="flex items-center gap-4">
                <span className="w-40 flex-none text-sm text-foreground/70">{p.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(p.count / maxPipe) * 100}%` }}
                  />
                </div>
                <span className="w-8 flex-none text-right text-sm font-semibold text-foreground tabular-nums">
                  {p.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity */}
      <div className="rounded-3xl border border-line bg-surface p-6">
        <p className="mb-1 text-[10px] tracking-widest text-foreground/50">RECENT ACTIVITY</p>
        <h2 className="mb-5 text-xl font-semibold tracking-tight text-foreground">
          What just happened
        </h2>
        {o.activity.length === 0 ? (
          <p className="text-sm text-foreground/50">
            No activity yet. Order and clinical updates land here as they happen.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {o.activity.map((a, i) => (
              <li key={i} className="flex items-baseline gap-4 py-3">
                <span className="w-28 flex-none text-xs text-foreground/45 tabular-nums">
                  {a.time}
                </span>
                <span className="text-sm text-foreground/85">{a.action}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 border-t border-line pt-4">
          <Link href="/portal/admin/queue" className="text-sm text-accent hover:underline">
            Open the review queue →
          </Link>
        </div>
      </div>
    </PortalShell>
  );
}
