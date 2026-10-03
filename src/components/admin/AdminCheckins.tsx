'use client';

import { useMemo, useState } from 'react';
import type { CheckinRow } from '@/lib/checkins-db';
import { cn } from '@/lib/utils';
import {
  IndexFooter,
  IndexTabs,
  IndexToolbar,
  StatusBadge,
  indexCard,
  table,
  tbody,
  td,
  th,
  thead,
} from '@/components/admin/IndexTable';

/** Low (3 or below): the follow-up threshold. */
const isLow = (r: CheckinRow) => r.rating !== null && r.rating <= 3;
/** Emailed to support on arrival (low score or any comment): someone owes them a reply. */
const needsFollowUp = (r: CheckinRow) => isLow(r) || Boolean(r.comment?.trim());

type Tab = 'all' | 'low' | 'followup';
const TAB_TEST: Record<Tab, (r: CheckinRow) => boolean> = {
  all: () => true,
  low: isLow,
  followup: needsFollowUp,
};
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'low', label: 'Low scores' },
  { key: 'followup', label: 'Awaiting follow-up' },
];

/** `date` is formatted on the server so it cannot drift across time zones at hydration. */
export function AdminCheckins({ rows }: { rows: (CheckinRow & { date: string })[] }) {
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        TAB_TEST[tab](r) &&
        (!q ||
          r.memberName.toLowerCase().includes(q) ||
          r.memberEmail.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q)),
    );
  }, [rows, tab, query]);

  return (
    <div className={indexCard}>
      <IndexTabs
        label="Check-in filter"
        tabs={TABS.map((t) => ({ ...t, count: rows.filter(TAB_TEST[t.key]).length }))}
        value={tab}
        onChange={setTab}
      />
      {tab === 'followup' && (
        <p className="border-b border-ink/10 bg-milk/40 px-4 py-2 text-[12px] text-ink/65">
          A score of 3 or below, or any comment. Each emailed the support inbox when it came in; follow up in the member&apos;s message thread.
        </p>
      )}
      <IndexToolbar query={query} onQuery={setQuery} placeholder="Search member, email or product" />

      <div className="md:overflow-x-auto">
        <table className={table}>
          <thead className={thead}>
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Member</th>
              <th className={th}>Product</th>
              <th className={th}>Kind</th>
              <th className={th}>Score</th>
              <th className={th}>Comment</th>
            </tr>
          </thead>
          <tbody className={tbody}>
            {visible.length === 0 ? (
              <tr className="block md:table-row">
                <td colSpan={6} className="block px-4 py-10 text-center text-[13px] text-ink/65 md:table-cell">
                  {rows.length === 0 ? 'No check-ins yet. The first go out 30 days after a delivery.' : 'No check-ins match.'}
                </td>
              </tr>
            ) : (
              visible.map((r) => (
                <tr
                  key={r.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-ink/10 px-4 py-3 first:border-t-0 md:table-row md:px-0 md:py-0"
                >
                  <td className={cn(td, 'order-4 whitespace-nowrap text-[12px] tabular-nums text-ink/65 md:text-[13px]')}>
                    {r.date}
                  </td>
                  <td className={cn(td, 'order-1 min-w-0 flex-1 basis-[62%]')}>
                    <span className="block truncate font-medium text-ink md:max-w-[200px]">{r.memberName}</span>
                    {r.memberEmail && <span className="block truncate text-[12px] text-ink/60 md:max-w-[200px]">{r.memberEmail}</span>}
                  </td>
                  <td className={cn(td, 'order-3 text-[12px] text-ink/70 md:text-[13px] md:text-ink/85')}>{r.productName}</td>
                  <td className={cn(td, 'order-3 text-[12px] text-ink/65 md:text-[13px]')}>
                    <span className="md:hidden">· </span>
                    {r.kind === 'first' ? 'First' : 'Refill'}
                    <span className="md:hidden"> ·</span>
                  </td>
                  <td className={cn(td, 'order-2 whitespace-nowrap')}>
                    {r.rating === null ? (
                      <StatusBadge tone="neutral">No answer</StatusBadge>
                    ) : (
                      <StatusBadge tone={isLow(r) ? 'critical' : r.rating === 5 ? 'success' : 'info'}>
                        {r.rating} / 5{isLow(r) ? ' · follow up' : ''}
                      </StatusBadge>
                    )}
                  </td>
                  <td className={cn(td, 'order-5 basis-full whitespace-pre-wrap text-[13px] text-ink/85 md:max-w-[40ch]')}>
                    {r.comment || <span className="hidden text-ink/55 md:inline">—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <IndexFooter shown={visible.length} total={rows.length} noun="check-ins" />
    </div>
  );
}
