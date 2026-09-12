import type { Metadata } from 'next';
import {
  ageFrom,
  formatDate as fmtDate,
  formatDateTime as fmtDateTime,
  formatPhone,
} from '@/lib/format';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { AdminEmailMember } from '@/components/admin/AdminEmailMember';
import { getSession } from '@/lib/auth-server';
import type { AccountStatus } from '@/lib/database.types';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Member record',
};

const ADMIN_NAV = [
  { label: 'Overview', href: '/portal/admin' },
  { label: 'Members', href: '/portal/admin/members' },
  { label: 'Queue', href: '/portal/admin/queue' },
        { label: 'Messages', href: '/portal/admin/messages' },
  { label: 'Billing', href: '/portal/admin/billing' },
  { label: 'Orders', href: '/portal/admin/fulfillment' },
  { label: 'Pharmacy', href: '/portal/admin/pharmacy' },
  { label: 'Compliance', href: '/portal/admin/compliance' },
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
  /** Everything that has happened to this member, newest first. */
  timeline: {
    at: string;
    label: string;
    body: string | null;
    orderNumber: string;
    author: string | null;
  }[];
  assessment: { label: string; value: string }[];
}

const STATUS_BADGE: Record<AccountStatus, string> = {
  active: 'border-accent/40 bg-accent/10 text-accent',
  suspended: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
  deactivated: 'border-line bg-surface text-foreground/45',
};

/**
 * Empty record, used only when the Supabase lookup fails. This screen shows
 * member contact details and assessment answers, so a fabricated fallback
 * would put invented health information in front of an admin.
 */
function demoDetail(id: string): MemberDetail {
  return {
    name: 'Member record unavailable',
    email: '—',
    phone: '—',
    dob: '—',
    status: 'active',
    joinedAt: '—',
    subscriptions: [],
    orders: [],
    timeline: [],
    assessment: [],
  };
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

    /*
     * fulfillment_orders is the pharmacy's view. The member's actual journey —
     * applied, ordered, approved by the prescriber, charged, shipped — lives in
     * order_updates against their shop orders, and admin had no way to see it.
     */
    const [{ data: subs }, { data: orders }, { data: intake }, { data: shopOrders }] =
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
        db
          .from('orders')
          .select('id, order_number')
          .eq('user_id', id),
      ]);

    const orderNumberById = new Map(
      (shopOrders ?? []).map((o) => [o.id, o.order_number]),
    );
    const { data: updates } = orderNumberById.size
      ? await db
          .from('order_updates')
          .select('order_id, label, body, author, created_at')
          .in('order_id', [...orderNumberById.keys()])
          .order('created_at', { ascending: false })
      : { data: [] };

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
      timeline: (updates ?? []).map((u) => ({
        at: fmtDateTime(u.created_at),
        label: u.label,
        body: u.body,
        orderNumber: orderNumberById.get(u.order_id) ?? '—',
        author: u.author,
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
          <Row label="Phone" value={formatPhone(detail.phone) || '—'} />
          <Row
            label="Date of birth"
            value={
              detail.dob
                ? `${fmtDate(detail.dob)}${
                    ageFrom(detail.dob) !== null ? ` · ${ageFrom(detail.dob)}` : ''
                  }`
                : '—'
            }
          />
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
        <Section title="Send an email">
          <AdminEmailMember userId={id} email={detail.email} />
        </Section>

        <Section title="Activity">
          {detail.timeline.length === 0 ? (
            <p className="text-sm text-foreground/55">
              Nothing yet. Applying, ordering, prescriber decisions, charges and
              shipments all appear here.
            </p>
          ) : (
            <ol className="space-y-3">
              {detail.timeline.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-accent"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-medium text-foreground">
                        {t.label}
                      </span>
                      <span className="font-mono text-[10px] tracking-wider text-foreground/40">
                        {t.orderNumber}
                      </span>
                    </div>
                    {t.body && (
                      <p className="mt-0.5 text-xs leading-relaxed text-foreground/55">
                        {t.body}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-foreground/40">
                      {t.at}
                      {t.author ? ` · ${t.author}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>

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
