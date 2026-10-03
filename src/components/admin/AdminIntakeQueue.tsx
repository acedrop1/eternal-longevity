'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  declineIntake,
  requestIntakeInfo,
  type ClinicalResult,
} from '@/lib/clinical-actions';
import { cn } from '@/lib/utils';
import { SERVICE_AREA } from '@/lib/site';
import {
  categoryFlagCount,
  type CategorySection,
  type ThreadStatus,
} from '@/lib/prescriber-view';
import { CategoryAnswers, ReviewChip, ThreadChip } from '@/components/doctor/CategoryAnswers';
import {
  IndexFooter,
  IndexTabs,
  IndexToolbar,
  SectionCard,
  StatusBadge,
  fromControl,
  indexCard,
  row as rowClass,
  secondaryButton,
  table,
  tbody,
  td,
  th,
  thead,
  toolbarSelect,
  type BadgeTone,
} from '@/components/admin/IndexTable';
import { DetailHeader, InfoRow, detailGrid } from '@/components/admin/DetailHeader';

export interface IntakeRowView {
  id: string;
  userId: string | null;
  caseId: string;
  email: string;
  /** First and last name from the intake; '' when they skipped it. */
  name: string;
  /** Two-letter state from the intake; '' when missing. */
  state: string;
  status: string;
  /** Product they came in from, or null for the generic Apply Now route. */
  source: string | null;
  submittedAt: string;
  createdAt: string;
  answers: { label: string; value: string }[];
  /** Category questions as labels, with signed photo/lab URLs (record page only). */
  categories: CategorySection[];
  /** Their thread with the prescriber: waiting on them, or they replied. */
  thread?: ThreadStatus;
}

/*
 * Closing a visit at this desk is an administrative act. A free-text box
 * invites "history of cancer" — a clinical judgement nobody here is licensed
 * to make. These are the only reasons an admin can close on.
 */
const CLOSE_REASONS = [
  `Outside our service area — we serve ${SERVICE_AREA} only.`,
  'Under 18 — we cannot treat anyone under 18.',
  'Duplicate of an existing visit.',
  'Test, spam, or an incomplete submission.',
  'The member asked us to close this visit.',
];

const STATUS: Record<string, [string, BadgeTone]> = {
  submitted: ['Submitted', 'attention'],
  in_review: ['In review', 'info'],
  needs_info: ['Needs info', 'attention'],
  approved: ['Approved', 'success'],
  declined: ['Declined', 'neutral'],
};

/** Request info / close apply only while the application is open. */
const OPEN = new Set(['submitted', 'in_review', 'needs_info']);

function IntakeStatusBadge({ status }: { status: string }) {
  const [label, tone] = STATUS[status] ?? [status.replace('_', ' '), 'neutral'];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

type Tab = 'all' | 'submitted' | 'needs_info' | 'approved' | 'declined';

const TAB_TEST: Record<Tab, (r: IntakeRowView) => boolean> = {
  all: () => true,
  submitted: (r) => r.status === 'submitted' || r.status === 'in_review',
  needs_info: (r) => r.status === 'needs_info',
  approved: (r) => r.status === 'approved',
  declined: (r) => r.status === 'declined',
};

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'needs_info', label: 'Needs info' },
  { key: 'approved', label: 'Approved' },
  { key: 'declined', label: 'Declined' },
];

const href = (id: string) => `/portal/admin/queue/${id}`;

export function AdminIntakeQueue({ intakes }: { intakes: IntakeRowView[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [source, setSource] = useState<'any' | 'product' | 'apply'>('any');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return intakes.filter((r) => {
      if (!TAB_TEST[tab](r)) return false;
      if (source === 'product' && !r.source) return false;
      if (source === 'apply' && r.source) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.caseId.toLowerCase().includes(q)
      );
    });
  }, [intakes, tab, source, query]);

  if (intakes.length === 0) {
    return (
      <div className={cn(indexCard, 'px-6 py-10 text-center')}>
        <h2 className="mb-1 text-[15px] font-semibold text-ink">No applications yet</h2>
        <p className="mx-auto max-w-md text-[13px] leading-relaxed text-ink/65">
          Members who finish the intake appear here. Nothing here needs you
          before an order: the prescriber reviews each order under Orders.
        </p>
      </div>
    );
  }

  return (
    <div className={indexCard}>
      <IndexTabs
        label="Application status"
        tabs={TABS.map((t) => ({ ...t, count: intakes.filter(TAB_TEST[t.key]).length }))}
        value={tab}
        onChange={setTab}
      />
      <IndexToolbar query={query} onQuery={setQuery} placeholder="Search name, email or case">
        <select
          aria-label="Source"
          value={source}
          onChange={(e) => setSource(e.target.value as typeof source)}
          className={toolbarSelect}
        >
          <option value="any">Any source</option>
          <option value="product">From a product</option>
          <option value="apply">Apply Now</option>
        </select>
      </IndexToolbar>

      <div className="md:overflow-x-auto">
        <table className={table}>
          <thead className={thead}>
            <tr>
              <th className={th}>Patient</th>
              <th className={th}>Product</th>
              <th className={th}>State</th>
              <th className={th}>Submitted</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody className={tbody}>
            {visible.length === 0 ? (
              <tr className="block md:table-row">
                <td colSpan={5} className="block px-4 py-10 text-center text-[13px] text-ink/65 md:table-cell">
                  No applications match.
                </td>
              </tr>
            ) : (
              visible.map((r) => {
                const flags = categoryFlagCount(r.categories);
                return (
                  <tr
                    key={r.id}
                    className={cn(rowClass, 'pr-4')}
                    onClick={(e) => {
                      if (!fromControl(e.target)) router.push(href(r.id));
                    }}
                  >
                    <td className={cn(td, 'order-1 min-w-0 flex-1 basis-[60%] md:w-[34%]')}>
                      <Link href={href(r.id)} className="block truncate font-medium text-ink hover:underline md:max-w-[280px]">
                        {r.name || r.email}
                      </Link>
                      <div className="truncate text-[12px] text-ink/60 md:max-w-[280px]">
                        {r.name ? r.email : r.caseId.toUpperCase()}
                      </div>
                    </td>
                    <td className={cn(td, 'order-3 min-w-0 text-[12px] text-ink/70 md:text-[13px] md:text-ink/85')}>
                      <span className="block truncate md:max-w-[220px]">
                        {r.source ?? <span className="text-ink/55">Apply Now</span>}
                      </span>
                    </td>
                    <td className={cn(td, 'order-4 text-[12px] text-ink/65 md:text-[13px] md:text-ink/80')}>
                      <span className="md:hidden">· </span>
                      {r.state || '—'}
                    </td>
                    <td className={cn(td, 'order-5 whitespace-nowrap text-[12px] tabular-nums text-ink/65 md:text-[13px]')}>
                      <span className="md:hidden">· </span>
                      {r.submittedAt}
                    </td>
                    <td className={cn(td, 'order-2 ml-auto md:ml-0')}>
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <IntakeStatusBadge status={r.status} />
                        {flags > 0 && (
                          <span className="hidden md:inline-flex">
                            <StatusBadge tone="attention">{flags} to review</StatusBadge>
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <IndexFooter shown={visible.length} total={intakes.length} noun="applications" />
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** The application record: everything the review needs, and the two admin actions. */
export function IntakeReview({ intake, sample = false }: { intake: IntakeRowView; /** Dev-only fixture row. */ sample?: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState(intake.status);
  const [open, setOpen] = useState<null | 'info' | 'decline'>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ClinicalResult | null>(null);
  const catFlags = categoryFlagCount(intake.categories);
  const actionable = OPEN.has(status);

  async function run(kind: 'info' | 'decline') {
    setBusy(true);
    setResult(null);
    try {
      const res =
        kind === 'decline'
          ? await declineIntake({ intakeId: intake.id, note })
          : await requestIntakeInfo({ intakeId: intake.id, note });
      setResult(res);
      if (res.ok) {
        setStatus(kind === 'decline' ? 'declined' : 'needs_info');
        setOpen(null);
        setNote('');
        router.refresh();
      }
    } catch {
      setResult({ ok: false, message: 'Request failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <DetailHeader
        backHref="/portal/admin/queue"
        backLabel="Applications"
        title={intake.name || intake.email}
        badges={
          <>
            <IntakeStatusBadge status={status} />
            {catFlags > 0 && (
              <ReviewChip>
                {catFlags} {catFlags === 1 ? 'answer' : 'answers'} to review
              </ReviewChip>
            )}
            <ThreadChip status={intake.thread} />
          </>
        }
        meta={`${intake.caseId.toUpperCase()} · Submitted ${intake.submittedAt}`}
        actions={
          actionable && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setOpen('info');
                  setNote('');
                }}
                className={secondaryButton}
              >
                Request info
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setOpen('decline');
                  setNote('');
                }}
                className="inline-flex min-h-[40px] items-center justify-center whitespace-nowrap rounded-full bg-white px-4 text-[13px] font-semibold text-red-700 ring-1 ring-red-600/25 transition-colors hover:bg-red-50 md:min-h-[34px]"
              >
                Close &mdash; not eligible
              </button>
            </>
          )
        }
      />

      {sample && (
        <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
          Sample data (dev only). Request info and close need Supabase.
        </p>
      )}

      {result && (
        <p
          role={result.ok ? 'status' : 'alert'}
          className={cn(
            'rounded-inner border px-4 py-2.5 text-[13px]',
            result.ok ? 'border-emerald-600/20 bg-emerald-50 text-emerald-900' : 'border-red-600/20 bg-red-50 text-red-800',
          )}
        >
          {result.message}
        </p>
      )}

      <div className={detailGrid}>
        <div className="min-w-0 space-y-4">
          {open && (
            <SectionCard
              title={open === 'decline' ? 'Why are they not eligible?' : 'What does the patient need to provide?'}
              className={open === 'decline' ? 'border-red-600/25' : undefined}
            >
              {open === 'decline' ? (
                <>
                  <div className="space-y-2">
                    {CLOSE_REASONS.map((r) => (
                      <label
                        key={r}
                        className="flex cursor-pointer items-start gap-3 rounded-inner border border-ink/10 bg-white px-3.5 py-2.5 text-[13px] text-ink/85 transition-colors hover:border-ink/25"
                      >
                        <input
                          type="radio"
                          name={`close-${intake.id}`}
                          checked={note === r}
                          onChange={() => setNote(r)}
                          className="mt-0.5 h-3.5 w-3.5 flex-none accent-ink"
                        />
                        <span>{r}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-[12px] leading-relaxed text-ink/60">
                    Not a clinical decision. If the reason is medical, send it to the
                    prescriber instead — only he can decline on clinical grounds.
                  </p>
                </>
              ) : (
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  aria-label="Note to the patient"
                  placeholder="The patient will see this note…"
                  className="w-full resize-none rounded-inner bg-white px-3.5 py-2.5 text-[16px] text-ink ring-1 ring-ink/15 placeholder:text-ink/55 focus:outline-none focus:ring-2 focus:ring-ink/30 md:text-[13px]"
                />
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy || !note.trim()}
                  onClick={() => run(open)}
                  className={cn(
                    'inline-flex min-h-[40px] items-center rounded-full px-4 text-[13px] font-semibold text-white transition-colors disabled:opacity-40 md:min-h-[34px]',
                    open === 'decline' ? 'bg-red-700 hover:bg-red-800' : 'bg-ink hover:bg-ink/85',
                  )}
                >
                  {busy ? 'Working…' : open === 'decline' ? 'Close this visit' : 'Send request'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(null);
                    setNote('');
                  }}
                  className={secondaryButton}
                >
                  Cancel
                </button>
              </div>
            </SectionCard>
          )}

          <SectionCard title="Category answers">
            {intake.categories.length > 0 ? (
              <CategoryAnswers sections={intake.categories} />
            ) : (
              <p className="text-[13px] text-ink/60">No category questions in this intake.</p>
            )}
          </SectionCard>

          <SectionCard title="Intake answers" flush>
            {intake.answers.length === 0 ? (
              <p className="px-4 py-3.5 text-[13px] text-ink/60">No other answers.</p>
            ) : (
              <dl className="divide-y divide-ink/10">
                {intake.answers.map((a, i) => (
                  <div key={i} className="grid gap-1 px-4 py-2.5 text-[13px] sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-4">
                    <dt className="break-words text-ink/60">{a.label}</dt>
                    <dd className="break-words text-ink/90 sm:text-right">{a.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </SectionCard>
        </div>

        <aside className="min-w-0 space-y-4">
          <SectionCard title="Applicant">
            <dl className="-my-1.5">
              <InfoRow label="Email">{intake.email}</InfoRow>
              <InfoRow label="State">{intake.state || '—'}</InfoRow>
              <InfoRow label="Case">{intake.caseId.toUpperCase()}</InfoRow>
              <InfoRow label="Submitted">{intake.submittedAt}</InfoRow>
            </dl>
            {intake.userId && (
              <Link
                href={`/portal/admin/members/${intake.userId}`}
                className="mt-3 inline-block text-[13px] font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
              >
                Open member record
              </Link>
            )}
          </SectionCard>

          {/* Whether they picked a product first or came through Apply Now
              changes what the prescriber is being asked to decide. */}
          <SectionCard title="Product">
            <p className="text-[13px] text-ink/85">
              {intake.source ? (
                <>
                  Started from <span className="font-medium text-ink">{intake.source}</span>
                </>
              ) : (
                <>No product selected &mdash; came through Apply Now</>
              )}
            </p>
          </SectionCard>

          <SectionCard title="Next step">
            <p className="text-[13px] leading-relaxed text-ink/65">
              Nothing to action here. They can already shop, and the prescriber
              reviews each order under Orders. Request info or close the
              application only if something in it is wrong.
            </p>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
