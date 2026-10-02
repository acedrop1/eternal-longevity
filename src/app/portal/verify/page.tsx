import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { IdVerificationForm } from '@/components/portal/IdVerificationForm';
import { getSession, loginUrl } from '@/lib/auth-server';
import { MEMBER_NAV, PageHeader, panel } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Verify ID',
};

const ACCEPTED_DOCS = [
  'Driver license (front + back)',
  'State-issued ID card',
  'U.S. passport (photo page only)',
  'Military ID (front + back)',
];

export default async function VerifyIdPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'member') redirect(user.redirectTo);

  return (
    <PortalShell user={user} nav={MEMBER_NAV}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] font-medium text-ink/65">
        <Link href="/portal" className="transition-colors hover:text-ink">
          Dashboard
        </Link>
        <span aria-hidden>/</span>
        <span aria-current="page" className="text-ink">Verify ID</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
        {/* === MAIN === */}
        <div className="space-y-8">
          <div>
            <PageHeader
              title="Verify your identity."
              intro="U.S. law requires us to confirm the identity of every person receiving a compounded protocol. Two photos, ~30 seconds."
            />
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-butter-soft px-3 py-1.5 text-[13px] font-medium text-ink ring-1 ring-inset ring-butter-deep/60">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Required before first shipment
            </p>
          </div>

          <IdVerificationForm />
        </div>

        {/* === SIDEBAR === */}
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className={`${panel} p-5`}>
            <h2 className="mb-2 text-[15px] font-semibold text-ink">What we accept</h2>
            <ul className="space-y-1.5 text-[15px] text-ink/75">
              {ACCEPTED_DOCS.map((d) => (
                <li key={d} className="flex items-start gap-2">
                  <span aria-hidden className="mt-[0.55rem] h-1 w-1 flex-none rounded-full bg-ink/40" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${panel} p-5`}>
            <h2 className="mb-2 text-[15px] font-semibold text-ink">How we handle it</h2>
            <p className="text-[15px] leading-relaxed text-ink-soft">
              Your ID is encrypted at rest (AES-256) and accessible only to the
              team members who need to verify it. We do not share with
              third parties. See our{' '}
              <Link
                href="/legal/privacy"
                className="text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
              >
                Privacy Policy
              </Link>{' '}
              for details.
            </p>
          </div>

          <div className={`${panel} p-5`}>
            <h2 className="mb-2 text-[15px] font-semibold text-ink">Why it&apos;s required</h2>
            <p className="text-[15px] leading-relaxed text-ink-soft">
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
