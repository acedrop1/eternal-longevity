'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  AdminPageHeader,
  IndexFooter,
  IndexTabs,
  IndexToolbar,
  StatusBadge,
  indexCard,
  shortDate,
  table,
  tbody,
  td,
  th,
  thead,
  type BadgeTone,
} from '@/components/admin/IndexTable';

export interface SubRow {
  id: string;
  userId: string;
  member: string;
  email: string;
  product: string;
  plan: string;
  perCycle: number;
  status: 'active' | 'paused' | 'pending_review' | 'canceled';
  nextBilling: string | null;
  nextShipment: string | null;
  lastCharged: string | null;
  refillsLeft: number | null;
  rxExpires: string | null;
  /** Other active or paused plans the same member has. */
  otherPlans: number;
}

type Tab = 'active' | 'soon' | 'paused' | 'canceled' | 'all';
const DAY = 86_400_000;

const STATUS: Record<SubRow['status'], [string, BadgeTone]> = {
  active: ['Active', 'success'],
  paused: ['Paused', 'attention'],
  pending_review: ['Pending review', 'info'],
  canceled: ['Cancelled', 'neutral'],
};

/** Days from today (local) to a YYYY-MM-DD or ISO date. */
function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const t = Date.parse(date.length === 10 ? `${date}T12:00:00` : date);
  if (Number.isNaN(t)) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((t - today.getTime()) / DAY);
}

function when(days: number | null): string {
  if (days === null) return '';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} overdue`;
  return `in ${days} days`;
}

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** Admin → Subscriptions: every plan, soonest renewal first. A row opens the member. */
export function AdminSubscriptions({ rows }: { rows: SubRow[] }) {
  const [tab, setTab] = useState<Tab>('active');
  const [q, setQ] = useState('');

  const soon = (r: SubRow) => r.status === 'active' && (daysUntil(r.nextBilling) ?? 99) <= 7;
  const counts = {
    active: rows.filter((r) => r.status === 'active').length,
    soon: rows.filter(soon).length,
    paused: rows.filter((r) => r.status === 'paused').length,
    canceled: rows.filter((r) => r.status === 'canceled').length,
    all: rows.length,
  };
  const dueThisWeek = rows.filter(soon).reduce((s, r) => s + r.perCycle, 0);
  const multi = new Set(rows.filter((r) => r.otherPlans > 0 && r.status === 'active').map((r) => r.userId)).size;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const inTab =
        tab === 'all' ? true : tab === 'soon' ? soon(r) : tab === 'active' ? r.status === 'active' : r.status === tab;
      if (!inTab) return false;
      if (!needle) return true;
      return [r.member, r.email, r.product, r.plan].some((v) => v.toLowerCase().includes(needle));
    });
  }, [rows, tab, q]);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Subscriptions"
        subtitle={`${counts.active} active · ${counts.soon} renewing in the next 7 days (${money(dueThisWeek)}) · ${multi} member${multi === 1 ? '' : 's'} on more than one plan`}
      />

      <div className={indexCard}>
        <IndexTabs<Tab>
          label="Subscription status"
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'active', label: 'Active', count: counts.active },
            { key: 'soon', label: 'Renewing in 7 days', count: counts.soon },
            { key: 'paused', label: 'Paused', count: counts.paused },
            { key: 'canceled', label: 'Cancelled', count: counts.canceled },
            { key: 'all', label: 'All', count: counts.all },
          ]}
        />
        <IndexToolbar query={q} onQuery={setQ} placeholder="Search member, email or treatment" />

        {shown.length === 0 ? (
          <p className="px-4 py-10 text-center text-[14px] text-ink/60">
            {rows.length === 0 ? 'No subscriptions yet. They start when a prescriber signs an order.' : 'Nothing matches.'}
          </p>
        ) : (
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Member</th>
                <th className={th}>Treatment</th>
                <th className={th}>Per renewal</th>
                <th className={th}>Next renewal</th>
                <th className={th}>Refills left</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {shown.map((r) => {
                const d = daysUntil(r.nextBilling);
                const overdue = r.status === 'active' && d !== null && d < 0;
                const ship = daysUntil(r.nextShipment);
                const [label, tone] = STATUS[r.status];
                return (
                  <tr key={r.id} className="relative block border-t border-ink/10 px-4 py-3 first:border-t-0 hover:bg-milk/70 md:table-row md:p-0">
                    <td className={cn(td, 'block md:table-cell')}>
                      <Link href={`/portal/admin/members/${encodeURIComponent(r.userId)}`} className="font-semibold text-ink after:absolute after:inset-0">
                        {r.member}
                      </Link>
                      <div className="text-[13px] text-ink/60">
                        {r.email}
                        {r.otherPlans > 0 && <span className="ml-1.5 rounded-full bg-butter-soft px-1.5 py-px text-[12px] font-medium text-ink">+{r.otherPlans} more plan{r.otherPlans === 1 ? '' : 's'}</span>}
                      </div>
                    </td>
                    <td className={cn(td, 'block md:table-cell')}>
                      <div className="text-ink">{r.product}</div>
                      <div className="text-[13px] text-ink/60">{r.plan}</div>
                    </td>
                    <td className={cn(td, 'inline-block pr-4 tabular-nums md:table-cell')}>{money(r.perCycle)}</td>
                    <td className={cn(td, 'inline-block pr-4 md:table-cell')}>
                      {r.status === 'canceled' || !r.nextBilling ? (
                        <span className="text-ink/45">—</span>
                      ) : (
                        <>
                          <div className={cn('tabular-nums', overdue ? 'font-semibold text-red-700' : 'text-ink')}>
                            {shortDate(Date.parse(r.nextBilling.length === 10 ? `${r.nextBilling}T12:00:00` : r.nextBilling))}
                          </div>
                          <div className={cn('text-[13px]', overdue ? 'text-red-700' : 'text-ink/60')}>
                            {r.status === 'paused' ? 'paused' : when(d)}
                          </div>
                        </>
                      )}
                      {r.nextShipment && r.status !== 'canceled' && ship !== null && ship >= 0 && (
                        <div className="text-[13px] text-ink/60">2nd box ships {shortDate(Date.parse(`${r.nextShipment.slice(0, 10)}T12:00:00`))}</div>
                      )}
                    </td>
                    <td className={cn(td, 'inline-block pr-4 tabular-nums md:table-cell')}>
                      {r.refillsLeft ?? '—'}
                      {r.rxExpires && <div className="text-[13px] text-ink/60">Rx to {shortDate(Date.parse(r.rxExpires))}</div>}
                    </td>
                    <td className={cn(td, 'inline-block md:table-cell')}>
                      <StatusBadge tone={overdue ? 'critical' : tone}>{overdue ? 'Overdue' : label}</StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <IndexFooter shown={shown.length} total={rows.length} noun="subscriptions" />
      </div>
    </div>
  );
}
