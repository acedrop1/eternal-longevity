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
import { STATUS_LABEL, type OrderStatus } from '@/lib/orders';
import { reviewForMember, type PatientReview } from '@/lib/clinical-review';

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
  orders: {
    ref: string;
    status: string;
    total: number;
    money: { label: string; value: number; strong?: boolean }[];
    products: string;
    placedAt: string;
    /** The moments that matter, newest last. */
    steps: { label: string; at: string }[];
    tracking: { carrier: string; number: string } | null;
    /** Something is wrong with this one. */
    warning: string | null;
  }[];
  /** Everything that has happened to this member, newest first. */
  timeline: {
    at: string;
    label: string;
    body: string | null;
    orderNumber: string;
    author: string | null;
  }[];
  /** The intake, read the way the prescriber reads it. */
  review: PatientReview | null;
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
    review: null,
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
          .from('orders')
          .select(
            'id, order_number, status, subtotal_cents, shipping_cents, tax_cents, discount_cents, promo_code, total_cents, created_at, paid_at, paid_confirmed_at',
          )
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

    const orderIds = (orders ?? []).map((o) => o.id);
    const { data: itemRows } = orderIds.length
      ? await db
          .from('order_items')
          .select('order_id, product_name, quantity, cadence_label')
          .in('order_id', orderIds)
      : { data: [] };
    const itemsByOrder = new Map<string, typeof itemRows>();
    for (const it of itemRows ?? []) {
      const list = itemsByOrder.get(it.order_id) ?? [];
      list.push(it);
      itemsByOrder.set(it.order_id, list);
    }

    const { data: fulRows } = await db
      .from('fulfillment_orders')
      .select('order_ref, submitted_at, shipped_at, tracking_carrier, tracking_number')
      .eq('user_id', id);
    const fulfilment = new Map((fulRows ?? []).map((f) => [f.order_ref, f]));

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
      orders: (orders ?? []).map((o) => {
        const items = itemsByOrder.get(o.id) ?? [];
        const ful = fulfilment.get(`FUL-${o.order_number}`);

        const steps: { label: string; at: string }[] = [
          { label: 'Placed', at: fmtDateTime(o.created_at) },
        ];
        if (o.paid_at) steps.push({ label: 'Approved by prescriber', at: fmtDateTime(o.paid_at) });
        if (o.paid_confirmed_at) steps.push({ label: 'Payment cleared', at: fmtDateTime(o.paid_confirmed_at) });
        if (ful?.submitted_at) steps.push({ label: 'Sent to pharmacy', at: fmtDateTime(ful.submitted_at) });
        if (ful?.shipped_at) steps.push({ label: 'Shipped', at: fmtDateTime(ful.shipped_at) });

        /*
         * An order that never left pending-admin means the release to the
         * prescriber failed — it is sitting where nobody is looking for it.
         */
        const warning =
          o.status === 'pending-admin'
            ? 'Never reached the prescriber. Release failed at checkout.'
            : o.status === 'signed' && !o.paid_confirmed_at
              ? 'Approved but the payment has not cleared.'
              : null;

        return {
          ref: o.order_number,
          status: o.status,
          total: Math.round((o.total_cents ?? 0) / 100),
          money: [
            { label: 'Subtotal', value: Math.round((o.subtotal_cents ?? 0) / 100) },
            ...(o.discount_cents
              ? [
                  {
                    label: `Discount${o.promo_code ? ` · ${o.promo_code}` : ''}`,
                    value: -Math.round(o.discount_cents / 100),
                  },
                ]
              : []),
            { label: 'Shipping', value: Math.round((o.shipping_cents ?? 0) / 100) },
            { label: 'Tax', value: Math.round((o.tax_cents ?? 0) / 100) },
            {
              label: 'Total',
              value: Math.round((o.total_cents ?? 0) / 100),
              strong: true,
            },
          ],
          products:
            items
              .map(
                (i) =>
                  `${i.product_name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}` +
                  (i.cadence_label ? ` · ${i.cadence_label}` : ''),
              )
              .join(' + ') || '—',
          placedAt: fmtDate(o.created_at),
          steps,
          tracking:
            ful?.tracking_number
              ? { carrier: ful.tracking_carrier ?? 'Carrier', number: ful.tracking_number }
              : null,
          warning,
        };
      }),
      timeline: (updates ?? []).map((u) => ({
        at: fmtDateTime(u.created_at),
        label: u.label,
        body: u.body,
        orderNumber: orderNumberById.get(u.order_id) ?? '—',
        author: u.author,
      })),
      review: await reviewForMember(id),
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

      {/*
        Was a two-column grid, which stretched an empty Order history card to
        match the tall email composer beside it and left half the screen blank.
        Short blocks share a row; anything that grows gets the full width.
      */}
      <div className="portal-stack">
      <div className="grid gap-6 lg:grid-cols-3">
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

        </div>

        <Section title="Order history">
          {detail.orders.length === 0 ? (
            <Empty>No orders yet.</Empty>
          ) : (
            <ul className="space-y-3">
              {detail.orders.map((o) => (
                <li
                  key={o.ref}
                  className="rounded-2xl border border-line bg-background p-4"
                >
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="font-mono text-xs text-foreground/85">
                      {o.ref}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground/85">
                      {o.products}
                    </span>
                    <span className="tabular-nums text-sm text-foreground">
                      ${o.total}
                    </span>
                    <span className="rounded-full border border-line px-2.5 py-0.5 text-[10px] font-semibold tracking-widest text-foreground/70">
                      {(STATUS_LABEL[o.status as OrderStatus] ?? o.status).toUpperCase()}
                    </span>
                  </div>

                  {/* Why the charge is not the sticker price. */}
                  <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                    {o.money.map((m) => (
                      <div key={m.label} className="flex items-baseline gap-1.5">
                        <dt className="text-[10px] tracking-widest text-foreground/40">
                          {m.label.toUpperCase()}
                        </dt>
                        <dd
                          className={cn(
                            'tabular-nums text-xs',
                            m.strong
                              ? 'font-semibold text-foreground'
                              : 'text-foreground/75',
                          )}
                        >
                          {m.value < 0 ? '−' : ''}${Math.abs(m.value)}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {/* The dates, so "where is it" has an answer without
                      opening anything. */}
                  <ol className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
                    {o.steps.map((st) => (
                      <li key={st.label}>
                        <div className="text-[10px] tracking-widest text-foreground/40">
                          {st.label.toUpperCase()}
                        </div>
                        <div className="text-xs text-foreground/80">{st.at}</div>
                      </li>
                    ))}
                  </ol>

                  {o.tracking && (
                    <p className="mt-3 text-xs text-foreground/70">
                      <span className="text-foreground/45">Tracking </span>
                      {o.tracking.carrier} · {o.tracking.number}
                    </p>
                  )}

                  {o.warning && (
                    <p className="mt-3 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2 text-xs text-accent">
                      {o.warning}
                    </p>
                  )}
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

        <Section title="Medical record">
          {!detail.review ? (
            <Empty>No intake on file.</Empty>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {(
                  [
                    ['Date of birth', detail.review.dob],
                    ['Age', detail.review.age],
                    ['Sex at birth', detail.review.sex],
                    ['Height / weight', detail.review.body],
                    ['Intake completed', detail.review.submittedAt],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[10px] tracking-widest text-foreground/45">
                      {k.toUpperCase()}
                    </div>
                    <div className="mt-0.5 text-sm text-foreground">{v}</div>
                  </div>
                ))}
              </div>

              <RecordGroup title="Contact" lines={detail.review.contact} />
              <RecordGroup title="Billing" lines={detail.review.context} />
              <RecordGroup title="Safety screen" lines={detail.review.safety} />
              <RecordGroup title="History" lines={detail.review.history} />
            </div>
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

function RecordGroup({
  title,
  lines,
}: {
  title: string;
  lines: { label: string; value: string; flag?: boolean }[];
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] tracking-widest text-foreground/45">
        {title.toUpperCase()}
      </div>
      <div className="grid gap-x-8 md:grid-cols-2">
        {lines.map((l) => (
          <div
            key={l.label}
            className="flex items-baseline justify-between gap-3 border-b border-line/60 py-1.5 last:border-0"
          >
            <span className="text-[13px] text-foreground/60">{l.label}</span>
            <span
              className={cn(
                'text-right text-[13px] font-medium',
                l.flag ? 'text-accent' : 'text-foreground/90',
              )}
            >
              {l.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-foreground/45">{children}</p>;
}
