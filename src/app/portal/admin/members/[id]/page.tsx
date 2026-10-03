import type { Metadata } from 'next';
import {
  ageFrom,
  formatDate as fmtDate,
  formatDateTime as fmtDateTime,
  formatPhone,
} from '@/lib/format';
import { notFound, redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { AdminEmailMember } from '@/components/admin/AdminEmailMember';
import { AdminMemberActions } from '@/components/admin/AdminMemberActions';
import { ROLE_LABEL, STATUS_BADGE } from '@/components/admin/user-labels';
import { SectionCard, StatusBadge, secondaryButton } from '@/components/admin/IndexTable';
import { DetailHeader, InfoRow, detailGrid } from '@/components/admin/DetailHeader';
import type { Role } from '@/lib/auth';
import { getSession, loginUrl } from '@/lib/auth-server';
import type { AccountStatus } from '@/lib/database.types';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { cn } from '@/lib/utils';
import { STATUS_LABEL, type OrderStatus } from '@/lib/orders';
import { reviewForMember, type PatientReview } from '@/lib/clinical-review';
import { ADMIN_NAV } from '@/components/portal/ui';
import { CategoryAnswers } from '@/components/doctor/CategoryAnswers';

export const metadata: Metadata = {
  title: 'Member record',
};


interface MemberDetail {
  name: string;
  email: string;
  phone: string | null;
  dob: string | null;
  status: AccountStatus;
  role: Role;
  joinedAt: string;
  addresses: { label: string; fullName: string; lines: string[]; primary: boolean }[];
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
    role: 'member',
    joinedAt: '—',
    addresses: [],
    subscriptions: [],
    orders: [],
    timeline: [],
    review: null,
  };
}


async function loadDetail(id: string): Promise<MemberDetail | null> {
  if (!supabaseAdminConfigured()) {
    // Dev only: a sample record for the sample users the Members list shows.
    // NODE_ENV is inlined at build, so production never loads the fixture.
    if (process.env.NODE_ENV === 'development') {
      const u = (await import('@/components/admin/dev-sample')).SAMPLE_USERS.find((x) => x.id === id);
      if (u) {
        const d: MemberDetail = (await import('@/components/admin/dev-sample-pages')).sampleMemberDetail();
        const member = u.role === 'member';
        return {
          ...d,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          joinedAt: u.joinedAt,
          orders: member ? d.orders : [],
          subscriptions: member ? d.subscriptions : [],
          timeline: member ? d.timeline : [],
        };
      }
    }
    return demoDetail(id);
  }

  try {
    const db = createSupabaseAdminClient();
    const { data: profile } = await db
      .from('profiles')
      .select('full_name, email, phone, date_of_birth, account_status, role, created_at')
      .eq('id', id)
      .maybeSingle();
    if (!profile) return null;

    /*
     * fulfillment_orders is the pharmacy's view. The member's actual journey —
     * applied, ordered, approved by the prescriber, charged, shipped — lives in
     * order_updates against their shop orders, and admin had no way to see it.
     */
    const [{ data: subs }, { data: orders }, { data: intake }, { data: shopOrders }, { data: addressRows }] =
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
        db
          .from('addresses')
          .select('label, full_name, line1, line2, city, state, zip, is_primary')
          .eq('user_id', id)
          .order('created_at'),
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
      role: profile.role,
      joinedAt: fmtDate(profile.created_at),
      addresses: (addressRows ?? [])
        .map((a) => ({
          label: a.label,
          fullName: a.full_name,
          lines: [a.line1, a.line2, `${a.city}, ${a.state} ${a.zip}`].filter((l): l is string => Boolean(l)),
          primary: a.is_primary,
        }))
        .sort((x, y) => Number(y.primary) - Number(x.primary)),
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
        // Signing no longer writes paid_at; the timeline entry is the record (paid_at for older orders).
        const approvedAt =
          (updates ?? []).find((u) => u.order_id === o.id && u.label === 'Order approved')?.created_at ?? o.paid_at;
        if (approvedAt) steps.push({ label: 'Approved by prescriber', at: fmtDateTime(approvedAt) });
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
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const { id } = await params;
  const detail = await loadDetail(id);
  if (!detail) notFound();

  const sample = !supabaseAdminConfigured() && process.env.NODE_ENV === 'development';
  const spent = detail.orders.reduce((n, o) => n + o.total, 0);
  const [statusLabel, statusTone] = STATUS_BADGE[detail.status];

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="space-y-5">
        <DetailHeader
          backHref="/portal/admin/members"
          backLabel="Members"
          title={detail.name}
          badges={
            <>
              <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
              {detail.role !== 'member' && <StatusBadge tone="info">{ROLE_LABEL[detail.role]}</StatusBadge>}
            </>
          }
          meta={`${detail.email} · Member since ${detail.joinedAt}`}
          actions={
            <a href="#email-member" className={secondaryButton}>
              Email member
            </a>
          }
        />

        {sample && (
          <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[14px] text-amber-900">
            Sample data (dev only). Account actions and email need Supabase.
          </p>
        )}

        <div className={detailGrid}>
          {/* ---------- Main column ---------- */}
          <div className="min-w-0 space-y-4">
            <SectionCard
              title="Orders"
              description={
                detail.orders.length
                  ? `${detail.orders.length} ${detail.orders.length === 1 ? 'order' : 'orders'} · $${spent} total`
                  : undefined
              }
              flush
            >
              {detail.orders.length === 0 ? (
                <Empty>No orders yet.</Empty>
              ) : (
                <ul className="divide-y divide-ink/10">
                  {detail.orders.map((o) => (
                    <li key={o.ref} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-[14px] font-semibold text-ink">#{o.ref}</span>
                        <span className="text-[13px] text-ink/60">{o.placedAt}</span>
                        <StatusBadge tone={o.warning ? 'attention' : 'neutral'}>
                          {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                        </StatusBadge>
                        <span className="ml-auto tabular-nums text-[14px] font-medium text-ink">${o.total}</span>
                        <span className="basis-full truncate text-[14px] text-ink/80">{o.products}</span>
                      </div>

                      {/* Why the charge is not the sticker price. */}
                      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                        {o.money.map((m) => (
                          <div key={m.label} className="flex items-baseline gap-1.5">
                            <dt className="text-[13px] text-ink/60">{m.label}</dt>
                            <dd className={cn('tabular-nums text-[13px]', m.strong ? 'font-semibold text-ink' : 'text-ink/75')}>
                              {m.value < 0 ? '−' : ''}${Math.abs(m.value)}
                            </dd>
                          </div>
                        ))}
                      </dl>

                      {/* The dates, so "where is it" has an answer without
                          opening anything. */}
                      <ol className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5">
                        {o.steps.map((st) => (
                          <li key={st.label}>
                            <div className="text-[13px] text-ink/60">{st.label}</div>
                            <div className="text-[13px] text-ink/85">{st.at}</div>
                          </li>
                        ))}
                      </ol>

                      {o.tracking && (
                        <p className="mt-2 text-[13px] text-ink/75">
                          <span className="text-ink/60">Tracking </span>
                          {o.tracking.carrier} · {o.tracking.number}
                        </p>
                      )}

                      {o.warning && (
                        <p className="mt-2 rounded-thumb border border-amber-600/25 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                          {o.warning}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Subscriptions" flush>
              {detail.subscriptions.length === 0 ? (
                <Empty>No active subscriptions.</Empty>
              ) : (
                <ul className="divide-y divide-ink/10">
                  {detail.subscriptions.map((s, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                      <span className="text-[14px] font-medium text-ink">{s.productName}</span>
                      <StatusBadge tone={s.status === 'active' ? 'success' : 'neutral'}>{s.status}</StatusBadge>
                      <span className="ml-auto text-[13px] tabular-nums text-ink/65">
                        {s.cadence} · ${s.perCycle} per cycle
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Timeline">
              {detail.timeline.length === 0 ? (
                <p className="text-[14px] text-ink/65">
                  Nothing yet. Applying, ordering, prescriber decisions, charges and
                  shipments all appear here.
                </p>
              ) : (
                <ol className="relative space-y-3 before:absolute before:bottom-1 before:left-[3px] before:top-1 before:w-px before:bg-ink/10">
                  {detail.timeline.map((t, i) => (
                    <li key={i} className="relative flex gap-3">
                      <span aria-hidden className="mt-1.5 h-[7px] w-[7px] flex-none rounded-full bg-butter-deep ring-2 ring-white" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-[14px] font-medium text-ink">{t.label}</span>
                          <span className="text-[13px] text-ink/60">#{t.orderNumber}</span>
                        </div>
                        {t.body && <p className="mt-0.5 text-[13px] leading-relaxed text-ink/65">{t.body}</p>}
                        <p className="mt-0.5 text-[13px] text-ink/60">
                          {t.at}
                          {t.author ? ` · ${t.author}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>

            <div id="email-member" className="scroll-mt-24">
              <SectionCard title="Send an email">
                <AdminEmailMember userId={id} email={detail.email} />
              </SectionCard>
            </div>

            <SectionCard title="Medical record">
              {!detail.review ? (
                <p className="text-[14px] text-ink/60">No intake on file.</p>
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
                        <div className="text-[13px] text-ink/60">{k}</div>
                        <div className="mt-0.5 text-[14px] text-ink">{v}</div>
                      </div>
                    ))}
                  </div>

                  <RecordGroup title="Contact" lines={detail.review.contact} />
                  <RecordGroup title="Billing" lines={detail.review.context} />
                  <RecordGroup title="Safety screen" lines={detail.review.safety} />
                  <RecordGroup title="History" lines={detail.review.history} />
                  {detail.review.categories.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[14px] font-medium text-ink/65">Category answers</div>
                      <CategoryAnswers sections={detail.review.categories} />
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          </div>

          {/* ---------- Sidebar ---------- */}
          <aside className="min-w-0 space-y-4">
            <SectionCard title="Contact">
              <dl className="-my-1.5">
                <InfoRow label="Email">
                  {detail.email && detail.email !== '—' ? (
                    <a href={`mailto:${detail.email}`} className="underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink">
                      {detail.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </InfoRow>
                <InfoRow label="Phone">{formatPhone(detail.phone) || '—'}</InfoRow>
                <InfoRow label="Date of birth">
                  {detail.dob
                    ? `${fmtDate(detail.dob)}${ageFrom(detail.dob) !== null ? ` · ${ageFrom(detail.dob)}` : ''}`
                    : '—'}
                </InfoRow>
              </dl>
            </SectionCard>

            <SectionCard title="Addresses">
              {detail.addresses.length === 0 ? (
                <p className="text-[14px] text-ink/60">No saved addresses.</p>
              ) : (
                <ul className="space-y-3">
                  {detail.addresses.map((a, i) => (
                    <li key={i} className="text-[14px] leading-relaxed text-ink/85">
                      <div className="mb-0.5 flex items-center gap-2 text-[13px] text-ink/60">
                        {a.label}
                        {a.primary && <StatusBadge tone="neutral">Default</StatusBadge>}
                      </div>
                      <div className="text-ink">{a.fullName}</div>
                      {a.lines.map((l) => (
                        <div key={l}>{l}</div>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Account">
              <AdminMemberActions
                userId={id}
                name={detail.name}
                role={detail.role}
                status={detail.status}
                joinedAt={detail.joinedAt}
              />
            </SectionCard>
          </aside>
        </div>
      </div>
    </PortalShell>
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
      <div className="mb-1.5 text-[14px] font-medium text-ink/65">
        {title}
      </div>
      <div className="grid gap-x-8 md:grid-cols-2">
        {lines.map((l) => (
          <div
            key={l.label}
            className="flex items-baseline justify-between gap-3 border-b border-ink/[0.06] py-1.5 last:border-0"
          >
            <span className="text-[14px] text-ink/60">{l.label}</span>
            <span
              className={cn(
                'text-right text-[14px] font-medium',
                l.flag ? 'text-amber-800' : 'text-ink/90',
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
  return <p className="px-4 py-3.5 text-[14px] text-ink/60">{children}</p>;
}
