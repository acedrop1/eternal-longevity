import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import { listOrders } from '@/lib/orders-db';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Signed Rx | Eternal Longevity',
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
  active: { label: 'ACTIVE', class: 'bg-accent/10 text-accent border-accent/40' },
  completed: { label: 'COMPLETED', class: 'bg-foreground/5 text-foreground/65 border-line' },
  declined: { label: 'DECLINED', class: 'bg-red-500/10 text-red-300 border-red-500/40' },
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

  const RX_LOG = await loadSignedRx();

  return (
    <PortalShell
      user={user}
      nav={[
        { label: 'Queue', href: '/portal/doctor' },
        { label: 'My signed Rx', href: '/portal/doctor/history' },
        { label: 'Profile', href: '/portal/doctor/profile' },
      ]}
    >
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-sky-300">
          MY SIGNED RX · {RX_LOG.length} TOTAL
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', letterSpacing: '-0.02em', lineHeight: 1.05 }}
        >
          Your prescription log.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Every prescription you&apos;ve signed or declined. Tap a row to see
          the underlying intake, labs, and clinical team notes.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {['All', 'Active', 'Completed', 'Declined', 'This week'].map((f, i) => (
          <button
            key={f}
            type="button"
            className={cn(
              'rounded-full px-4 py-2 text-xs tracking-wider font-medium border transition-all',
              i === 0
                ? 'border-foreground/30 bg-foreground/10 text-foreground'
                : 'border-line bg-surface text-foreground/65 hover:border-foreground/30'
            )}
          >
            {f}
          </button>
        ))}
        <button
          type="button"
          className="ml-auto rounded-full border border-line bg-surface px-4 py-2 text-xs tracking-wider text-foreground/65 hover:text-foreground hover:border-foreground/30"
        >
          EXPORT CSV →
        </button>
      </div>

      <div className="rounded-3xl border border-line bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] tracking-widest text-foreground/45">
                <th className="px-4 md:px-6 py-3 font-medium">RX ID</th>
                <th className="px-4 md:px-6 py-3 font-medium">PATIENT</th>
                <th className="px-4 md:px-6 py-3 font-medium">PROTOCOL</th>
                <th className="px-4 md:px-6 py-3 font-medium hidden sm:table-cell">CYCLE</th>
                <th className="px-4 md:px-6 py-3 font-medium hidden sm:table-cell">SIGNED</th>
                <th className="px-4 md:px-6 py-3 font-medium text-right">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {RX_LOG.map((r) => {
                const theme = STATUS_THEME[r.status];
                return (
                  <tr
                    key={r.id}
                    className="border-t border-line hover:bg-background/40 transition-colors"
                  >
                    <td className="px-4 md:px-6 py-4 font-mono text-xs text-foreground/85">
                      {r.id.toUpperCase()}
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
                    <td className="px-4 md:px-6 py-4 text-foreground/65 hidden sm:table-cell">
                      {r.signedAt}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] tracking-widest font-semibold',
                          theme.class
                        )}
                      >
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

      <p className="mt-6 text-center">
        <Link
          href="/portal/doctor"
          className="text-[11px] tracking-widest text-accent hover:text-accent-soft"
        >
          ← BACK TO QUEUE
        </Link>
      </p>
    </PortalShell>
  );
}
