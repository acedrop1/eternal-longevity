import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Subscriptions — Eternal Longevity',
};

interface Subscription {
  id: string;
  productName: string;
  cycleLabel: string;
  cadenceLabel: string;
  perMonth: number;
  nextBillingDate: string;
  status: 'active' | 'paused' | 'pending-review';
  image: string;
  swatch: string;
}

const SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-recover',
    productName: 'Recover Protocol',
    cycleLabel: '12-week cycle',
    cadenceLabel: 'Quarterly · billed every 3 months',
    perMonth: 160,
    nextBillingDate: 'Aug 9, 2026',
    status: 'active',
    image: '/images/11.jpg',
    swatch: 'linear-gradient(180deg, #1a4a3e 0%, #000000 100%)',
  },
  {
    id: 'sub-cjc',
    productName: 'CJC-1295 / Ipamorelin',
    cycleLabel: '12-week cycle',
    cadenceLabel: 'Monthly · billed every month',
    perMonth: 240,
    nextBillingDate: 'June 12, 2026',
    status: 'pending-review',
    image: '/images/9.jpg',
    swatch: 'linear-gradient(180deg, #3a5a4e 0%, #000000 100%)',
  },
];

const STATUS_THEME: Record<
  Subscription['status'],
  { label: string; class: string }
> = {
  active: {
    label: 'ACTIVE',
    class: 'bg-accent/10 text-accent border-accent/40',
  },
  paused: {
    label: 'PAUSED',
    class: 'bg-amber-500/10 text-amber-300 border-amber-400/40',
  },
  'pending-review': {
    label: 'AWAITING PHYSICIAN',
    class: 'bg-sky-500/10 text-sky-300 border-sky-400/40',
  },
};

export default async function SubscriptionsPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  return (
    <PortalShell
      user={user}
      nav={[
        { label: 'Dashboard', href: '/portal' },
        { label: 'Shop', href: '/portal/shop' },
        { label: 'Orders', href: '/portal/orders' },
      ]}
    >
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          SUBSCRIPTIONS · {SUBSCRIPTIONS.length} ACTIVE
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Manage your subscriptions.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Pause between cycles, change the cadence, or cancel at any time
          before the next physician sign-off. No mid-cycle billing.
        </p>
      </div>

      <div className="space-y-4">
        {SUBSCRIPTIONS.map((s) => {
          const theme = STATUS_THEME[s.status];
          return (
            <article
              key={s.id}
              className="rounded-3xl border border-line bg-surface p-5 md:p-7"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-4 min-w-0 flex-1">
                  <div
                    className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-line"
                    style={{ background: s.swatch }}
                  >
                    <Image
                      src={s.image}
                      alt={s.productName}
                      fill
                      sizes="80px"
                      className="object-cover opacity-50"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] tracking-widest font-semibold',
                          theme.class
                        )}
                      >
                        {theme.label}
                      </span>
                    </div>
                    <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
                      {s.productName}
                    </h2>
                    <p className="mt-0.5 text-sm text-foreground/65">
                      {s.cycleLabel} · {s.cadenceLabel}
                    </p>
                    <p className="mt-1 text-xs text-foreground/55">
                      {s.status === 'paused'
                        ? 'Resumes when you click Resume.'
                        : `Next billing: ${s.nextBillingDate}`}
                    </p>
                  </div>
                </div>

                <div className="text-right md:flex-shrink-0">
                  <div className="text-xl font-semibold text-foreground tabular-nums">
                    ${s.perMonth}
                    <span className="text-sm text-foreground/55 font-normal">
                      /mo
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
                <button
                  type="button"
                  className="rounded-full border border-line bg-background text-foreground/85 font-medium px-4 py-2 text-xs hover:border-foreground/30 transition-colors"
                >
                  Change cadence
                </button>
                <button
                  type="button"
                  className="rounded-full border border-line bg-background text-foreground/85 font-medium px-4 py-2 text-xs hover:border-foreground/30 transition-colors"
                >
                  {s.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-red-500/30 bg-red-500/5 text-red-300 font-medium px-4 py-2 text-xs hover:bg-red-500/10 transition-colors"
                >
                  Cancel
                </button>
                <Link
                  href="/portal/orders"
                  className="ml-auto text-[11px] tracking-widest text-accent hover:text-accent-soft"
                >
                  ORDER HISTORY →
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <section className="mt-12 rounded-3xl border border-line bg-surface p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
              Add another peptide
            </h2>
            <p className="text-sm text-foreground/65 leading-relaxed">
              Browse the catalog and subscribe to anything that fits your
              protocol. Your physician reviews every addition before it ships.
            </p>
          </div>
          <Link
            href="/portal/shop"
            className="inline-flex items-center justify-center rounded-full bg-accent text-black font-semibold px-6 py-3 text-sm hover:bg-accent-soft transition-colors"
          >
            Browse the shop →
          </Link>
        </div>
      </section>
    </PortalShell>
  );
}
