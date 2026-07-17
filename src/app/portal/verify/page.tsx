import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { IdVerificationForm } from '@/components/portal/IdVerificationForm';
import { getSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Verify ID | Eternal Longevity',
};

const ACCEPTED_DOCS = [
  'Driver license (front + back)',
  'State-issued ID card',
  'U.S. passport (photo page only)',
  'Military ID (front + back)',
];

export default async function VerifyIdPage() {
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
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-[11px] tracking-widest text-foreground/55">
        <Link
          href="/portal"
          className="hover:text-foreground transition-colors"
        >
          DASHBOARD
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground/85">VERIFY ID</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
        {/* === MAIN === */}
        <div>
          <div className="mb-8">
            <p className="mb-2 text-[11px] tracking-widest text-accent">
              REQUIRED · BEFORE FIRST SHIPMENT
            </p>
            <h1
              className="font-semibold tracking-tight text-foreground"
              style={{
                fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
              }}
            >
              Verify your identity.
            </h1>
            <p className="mt-3 max-w-xl text-foreground/65 leading-relaxed">
              U.S. law requires us to confirm the identity of every person
              receiving a compounded protocol. Two photos, ~30 seconds.
            </p>
          </div>

          <IdVerificationForm />
        </div>

        {/* === SIDEBAR === */}
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-2 text-[10px] tracking-widest text-accent">
              WHAT WE ACCEPT
            </div>
            <ul className="space-y-1.5 text-sm text-foreground/85">
              {ACCEPTED_DOCS.map((d) => (
                <li key={d} className="flex items-start gap-2">
                  <span aria-hidden className="text-accent mt-1">·</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-2 text-[10px] tracking-widest text-foreground/55">
              HOW WE HANDLE IT
            </div>
            <p className="text-sm text-foreground/75 leading-relaxed">
              Your ID is encrypted at rest (AES-256) and accessible only to the
              team members who need to verify it. We do not share with
              third parties. See our{' '}
              <Link
                href="/legal/privacy"
                className="text-accent hover:text-accent-soft"
              >
                Privacy Policy
              </Link>{' '}
              for details.
            </p>
          </div>

          <div className="rounded-2xl border border-accent/40 bg-accent/5 p-5">
            <div className="mb-2 text-[10px] tracking-widest text-accent">
              WHY IT&apos;S REQUIRED
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed">
              State pharmacy boards require identity verification before a
              compounded protocol ships. Without this step the pharmacy
              cannot release your order.
            </p>
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}
