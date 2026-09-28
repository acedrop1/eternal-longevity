import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import { getPendingVisit } from '@/lib/intake-actions';

export const metadata: Metadata = {
  title: 'Order confirmed',
};

export default async function CheckoutSuccessPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  const pendingVisit = await getPendingVisit();

  return (
    <PortalShell user={user}>
      <div className="mx-auto max-w-xl pt-8 text-ink md:pt-16">
        <div className="rounded-shell bg-milk p-6 md:p-10">
        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-butter text-ink">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <p className="mb-3 text-[13px] font-medium text-ink/55">Order received</p>
        <h1
          className="mb-4 text-[40px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[56px]"
        >
          Your order is in.
        </h1>
        <p className="mb-8 text-[16px] leading-relaxed text-ink-soft">
          We&apos;ve emailed a confirmation to {user.email}. Your card is only
          charged if your prescriber approves your treatment — if it&apos;s
          declined, you pay nothing.
        </p>

        <ol className="mb-8 grid gap-2">
          {[
            { n: '01', text: 'Complete your clinical visit so your prescriber can review.' },
            { n: '02', text: 'If approved, your prescription goes to the pharmacy and your card is charged.' },
            { n: '03', text: "It's compounded, tested, and shipped — tracking lands in your inbox." },
          ].map((s) => (
            <li
              key={s.n}
              className="flex items-start gap-4 rounded-inner bg-white p-4"
            >
              <span className="pt-0.5 text-[13px] font-medium tabular-nums text-ink/45">
                {s.n}
              </span>
              <span className="text-[15px] leading-relaxed text-ink">
                {s.text}
              </span>
            </li>
          ))}
        </ol>

        <Link
          href={pendingVisit ? '/portal/visit' : '/portal'}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-butter px-6 py-3 text-[15px] font-semibold text-ink transition-transform hover:-translate-y-0.5"
        >
          {pendingVisit ? 'Complete your visit' : 'Back to portal'}
          <span aria-hidden>→</span>
        </Link>
        </div>
      </div>
    </PortalShell>
  );
}
