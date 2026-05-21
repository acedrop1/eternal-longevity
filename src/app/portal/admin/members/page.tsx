import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Members | Eternal Longevity',
};

const ADMIN_NAV = [
  { label: 'Overview', href: '/portal/admin' },
  { label: 'Members', href: '/portal/admin/members' },
  { label: 'Queue', href: '/portal/admin/queue' },
  { label: 'Billing', href: '/portal/admin/billing' },
  { label: 'Orders', href: '/portal/admin/fulfillment' },
  { label: 'Pharmacy', href: '/portal/admin/pharmacy' },
  { label: 'Settings', href: '/portal/admin/settings' },
];

interface Member {
  id: string;
  name: string;
  email: string;
  state: string;
  joined: string;
  protocol: string;
  mrr: number;
  status: 'active' | 'paused' | 'churned' | 'review';
}

const MEMBERS: Member[] = [
  { id: 'm-1041', name: 'Marcus Thompson', email: 'marcus.t@protonmail.com', state: 'NJ', joined: 'May 9, 2026', protocol: 'Recover', mrr: 160, status: 'review' },
  { id: 'm-1024', name: 'Lena Rodriguez', email: 'lena.r@gmail.com', state: 'NY', joined: 'Apr 23, 2026', protocol: 'Sculpt', mrr: 360, status: 'active' },
  { id: 'm-1018', name: 'Sam Park', email: 'sam.park@icloud.com', state: 'CA', joined: 'Apr 17, 2026', protocol: 'Perform', mrr: 240, status: 'active' },
  { id: 'm-1009', name: 'Hadi Khoury', email: 'hadi.k@gmail.com', state: 'FL', joined: 'Apr 10, 2026', protocol: 'Longevity Foundation', mrr: 320, status: 'paused' },
  { id: 'm-0987', name: 'Priya Narayan', email: 'priya.n@gmail.com', state: 'TX', joined: 'Mar 30, 2026', protocol: 'Recover', mrr: 140, status: 'active' },
  { id: 'm-0962', name: 'Daniel Greer', email: 'dgreer@gmail.com', state: 'IL', joined: 'Mar 12, 2026', protocol: 'Perform', mrr: 0, status: 'churned' },
];

const STATUS_THEME: Record<Member['status'], { label: string; class: string }> = {
  active: { label: 'ACTIVE', class: 'bg-accent/10 text-accent border-accent/40' },
  paused: { label: 'PAUSED', class: 'bg-amber-500/10 text-amber-300 border-amber-400/40' },
  churned: { label: 'CHURNED', class: 'bg-foreground/5 text-foreground/55 border-line' },
  review: { label: 'AWAITING REVIEW', class: 'bg-sky-500/10 text-sky-300 border-sky-400/40' },
};

export default async function AdminMembersPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

  const activeCount = MEMBERS.filter((m) => m.status === 'active').length;
  const totalMRR = MEMBERS.filter((m) => m.status !== 'churned').reduce((acc, m) => acc + m.mrr, 0);

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          MEMBERS · {MEMBERS.length} TOTAL · {activeCount} ACTIVE · ${totalMRR.toLocaleString()} MRR
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', letterSpacing: '-0.02em', lineHeight: 1.05 }}
        >
          Member directory.
        </h1>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="search"
            placeholder="Search by name, email, or member ID…"
            className="w-full rounded-full border border-line bg-surface px-5 py-2.5 pl-11 text-sm text-foreground placeholder-foreground/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/45"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {['All', 'Active', 'Paused', 'Churned', 'Review'].map((f, i) => (
            <button
              key={f}
              type="button"
              className={cn(
                'flex-shrink-0 rounded-full px-3 py-2 text-xs tracking-wider font-medium border transition-all',
                i === 0
                  ? 'border-foreground/30 bg-foreground/10 text-foreground'
                  : 'border-line bg-surface text-foreground/65 hover:border-foreground/30'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] tracking-widest text-foreground/45">
                <th className="px-4 md:px-6 py-3 font-medium">MEMBER</th>
                <th className="px-4 md:px-6 py-3 font-medium hidden md:table-cell">STATE</th>
                <th className="px-4 md:px-6 py-3 font-medium hidden md:table-cell">JOINED</th>
                <th className="px-4 md:px-6 py-3 font-medium">PROTOCOL</th>
                <th className="px-4 md:px-6 py-3 font-medium text-right">MRR</th>
                <th className="px-4 md:px-6 py-3 font-medium text-right">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {MEMBERS.map((m) => {
                const theme = STATUS_THEME[m.status];
                return (
                  <tr key={m.id} className="border-t border-line hover:bg-background/40 transition-colors cursor-pointer">
                    <td className="px-4 md:px-6 py-4">
                      <div className="text-foreground">{m.name}</div>
                      <div className="text-xs text-foreground/55 truncate max-w-[200px]">{m.email}</div>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-foreground/65 hidden md:table-cell">{m.state}</td>
                    <td className="px-4 md:px-6 py-4 text-foreground/65 hidden md:table-cell">{m.joined}</td>
                    <td className="px-4 md:px-6 py-4 text-foreground/85">{m.protocol}</td>
                    <td className="px-4 md:px-6 py-4 text-right text-foreground tabular-nums">
                      {m.mrr === 0 ? <span className="text-foreground/45">—</span> : `$${m.mrr}`}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right">
                      <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] tracking-widest font-semibold', theme.class)}>
                        {theme.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-6 py-3 flex items-center justify-between text-xs text-foreground/55">
          <span>Showing 1–{MEMBERS.length} of {MEMBERS.length}</span>
          <Link href="/portal/admin" className="text-accent hover:text-accent-soft tracking-wider">
            BACK TO OVERVIEW →
          </Link>
        </div>
      </div>
    </PortalShell>
  );
}
