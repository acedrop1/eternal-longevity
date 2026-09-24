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
      <div className="mx-auto max-w-xl pt-8 text-black md:pt-16">
        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
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

        <p className="mb-3 font-mono text-[13px] text-black/55">Order received</p>
        <h1
          className="mb-4 font-display font-normal [text-wrap:balance]"
          style={{ fontSize: 'clamp(2.2rem, 3vw + 1rem, 3.5rem)', fontStretch: '75%', lineHeight: 1 }}
        >
          Your order is in.
        </h1>
        <p className="mb-10 text-[16px] leading-relaxed text-black/70">
          We&apos;ve emailed a confirmation to {user.email}. Your card is only
          charged if your prescriber approves your treatment — if it&apos;s
          declined, you pay nothing.
        </p>

        <ol className="mb-10 border-t border-black/15">
          {[
            { n: '01', text: 'Complete your clinical visit so your prescriber can review.' },
            { n: '02', text: 'If approved, your prescription goes to the pharmacy and your card is charged.' },
            { n: '03', text: "It's compounded, tested, and shipped — tracking lands in your inbox." },
          ].map((s) => (
            <li
              key={s.n}
              className="flex items-start gap-4 border-b border-black/15 py-4"
            >
              <span className="pt-0.5 font-mono text-[13px] tabular-nums text-black/55">
                {s.n}
              </span>
              <span className="text-[15px] leading-relaxed text-black/80">
                {s.text}
              </span>
            </li>
          ))}
        </ol>

        <Link
          href={pendingVisit ? '/portal/visit' : '/portal'}
          className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3.5 font-mono text-[14px] text-white transition-colors hover:bg-black/85"
        >
          {pendingVisit ? 'Complete your visit' : 'Back to portal'}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </PortalShell>
  );
}
