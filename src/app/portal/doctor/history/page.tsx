import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
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
  active: { label: 'Active', class: 'bg-accent/10 text-accent border-accent/40' },
  completed: { label: 'Completed', class: 'bg-foreground/5 text-foreground/65 border-line' },
  declined: { label: 'Declined', class: 'bg-red-500/10 text-red-300 border-red-500/40' },
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
    signedAt: new Date(o.paidAt ?? o.placedAt).toLocaleString('en-US', {
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
  if (!user) redirect('/login');
  if (user.role !== 'doctor') redirect(user.redirectTo);

  const signed = await loadSignedRx();

  return (
    <PortalShell
      user={user}
      nav={[
        { label: 'Queue', href: '/portal/doctor' },
        { label: 'Messages', href: '/portal/doctor/messages' },
        { label: 'My signed Rx', href: '/portal/doctor/history' },
        { label: 'Profile', href: '/portal/doctor/profile' },
      ]}
    >
      <div>
        <p className="mb-2 font-mono text-[12px] text-foreground/55">
          My signed Rx · {signed.length} total
        </p>
        <h1
          className="font-display font-normal text-foreground"
          style={{
            fontSize: 'clamp(1.8rem, 1.5vw + 1rem, 2.6rem)',
            fontStretch: '75%',
            lineHeight: 1.05,
          }}
        >
          Your prescription log.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Every prescription you&apos;ve signed or declined, newest first.
        </p>
      </div>

      {signed.length === 0 ? (
        <div className="rounded-[4px] border border-line bg-surface p-8 text-center">
          <h2 className="mb-1 text-sm font-semibold tracking-tight text-foreground">
            Nothing signed yet
          </h2>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-foreground/55">
            Prescriptions you approve or decline are logged here permanently.
          </p>
        </div>
      ) : (
      <div className="rounded-[4px] border border-line bg-surface overflow-hidden">
        <div className="max-h-[75vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-line text-left font-mono text-[12px] text-foreground/60">
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
                    className="border-t border-line first:border-t-0 hover:bg-background/40 transition-colors"
                  >
                    <td className="px-4 md:px-6 py-4 font-mono text-[12px] text-foreground/85">
                      {orderRef(r.id)}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="text-foreground">{r.patient}</div>
                      <div className="text-xs text-foreground/55">{r.state}</div>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-foreground/85">
                      {r.protocol}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-foreground/65 hidden sm:table-cell">
                      {r.cycle}
                    </td>
                    <td className="whitespace-nowrap px-4 md:px-6 py-4 font-mono text-[12px] tabular-nums text-foreground/65 hidden sm:table-cell">
                      {r.signedAt}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-[2px] border px-2.5 py-1 font-mono text-[12px]',
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
          className="font-mono text-[12px] text-accent hover:text-accent-soft"
        >
          ← Back to queue
        </Link>
      </p>
    </PortalShell>
  );
}
