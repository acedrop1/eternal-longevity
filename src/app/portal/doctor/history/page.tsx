import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { DOCTOR_NAV } from '@/components/portal/ui';
import { getSession, loginUrl } from '@/lib/auth-server';
import { listOrders } from '@/lib/orders-db';
import { cn } from '@/lib/utils';
import { orderRef } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Signed Rx',
};

interface SignedRx {
  id: string;
  patient: string;
  state: string;
  protocol: string;
  signedAt: string;
  cycle: string;
  status: 'active' | 'completed' | 'declined';
}


const STATUS_THEME: Record<SignedRx['status'], { label: string; class: string }> = {
  active: { label: 'Active', class: 'bg-emerald-50 text-emerald-800 border-emerald-600/20' },
  completed: { label: 'Completed', class: 'bg-ink/5 text-ink/65 border-ink/10' },
  declined: { label: 'Declined', class: 'bg-red-50 text-red-700 border-red-600/25' },
};

/** Orders this physician has acted on, newest first. */
async function loadSignedRx(): Promise<SignedRx[]> {
  const orders = await listOrders();
  const acted = orders.filter((o) =>
    ['signed', 'compounding', 'shipped', 'delivered', 'declined-clinical'].includes(
      o.status,
    ),
  );
  return acted.map((o) => ({
    id: o.id,
    patient: o.memberName || o.memberEmail,
    state: o.state,
    protocol: o.lines.map((l) => l.productName).join(' + ') || '—',
    // When he signed (or declined), from the timeline; paidAt is when the money landed.
    signedAt: new Date(
      o.updates?.find((u) => u.statusChange === 'signed' || u.statusChange === 'declined-clinical')?.at ?? o.placedAt,
    ).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    cycle: o.lines[0]?.cadenceLabel ?? '—',
    status:
      o.status === 'declined-clinical'
        ? 'declined'
        : o.status === 'delivered'
          ? 'completed'
          : 'active',
  }));
}

export default async function DoctorHistoryPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'doctor') redirect(user.redirectTo);

  const signed = await loadSignedRx();

  return (
    <PortalShell
      user={user}
      nav={DOCTOR_NAV}
    >
      <div>
        <p className="mb-2 text-[13px] font-medium text-ink/65">
          My signed Rx · {signed.length} total
        </p>
        <h1
          className="text-[36px] font-semibold leading-[1] tracking-[-0.045em] text-ink [text-wrap:balance] md:text-[48px]"
        >
          Your prescription log.
        </h1>
        <p className="mt-3 max-w-[68ch] text-[16px] leading-relaxed text-ink-soft">
          Every prescription you&apos;ve signed or declined, newest first.
        </p>
      </div>

      {signed.length === 0 ? (
        <div className="rounded-shell bg-milk p-8 text-center">
          <h2 className="mb-1 text-[17px] font-semibold tracking-[-0.02em] text-ink">
            Nothing signed yet
          </h2>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-ink/65">
            Prescriptions you approve or decline are logged here permanently.
          </p>
        </div>
      ) : (
      <div className="rounded-shell bg-milk overflow-hidden">
        <div className="max-h-[75vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-milk">
              <tr className="border-b border-ink/10 text-left text-[12px] text-ink/60">
                <th className="px-4 md:px-6 py-3 font-normal">Rx ID</th>
                <th className="px-4 md:px-6 py-3 font-normal">Patient</th>
                <th className="px-4 md:px-6 py-3 font-normal">Protocol</th>
                <th className="px-4 md:px-6 py-3 font-normal hidden sm:table-cell">Cycle</th>
                <th className="px-4 md:px-6 py-3 font-normal hidden sm:table-cell">Signed</th>
                <th className="px-4 md:px-6 py-3 font-normal text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {signed.map((r) => {
                const theme = STATUS_THEME[r.status];
                return (
                  <tr
                    key={r.id}
                    className="border-t border-ink/10 first:border-t-0 hover:bg-white/40 transition-colors"
                  >
                    <td className="px-4 md:px-6 py-4 text-[12px] text-ink/85">
                      {orderRef(r.id)}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="text-ink">{r.patient}</div>
                      <div className="text-xs text-ink/65">{r.state}</div>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-ink/85">
                      {r.protocol}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-ink/65 hidden sm:table-cell">
                      {r.cycle}
                    </td>
                    <td className="whitespace-nowrap px-4 md:px-6 py-4 text-[12px] tabular-nums text-ink/65 hidden sm:table-cell">
                      {r.signedAt}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]',
                          theme.class
                        )}
                      >
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                        {theme.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <p className="mt-6 text-center">
        <Link
          href="/portal/doctor"
          className="text-[12px] text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
        >
          ← Back to queue
        </Link>
      </p>
    </PortalShell>
  );
}
