import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Admin | Eternal Longevity',
};

const METRICS = [
  { label: 'Active members', value: '142', delta: '+23 this week', tone: 'pos' as const },
  { label: 'MRR', value: '$48,250', delta: '+$6.4k WoW', tone: 'pos' as const },
  { label: 'Pending review', value: '7', delta: '2 escalated', tone: 'warn' as const },
  { label: 'Open issues', value: '3', delta: '1 due today', tone: 'warn' as const },
];

const PIPELINE = [
  { label: 'Intake submitted', count: 7, share: 18 },
  { label: 'Physician review', count: 5, share: 13 },
  { label: 'ID verification', count: 4, share: 10 },
  { label: 'Compounding', count: 9, share: 23 },
  { label: 'Shipped (7d)', count: 14, share: 36 },
];

const ACTIVITY = [
  { time: '11:42', actor: 'Dr. Reyes', action: 'Signed Rx-1041 · Marcus T. · Recover' },
  { time: '11:30', actor: 'Pharmacy', action: 'Shipped Rx-1037 · NJ · Tracking 1ZX8…' },
  { time: '11:14', actor: 'System', action: 'New intake · Priya N. · TX · Recover (drafted)' },
  { time: '10:48', actor: 'Member', action: 'ID verified · Lena R. · NY' },
  { time: '10:21', actor: 'Care team', action: 'Replied to Sam P. · cycle 1 question' },
  { time: '09:55', actor: 'Dr. Chen', action: 'Signed Rx-1039 · Hadi K. · Longevity' },
];

const PHYSICIANS = [
  { name: 'Dr. M. Reyes', states: 'NJ, NY, MA', queue: 3, tat: '24 min' },
  { name: 'Dr. A. Chen', states: 'CA, WA, CO', queue: 2, tat: '31 min' },
  { name: 'Dr. P. Okafor', states: 'TX, FL, IL', queue: 2, tat: '40 min' },
];

const SHIPMENTS = [
  { id: 'SHP-2104', member: 'Marcus T.', state: 'NJ', carrier: 'FedEx', eta: 'Tomorrow' },
  { id: 'SHP-2103', member: 'Lena R.', state: 'NY', carrier: 'FedEx', eta: '2 days' },
  { id: 'SHP-2102', member: 'Hadi K.', state: 'FL', carrier: 'UPS', eta: 'In transit' },
  { id: 'SHP-2101', member: 'Sam P.', state: 'CA', carrier: 'FedEx', eta: 'Delivered' },
];

export default async function AdminPortalPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

  return (
    <PortalShell
      user={user}
      nav={[
        { label: 'Overview', href: '/portal/admin' },
        { label: 'Members', href: '/portal/admin/members' },
        { label: 'Queue', href: '/portal/admin/queue' },
        { label: 'Pharmacy', href: '/portal/admin/pharmacy' },
        { label: 'Settings', href: '/portal/admin/settings' },
      ]}
    >
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          OPERATIONS · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(1.85rem, 4vw, 2.75rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Good morning, {user.name.split(' ')[0]}.
        </h1>
      </div>

      {/* === METRICS === */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {METRICS.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-line bg-surface p-5"
          >
            <div className="mb-2 text-[10px] tracking-widest text-foreground/55">
              {m.label.toUpperCase()}
            </div>
            <div
              className="font-semibold tracking-tight text-foreground"
              style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', letterSpacing: '-0.02em', lineHeight: 1 }}
            >
              {m.value}
            </div>
            <div
              className={cn(
                'mt-2 text-xs',
                m.tone === 'pos' ? 'text-accent' : 'text-amber-300'
              )}
            >
              {m.delta}
            </div>
          </div>
        ))}
      </section>

      {/* === PIPELINE === */}
      <section className="rounded-3xl border border-line bg-surface p-6 md:p-7 mb-10">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="mb-1 text-[10px] tracking-widest text-foreground/55">
              PIPELINE · LAST 7 DAYS
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Members in motion
            </h2>
          </div>
          <span className="text-xs text-foreground/55">39 total</span>
        </div>
        <div className="space-y-3">
          {PIPELINE.map((p) => (
            <div key={p.label} className="grid grid-cols-[1fr_3fr_auto] gap-4 items-center">
              <span className="text-sm text-foreground/75 truncate">{p.label}</span>
              <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${p.share * 2.5}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {p.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* === ACTIVITY + PHYSICIANS === */}
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr] mb-10">
        <div className="rounded-3xl border border-line bg-surface p-6 md:p-7">
          <div className="mb-5">
            <div className="mb-1 text-[10px] tracking-widest text-foreground/55">
              RECENT ACTIVITY
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              What just happened
            </h2>
          </div>
          <ul className="divide-y divide-line">
            {ACTIVITY.map((a, i) => (
              <li
                key={i}
                className="flex items-start gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="text-xs tabular-nums text-foreground/45 w-12 flex-shrink-0 pt-0.5">
                  {a.time}
                </span>
                <span className="text-[10px] tracking-widest text-foreground/55 w-24 flex-shrink-0 pt-0.5">
                  {a.actor.toUpperCase()}
                </span>
                <span className="flex-1 text-sm text-foreground/85 leading-relaxed">
                  {a.action}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-6 md:p-7">
          <div className="mb-5">
            <div className="mb-1 text-[10px] tracking-widest text-foreground/55">
              PHYSICIAN NETWORK
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              On call
            </h2>
          </div>
          <ul className="space-y-3">
            {PHYSICIANS.map((p) => (
              <li
                key={p.name}
                className="rounded-2xl border border-line bg-background p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-foreground">
                    {p.name}
                  </span>
                  <span className="text-[10px] tracking-widest text-accent">
                    TAT {p.tat}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-foreground/55">
                  <span>{p.states}</span>
                  <span>{p.queue} in queue</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* === SHIPMENTS === */}
      <section className="rounded-3xl border border-line bg-surface p-6 md:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="mb-1 text-[10px] tracking-widest text-foreground/55">
              PHARMACY · OUTBOUND
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Recent shipments
            </h2>
          </div>
          <button
            type="button"
            className="text-xs tracking-wider text-accent hover:text-accent-soft"
          >
            EXPORT CSV →
          </button>
        </div>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] tracking-widest text-foreground/45">
                <th className="px-2 py-2 font-medium">SHIPMENT</th>
                <th className="px-2 py-2 font-medium">MEMBER</th>
                <th className="px-2 py-2 font-medium">STATE</th>
                <th className="px-2 py-2 font-medium">CARRIER</th>
                <th className="px-2 py-2 font-medium text-right">ETA</th>
              </tr>
            </thead>
            <tbody>
              {SHIPMENTS.map((s) => (
                <tr key={s.id} className="border-t border-line">
                  <td className="px-2 py-3 font-mono text-xs text-foreground/85">{s.id}</td>
                  <td className="px-2 py-3 text-foreground">{s.member}</td>
                  <td className="px-2 py-3 text-foreground/65">{s.state}</td>
                  <td className="px-2 py-3 text-foreground/65">{s.carrier}</td>
                  <td className="px-2 py-3 text-right text-foreground/85">{s.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PortalShell>
  );
}
