'use client';

import { Fragment, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { updatePrivacyRequestAction } from '@/lib/privacy-actions';
import { PRIVACY_REQUEST_TYPES } from '@/lib/marketing-consent';
import type { Database } from '@/lib/database.types';
import {
  AdminPageHeader,
  Chevron,
  IndexFooter,
  IndexTabs,
  IndexToolbar,
  StatusBadge,
  detailCell,
  detailRow,
  fieldInput,
  fieldLabel,
  fromControl,
  headerButton,
  indexCard,
  row,
  shortDate,
  table,
  tbody,
  td,
  th,
  thead,
  toolbarSelect,
  type BadgeTone,
} from '@/components/admin/IndexTable';

export type PrivacyRow = Omit<Database['public']['Tables']['privacy_requests']['Row'], 'updated_at'>;
type Tab = 'open' | 'overdue' | 'closed' | 'all';

const STATUS: Record<PrivacyRow['status'], [string, BadgeTone]> = {
  received: ['Received', 'attention'],
  in_progress: ['In progress', 'info'],
  extended: ['Extended', 'info'],
  appealed: ['Appealed', 'attention'],
  completed: ['Completed', 'success'],
  denied: ['Denied', 'neutral'],
};
const CLOSED: PrivacyRow['status'][] = ['completed', 'denied'];
const typeLabel = (t: string) => PRIVACY_REQUEST_TYPES.find((x) => x.value === t)?.label ?? t;
const due = (r: PrivacyRow) => r.extended_until ?? r.due_at;
const overdue = (r: PrivacyRow) => !CLOSED.includes(r.status) && Date.parse(due(r)) < Date.now();

/** Admin → Privacy requests: every request, its deadline, and a status control. */
export function AdminPrivacyRequests({ rows }: { rows: PrivacyRow[] }) {
  const [tab, setTab] = useState<Tab>('open');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const counts = {
    open: rows.filter((r) => !CLOSED.includes(r.status)).length,
    overdue: rows.filter(overdue).length,
    closed: rows.filter((r) => CLOSED.includes(r.status)).length,
    all: rows.length,
  };

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const inTab =
        tab === 'all' ? true : tab === 'overdue' ? overdue(r) : tab === 'closed' ? CLOSED.includes(r.status) : !CLOSED.includes(r.status);
      return inTab && (!needle || [r.ref, r.name, r.email].some((v) => v.toLowerCase().includes(needle)));
    });
  }, [rows, tab, q]);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Privacy requests"
        subtitle={`${counts.open} open · ${counts.overdue} overdue · respond within 45 days, one extension of up to 45 more`}
      />
      <div className={indexCard}>
        <IndexTabs<Tab>
          label="Request status"
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'open', label: 'Open', count: counts.open },
            { key: 'overdue', label: 'Overdue', count: counts.overdue },
            { key: 'closed', label: 'Closed', count: counts.closed },
            { key: 'all', label: 'All', count: counts.all },
          ]}
        />
        <IndexToolbar query={q} onQuery={setQ} placeholder="Search reference, name or email" />

        {shown.length === 0 ? (
          <p className="px-4 py-10 text-center text-[14px] text-ink/60">
            {rows.length === 0 ? 'No privacy requests yet.' : 'Nothing matches.'}
          </p>
        ) : (
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Reference</th>
                <th className={th}>Request</th>
                <th className={th}>Requester</th>
                <th className={th}>State</th>
                <th className={th}>Received</th>
                <th className={th}>Due</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {shown.map((r) => {
                const late = overdue(r);
                const [label, tone] = STATUS[r.status];
                const isOpen = open === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr className={row} onClick={(e) => !fromControl(e.target) && setOpen(isOpen ? null : r.id)}>
                      <td className={cn(td, 'font-semibold tabular-nums')}>
                        <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.id)} className="inline-flex items-center gap-1.5">
                          {r.ref}
                          <Chevron open={isOpen} />
                        </button>
                      </td>
                      <td className={td}>{typeLabel(r.request_type)}</td>
                      <td className={td}>
                        <div className="text-ink">{r.name}</div>
                        <div className="text-[13px] text-ink/60">{r.email}</div>
                      </td>
                      <td className={td}>{r.state ?? '—'}</td>
                      <td className={cn(td, 'tabular-nums')}>{shortDate(Date.parse(r.created_at))}</td>
                      <td className={cn(td, 'tabular-nums', late ? 'font-semibold text-red-700' : 'text-ink')}>
                        {shortDate(Date.parse(due(r)))}
                        {late && <span className="ml-1 text-[13px]">overdue</span>}
                      </td>
                      <td className={td}>
                        <StatusBadge tone={late ? 'critical' : tone}>{label}</StatusBadge>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className={detailRow}>
                        <td colSpan={7} className={detailCell}>
                          <Detail r={r} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
        <IndexFooter shown={shown.length} total={rows.length} noun="requests" />
      </div>
    </div>
  );
}

function Detail({ r }: { r: PrivacyRow }) {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const closed = CLOSED.includes(r.status);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updatePrivacyRequestAction({ id: r.id, status, reason });
      if (!res.ok) return setMsg(res.error ?? 'Could not save.');
      setStatus('');
      setReason('');
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <dl className="space-y-2 text-[14px]">
        {r.is_agent && (
          <div>
            <dt className="text-ink/60">Authorized agent</dt>
            <dd className="text-ink">{r.agent_name}</dd>
          </div>
        )}
        {r.appeal_of && (
          <div>
            <dt className="text-ink/60">Appeal of</dt>
            <dd className="text-ink">{r.appeal_of}</dd>
          </div>
        )}
        {r.extended_until && (
          <div>
            <dt className="text-ink/60">Extended (was due {shortDate(Date.parse(r.due_at))})</dt>
            <dd className="text-ink">{r.extension_reason}</dd>
          </div>
        )}
        <div>
          <dt className="text-ink/60">Details</dt>
          <dd className="whitespace-pre-wrap text-ink [overflow-wrap:anywhere]">{r.details || '—'}</dd>
        </div>
        {r.request_type === 'ad_opt_out' && <p className="text-[13px] text-ink/65">Advertising opt-out: no identity verification may be required.</p>}
      </dl>

      <div className="space-y-3">
        <div>
          <label htmlFor={`st-${r.id}`} className={fieldLabel}>
            Change status
          </label>
          <select id={`st-${r.id}`} value={status} onChange={(e) => setStatus(e.target.value)} className={cn(toolbarSelect, 'w-full sm:w-full')}>
            <option value="" disabled>
              Choose…
            </option>
            <option value="in_progress">In progress</option>
            {!r.extended_until && !closed && <option value="extended">Extend 45 days (emails the requester)</option>}
            <option value="completed">Completed</option>
            <option value="denied">Denied (emails the requester with how to appeal)</option>
          </select>
        </div>
        {(status === 'extended' || status === 'denied') && (
          <div>
            <label htmlFor={`why-${r.id}`} className={fieldLabel}>
              {status === 'extended' ? 'Why (sent to the requester)' : 'Why, optional (sent to the requester)'}
            </label>
            <input id={`why-${r.id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} className={fieldInput} />
          </div>
        )}
        {msg && <p role="alert" className="text-[13px] text-red-700">{msg}</p>}
        <button type="button" disabled={!status || pending} onClick={save} className={cn(headerButton, 'disabled:opacity-50')}>
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
