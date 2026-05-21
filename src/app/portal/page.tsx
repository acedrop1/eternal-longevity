import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Portal | Eternal Longevity',
};

// Demo data. Replace with real read from the member's record
const PROTOCOL = {
  name: 'Recover Protocol',
  cycle: '12-week cycle',
  ingredients: [
    { name: 'BPC-157', dose: '250 mcg / day SQ' },
    { name: 'TB-500', dose: '2 mg / week SQ' },
  ],
  total: 480,
  physician: 'Dr. M. Reyes',
};

export default async function MemberPortalPage() {
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
        { label: 'Subscriptions', href: '/portal/subscriptions' },
        { label: 'Account', href: '/portal/account' },
      ]}
    >
      {/* === STATUS HEADER === */}
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-accent">
          PROTOCOL DRAFTED · {PROTOCOL.physician.toUpperCase()}
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Hi {user.name.split(' ')[0]}. Your protocol is ready.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Two things before your physician can sign: verify your ID and add a
          payment method. Nothing is charged until a physician approves your
          protocol. Billing begins the moment they sign.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* === MAIN. PROTOCOL SUMMARY + CHECKOUT === */}
        <div className="space-y-6">
          {/* Protocol summary card */}
          <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <div className="mb-1 text-[10px] tracking-widest text-accent">
              YOUR PROTOCOL
            </div>
            <h2 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
              {PROTOCOL.name}
            </h2>
            <p className="text-sm text-foreground/55">{PROTOCOL.cycle}</p>

            <div className="my-6 h-px bg-line" />

            <ul className="space-y-3">
              {PROTOCOL.ingredients.map((ing) => (
                <li
                  key={ing.name}
                  className="flex items-center justify-between"
                >
                  <span className="font-medium text-foreground">
                    {ing.name}
                  </span>
                  <span className="text-sm text-foreground/65">{ing.dose}</span>
                </li>
              ))}
            </ul>

            <div className="my-6 h-px bg-line" />

            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-foreground/65">First cycle</span>
              <span className="text-2xl font-semibold text-foreground tracking-tight">
                ${PROTOCOL.total}
              </span>
            </div>
            <p className="mb-6 text-xs text-foreground/45 leading-relaxed">
              Billed only when your physician signs your protocol. You are not
              charged anything now.
            </p>

            <Link
              href="/checkout"
              className="block w-full rounded-full bg-accent text-black font-semibold py-3.5 text-base text-center hover:bg-accent-soft transition-colors"
            >
              Add a payment method →
            </Link>
            <p className="mt-3 text-center text-[11px] text-foreground/45">
              Saved securely · No charge until physician sign-off
            </p>
          </section>

          {/* Cycle timeline */}
          <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <div className="mb-4 text-[10px] tracking-widest text-foreground/50">
              CYCLE TIMELINE
            </div>
            <ol className="space-y-3">
              {[
                { n: '01', title: 'ID verification', body: 'Required by law for prescription products.', status: 'pending' as const },
                { n: '02', title: 'Payment method', body: 'Add a card now. It is saved securely and not charged.', status: 'pending' as const },
                { n: '03', title: 'Physician sign-off', body: 'Your physician reviews and signs. Billing starts the moment they do.', status: 'upcoming' as const },
                { n: '04', title: 'Shipment', body: 'The pharmacy compounds and ships cold-chain within 3 to 5 days of sign-off.', status: 'upcoming' as const },
                { n: '05', title: 'Mid-cycle check-in', body: 'Your physician messages at week 6.', status: 'upcoming' as const },
              ].map((s) => (
                <li
                  key={s.n}
                  className="flex items-start gap-3 rounded-2xl border border-line bg-background p-4"
                >
                  <span className="text-[10px] tracking-widest text-accent pt-0.5">
                    {s.n}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">
                      {s.title}
                    </div>
                    <p className="text-xs text-foreground/55 leading-relaxed mt-0.5">
                      {s.body}
                    </p>
                  </div>
                  <span
                    className={
                      s.status === 'pending'
                        ? 'rounded-full border border-accent/40 bg-accent/10 text-accent px-2 py-0.5 text-[10px] tracking-widest'
                        : 'rounded-full border border-line bg-surface text-foreground/45 px-2 py-0.5 text-[10px] tracking-widest'
                    }
                  >
                    {s.status === 'pending' ? 'PENDING YOU' : 'UPCOMING'}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* === SIDEBAR. QUICK ACTIONS === */}
        <aside className="space-y-3">
          {/* Shop highlight. Oura "explore more" pattern */}
          <Link
            href="/portal/shop"
            className="group relative block overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-5 transition-all hover:border-accent/70"
          >
            <div className="mb-2 text-[10px] tracking-widest text-accent">
              MEMBER SHOP · NEW
            </div>
            <div className="mb-1 text-base font-semibold tracking-tight text-foreground">
              Shop more peptides
            </div>
            <p className="mb-3 text-sm text-foreground/65 leading-relaxed">
              Add individual peptides to your routine. Subscription-only,
              physician-reviewed before every cycle.
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent group-hover:translate-x-1 transition-transform">
              Browse the catalog
              <span aria-hidden>→</span>
            </span>
          </Link>

          <QuickAction
            eyebrow="ID VERIFICATION"
            title="Upload a photo ID"
            body="Required before your first shipment. ~30 seconds."
            href="/portal/verify"
            cta="Start"
          />
          <QuickAction
            eyebrow="CLINICAL CARE"
            title="Message your care team"
            body="Replies within one business day. Same-day callback for urgent."
            href="/contact"
            cta="Open chat"
          />
          <QuickAction
            eyebrow="ORDERS"
            title="Order history"
            body="No prior orders yet. Your first cycle is queued."
            href="/portal/orders"
            cta="View"
          />
        </aside>
      </div>
    </PortalShell>
  );
}

function QuickAction({
  eyebrow,
  title,
  body,
  href,
  cta,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-line bg-surface p-5 transition-all hover:border-accent/40"
    >
      <div className="mb-2 text-[10px] tracking-widest text-accent">
        {eyebrow}
      </div>
      <div className="mb-1 text-base font-semibold tracking-tight text-foreground">
        {title}
      </div>
      <p className="mb-3 text-sm text-foreground/55 leading-relaxed">{body}</p>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/85 group-hover:text-accent transition-colors">
        {cta}
        <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}
