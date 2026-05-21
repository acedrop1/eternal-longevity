import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import type { AccountStatus } from '@/lib/database.types';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Member record | Eternal Longevity',
};

const ADMIN_NAV = [
  { label: 'Overview', href: '/portal/admin' },
  { label: 'Members', href: '/portal/admin/members' },
  { label: 'Queue', href: '/portal/admin/queue' },
  { label: 'Billing', href: '/portal/admin/billing' },
  { label: 'Orders', href: '/portal/admin/fulfillment' },
  { label: 'Pharmacy', href: '/portal/admin/pharmacy' },
  { label: 'Settings', href: '/portal/admin/settings' },
];

interface MemberDetail {
  name: string;
  email: string;
  phone: string | null;
  dob: string | null;
  status: AccountStatus;
  joinedAt: string;
  subscriptions: {
    productName: string;
    status: string;
    cadence: string;
    perCycle: number;
  }[];
  orders: { ref: string; status: string; createdAt: string }[];
  assessment: { label: string; value: string }[];
}

const STATUS_BADGE: Record<AccountStatus, string> = {
  active: 'border-accent/40 bg-accent/10 text-accent',
  suspended: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
  deactivated: 'border-line bg-surface text-foreground/45',
};

const DEMO_NAMES: Record<string, { name: string; email: string }> = {
  'demo-m1': { name: 'Marcus Thompson', email: 'marcus.t@protonmail.com' },
  'demo-m2': { name: 'Lena Rodriguez', email: 'lena.r@gmail.com' },
  'demo-m3': { name: 'Sam Park', email: 'sam.park@icloud.com' },
  'demo-m4': { name: 'Hadi Khoury', email: 'hadi.k@gmail.com' },
  'demo-m5': { name: 'Priya Narayan', email: 'priya.n@gmail.com' },
};

function demoDetail(id: string): MemberDetail {
  const who = DEMO_NAMES[id] ?? {
    name: 'Member record',
    email: 'member@example.com',
  };
  return {
    name: who.name,
    email: who.email,
    phone: '(201) 555-0188',
    dob: '1988-03-12',
    status: 'active',
    joinedAt: 'Apr 23, 2026',
    subscriptions: [
      {
        productName: 'Recover Protocol',
        status: 'active',
        cadence: 'Quarterly',
        perCycle: 480,
      },
    ],
    orders: [
      { ref: 'FUL-DEMO02', status: 'shipped', createdAt: 'May 12, 2026' },
      { ref: 'FUL-DEMO01', status: 'delivered', createdAt: 'Feb 9, 2026' },
    ],
    assessment: [
      { label: 'Primary goal', value: 'Recovery & joint repair' },
      { label: 'Age', value: '38' },
      { label: 'Biological sex', value: 'Male' },
      { label: 'Current medications', value: 'None reported' },
      { label: 'Known conditions', value: 'None reported' },
      { label: 'Training load', value: '5–6 sessions / week' },
    ],
  };
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

async function loadDetail(id: string): Promise<MemberDetail | null> {
  if (!supabaseAdminConfigured()) return demoDetail(id);

  try {
    const db = createSupabaseAdminClient();
    const { data: profile } = await db
      .from('profiles')
      .select('full_name, email, phone, date_of_birth, account_status, created_at')
      .eq('id', id)
      .maybeSingle();
    if (!profile) return null;

    const [{ data: subs }, { data: orders }, { data: intake }] =
      await Promise.all([
        db
          .from('subscriptions')
          .select('product_name, status, cadence_label, per_cycle_cents')
          .eq('user_id', id),
        db
          .from('fulfillment_orders')
          .select('order_ref, status, created_at')
          .eq('user_id', id)
          .order('created_at', { ascending: false }),
        db
          .from('intake_submissions')
          .select('answers')
          .eq('user_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const answers =
      intake && intake.answers && typeof intake.answers === 'object'
        ? (intake.answers as Record<string, unknown>)
        : {};

    return {
      name: profile.full_name ?? 'Unnamed',
      email: profile.email ?? '',
      phone: profile.phone,
      dob: profile.date_of_birth,
      status: profile.account_status,
      joinedAt: fmtDate(profile.created_at),
      subscriptions: (subs ?? []).map((s) => ({
        productName: s.product_name,
        status: s.status,
        cadence: s.cadence_label ?? '—',
        perCycle: Math.round((s.per_cycle_cents ?? 0) / 100),
      })),
      orders: (orders ?? []).map((o) => ({
        ref: o.order_ref,
        status: o.status,
        createdAt: fmtDate(o.created_at),
      })),
      assessment: Object.entries(answers).map(([label, value]) => ({
        label,
        value:
          value == null
            ? '—'
            : typeof value === 'object'
              ? JSON.stringify(value)
              : String(value),
      })),
    };
  } catch {
    return demoDetail(id);
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberDetailPage({ params }: PageProps) {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

  const { id } = await params;
  const detail = await loadDetail(id);
  if (!detail) notFound();

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <Link
        href="/portal/admin/members"
        className="mb-6 inline-flex items-center gap-1.5 text-[11px] tracking-widest text-foreground/55 transition-colors hover:text-foreground"
      >
        <span aria-hidden>←</span> ALL USERS
      </Link>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {detail.name}
          </h1>
          <p className="mt-1 text-sm text-foreground/65">{detail.email}</p>
        </div>
        <span
          className={cn(
            'rounded-full border px-3 py-1 text-[10px] font-semibold tracking-widest',
            STATUS_BADGE[detail.status],
          )}
        >
          {detail.status.toUpperCase()}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account */}
        <Section title="Account">
          <Row label="Phone" value={detail.phone ?? '—'} />
          <Row label="Date of birth" value={fmtDate(detail.dob)} />
          <Row label="Member since" value={detail.joinedAt} />
        </Section>

        {/* Plan */}
        <Section title="Plan">
          {detail.subscriptions.length === 0 ? (
            <Empty>No active subscriptions.</Empty>
          ) : (
            <ul className="space-y-3">
              {detail.subscriptions.map((s, i) => (
                <li
                  key={i}
                  className="rounded-2xl border border-line bg-background p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {s.productName}
                    </span>
                    <span className="text-[10px] tracking-widest text-accent">
                      {s.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/55">
                    {s.cadence} · ${s.perCycle} per cycle
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Order history */}
        <Section title="Order history">
          {detail.orders.length === 0 ? (
            <Empty>No orders yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {detail.orders.map((o, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-2xl border border-line bg-background px-4 py-3"
                >
                  <span className="font-mono text-xs text-foreground/85">
                    {o.ref}
                  </span>
                  <span className="text-xs text-foreground/55">
                    {o.createdAt}
                  </span>
                  <span className="text-[10px] tracking-widest text-accent">
                    {o.status.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Assessment */}
        <Section title="Assessment">
          {detail.assessment.length === 0 ? (
            <Empty>No intake on file.</Empty>
          ) : (
            <dl className="space-y-2.5">
              {detail.assessment.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-4 border-b border-line pb-2.5 last:border-0 last:pb-0"
                >
                  <dt className="text-xs text-foreground/55">{a.label}</dt>
                  <dd className="max-w-[60%] text-right text-sm text-foreground/90">
                    {a.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Section>
      </div>
    </PortalShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-6">
      <h2 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2.5 text-sm last:border-0">
      <span className="text-foreground/55">{label}</span>
      <span className="text-foreground/90">{value}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-foreground/45">{children}</p>;
}
