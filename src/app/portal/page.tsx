import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import { getPendingVisit } from '@/lib/intake-actions';
import { listOrders } from '@/lib/orders-db';
import { STATUS_LABEL } from '@/lib/orders';

export const metadata: Metadata = {
  title: 'Portal | Eternal Longevity',
};

/**
 * Member home. Deliberately minimal: a greeting, ONE required action if there
 * is one, the latest order's status, and three big tiles. Everything else
 * lives on its own page.
 */
export default async function MemberPortalPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  const [pendingVisit, orders] = await Promise.all([
    getPendingVisit(),
    listOrders().catch(() => []),
  ]);
  const latest = orders[0] ?? null;
  const firstName = (user.name ?? 'there').trim().split(/\s+/)[0];

  const tiles = [
    {
      href: '/portal/shop',
      title: 'Shop',
      body: 'Browse protocols and peptides.',
    },
    {
      href: '/portal/orders',
      title: 'Orders',
      body: latest
        ? `Latest: ${STATUS_LABEL[latest.status] ?? latest.status}`
        : 'No orders yet.',
    },
    {
      href: '/portal/messages',
      title: 'Messages',
      body: 'Your care team and doctor.',
    },
  ];

  return (
    <PortalShell
      user={user}
      nav={[
        { label: 'Dashboard', href: '/portal' },
        { label: 'Shop', href: '/portal/shop' },
        { label: 'Orders', href: '/portal/orders' },
        { label: 'Messages', href: '/portal/messages' },
        { label: 'Subscriptions', href: '/portal/subscriptions' },
        { label: 'Account', href: '/portal/account' },
      ]}
    >
      {/* Greeting */}
      <div className="mb-8">
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Hi {firstName}.
        </h1>
        <p className="mt-2 text-foreground/60">
          {pendingVisit
            ? 'One thing needs your attention.'
            : latest
              ? 'Everything is on track.'
              : 'Ready when you are.'}
        </p>
      </div>

      {/* The one required action */}
      {pendingVisit && (
        <Link
          href="/portal/visit"
          className="mb-6 flex items-center justify-between gap-4 rounded-3xl border border-accent/40 bg-accent/[0.07] p-6 transition hover:bg-accent/[0.12]"
        >
          <div>
            <p className="mb-1 flex items-center gap-2 text-[11px] tracking-widest text-accent">
              <span className="h-2 w-2 rounded-full bg-accent" />
              REQUIRED
            </p>
            <p className="text-lg font-semibold text-foreground">
              Complete your visit
            </p>
            <p className="mt-1 text-sm text-foreground/60">
              A few health questions so your prescriber can review
              {pendingVisit.productName ? ` your ${pendingVisit.productName} order` : ''}.
              Takes about 3 minutes.
            </p>
          </div>
          <span aria-hidden className="text-2xl text-accent">
            →
          </span>
        </Link>
      )}

      {/* Latest order, one line */}
      {latest && (
        <Link
          href="/portal/orders"
          className="mb-6 flex items-center justify-between gap-4 rounded-3xl border border-line bg-surface px-6 py-5 transition hover:border-foreground/25"
        >
          <div className="min-w-0">
            <p className="mb-1 text-[11px] tracking-widest text-foreground/50">
              LATEST ORDER
            </p>
            <p className="truncate text-sm text-foreground/85">
              {latest.lines.map((l) => l.productName).join(', ')}
            </p>
          </div>
          <span className="flex-none rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-semibold tracking-widest text-accent">
            {(STATUS_LABEL[latest.status] ?? latest.status).toUpperCase()}
          </span>
        </Link>
      )}

      {/* Three tiles. That's the whole dashboard. */}
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group rounded-3xl border border-line bg-surface p-6 transition hover:border-accent/40"
          >
            <p className="text-lg font-semibold text-foreground">{t.title}</p>
            <p className="mt-1 text-sm text-foreground/55">{t.body}</p>
            <span
              aria-hidden
              className="mt-4 inline-block text-foreground/40 transition group-hover:translate-x-1 group-hover:text-accent"
            >
              →
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-xs text-foreground/40">
        Need anything?{' '}
        <Link href="/portal/messages" className="text-accent hover:underline">
          Message us
        </Link>{' '}
        — replies within one business day.
      </p>
    </PortalShell>
  );
}
