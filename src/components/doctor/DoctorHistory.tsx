'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { orderRef } from '@/lib/format';
import {
  IndexFooter,
  IndexTabs,
  IndexToolbar,
  StatusBadge,
  fromControl,
  indexCard,
  row as rowClass,
  table,
  tbody,
  td,
  th,
  thead,
  type BadgeTone,
} from '@/components/admin/IndexTable';

/** One prescription he signed or declined. */
export interface SignedRx {
  id: string;
  patient: string;
  state: string;
  protocol: string;
  signedAt: string;
  cycle: string;
  status: 'active' | 'completed' | 'declined';
  /** Approved: the order page. Declined: the case, with his reason. */
  href: string;
}

const STATUS: Record<SignedRx['status'], [string, BadgeTone]> = {
  active: ['Active', 'success'],
  completed: ['Completed', 'neutral'],
  declined: ['Declined', 'critical'],
};

type Tab = 'approved' | 'declined' | 'all';

export function DoctorHistory({ rows }: { rows: SignedRx[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('approved');
  const [query, setQuery] = useState('');
  const approved = rows.filter((r) => r.status !== 'declined');
  const declined = rows.filter((r) => r.status === 'declined');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inTab = tab === 'approved' ? approved : tab === 'declined' ? declined : rows;
    return inTab.filter((r) => !q || [r.id, orderRef(r.id), r.patient, r.protocol, r.state].join(' ').toLowerCase().includes(q));
  }, [rows, approved, declined, tab, query]);

  return (
    <div className={cn(indexCard, 'max-md:[&_[role=tab]]:min-h-[44px] max-md:[&_[role=tab]]:text-[15px] max-md:[&_input]:h-11')}>
      <IndexTabs
        label="Prescriptions"
        tabs={[
          { key: 'approved', label: 'Approved', count: approved.length },
          { key: 'declined', label: 'Declined', count: declined.length },
          { key: 'all', label: 'All', count: rows.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      <IndexToolbar query={query} onQuery={setQuery} placeholder="Search patients, products, order numbers" />
      <div className="md:overflow-x-auto">
        <table className={table}>
          <thead className={thead}>
            <tr>
              <th className={th}>Order</th>
              <th className={th}>Patient</th>
              <th className={th}>Protocol</th>
              <th className={th}>Cycle</th>
              <th className={th}>Signed</th>
              <th className={cn(th, 'text-right')}>Status</th>
            </tr>
          </thead>
          <tbody className={tbody}>
            {visible.length === 0 ? (
              <tr className="block md:table-row">
                <td colSpan={6} className="block px-4 py-10 text-center text-[15px] text-ink/65 md:table-cell md:text-[13px]">
                  {rows.length === 0
                    ? 'Nothing signed yet. Prescriptions you approve or decline are logged here permanently.'
                    : 'No prescriptions match.'}
                </td>
              </tr>
            ) : (
              visible.map((r) => {
                const [label, tone] = STATUS[r.status];
                return (
                  <tr
                    key={r.id}
                    className={cn(rowClass, 'gap-y-1 py-3.5 pr-4 text-[15px] md:text-[13px]')}
                    onClick={(e) => {
                      if (!fromControl(e.target)) router.push(r.href);
                    }}
                  >
                    <td className={cn(td, 'order-2 w-full whitespace-nowrap text-[15px] text-ink/60 md:w-auto md:text-[13px] md:font-medium md:text-ink')}>
                      <Link href={r.href} className="underline decoration-transparent underline-offset-[3px] hover:decoration-ink/40">
                        {orderRef(r.id)}
                      </Link>
                    </td>
                    <td className={cn(td, 'order-1 min-w-0 flex-1')}>
                      <div className="truncate text-[16px] font-semibold text-ink md:text-[13px] md:font-normal">{r.patient}</div>
                      <div className="hidden text-[12px] text-ink/65 md:block">{r.state}</div>
                    </td>
                    <td className={cn(td, 'order-3 w-full text-ink/85 md:w-auto')}>
                      {r.protocol}
                      <span className="text-ink/60 md:hidden">
                        {' '}
                        · {r.cycle} · {r.state}
                      </span>
                    </td>
                    <td className={cn(td, 'hidden text-ink/65 md:table-cell')}>{r.cycle}</td>
                    <td className={cn(td, 'order-4 w-full whitespace-nowrap tabular-nums text-ink/60 md:w-auto md:text-[12px]')}>
                      <span className="md:hidden">{r.status === 'declined' ? 'Declined ' : 'Signed '}</span>
                      {r.signedAt}
                    </td>
                    <td className={cn(td, 'order-1 flex-none md:text-right')}>
                      <StatusBadge tone={tone}>{label}</StatusBadge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <IndexFooter shown={visible.length} total={rows.length} noun="prescriptions" />
    </div>
  );
}
