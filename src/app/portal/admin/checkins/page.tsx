import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession, loginUrl } from '@/lib/auth-server';
import { listCheckinsForStaff } from '@/lib/checkins-db';
import { formatDate } from '@/lib/format';
import { ADMIN_NAV, StatusChip } from '@/components/portal/ui';

export const metadata: Metadata = { title: 'Check-ins' };

/**
 * Every 30-day check-in and its answer. Read-only: follow-ups happen in the
 * member's message thread. A score of 3 or less, or any comment, also emails
 * the support inbox the moment it comes in.
 */
export default async function AdminCheckinsPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const rows = await listCheckinsForStaff();
  const answered = rows.filter((r) => r.rating !== null);
  const low = answered.filter((r) => (r.rating ?? 5) <= 3).length;

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div>
        <p className="mb-2 text-[13px] font-medium text-ink/55">Check-ins</p>
        <h1 className="text-[36px] font-semibold leading-[1] tracking-[-0.045em] text-ink [text-wrap:balance] md:text-[48px]">
          How members are finding it.
        </h1>
        <p className="mt-3 max-w-[68ch] text-[16px] leading-relaxed text-ink-soft">
          Sent 30 days after a member&apos;s first delivery of a product and
          after their first refill. {answered.length} of {rows.length} answered
          {low > 0 ? `, ${low} at 3 or below` : ''}.
        </p>
      </div>

      <section className="rounded-shell bg-milk p-6 md:p-8">
        {rows.length === 0 ? (
          <p className="rounded-inner border border-ink/10 bg-white px-4 py-3 text-sm text-ink/55">
            No check-ins yet. The first go out 30 days after a delivery.
          </p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-milk">
                <tr className="border-b border-ink/10 text-left text-[12px] text-ink/60">
                  <th className="py-2 pr-4 font-normal">Date</th>
                  <th className="py-2 pr-4 font-normal">Member</th>
                  <th className="py-2 pr-4 font-normal">Product</th>
                  <th className="py-2 pr-4 font-normal">Kind</th>
                  <th className="py-2 pr-4 font-normal">Rating</th>
                  <th className="py-2 font-normal">Comment</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isLow = r.rating !== null && r.rating <= 3;
                  return (
                    <tr
                      key={r.id}
                      className={`border-t border-ink/10 align-top first:border-t-0 ${isLow ? 'bg-red-50/60' : ''}`}
                    >
                      <td className="whitespace-nowrap py-2.5 pr-4 text-[12px] tabular-nums text-ink/60">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="py-2.5 pr-4 text-ink/85">
                        {r.memberName}
                        {r.memberEmail && (
                          <span className="block text-[12px] text-ink/55">{r.memberEmail}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-ink/85">{r.productName}</td>
                      <td className="py-2.5 pr-4 text-ink/70">
                        {r.kind === 'first' ? 'First' : 'Refill'}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-4">
                        {r.rating === null ? (
                          <StatusChip tone="muted">No answer</StatusChip>
                        ) : (
                          <StatusChip tone={isLow ? 'error' : r.rating === 5 ? 'success' : 'neutral'}>
                            {r.rating} / 5{isLow ? ' · follow up' : ''}
                          </StatusChip>
                        )}
                      </td>
                      <td className="max-w-[40ch] whitespace-pre-wrap py-2.5 text-ink/85">
                        {r.comment || <span className="text-ink/40">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalShell>
  );
}
