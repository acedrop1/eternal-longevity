import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Order confirmed — Eternal Longevity',
};

export default async function CheckoutSuccessPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  return (
    <PortalShell user={user}>
      <div className="mx-auto max-w-xl text-center pt-8 md:pt-16">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-black">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <p className="mb-3 text-[11px] tracking-widest text-accent">
          PAYMENT RECEIVED
        </p>
        <h1
          className="mb-4 font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Your cycle is queued.
        </h1>
        <p className="mb-10 text-foreground/65 leading-relaxed">
          We&apos;ve sent a receipt to {user.email}. The pharmacy will compound
          and ship within 3–5 business days; you&apos;ll get a tracking number
          the moment it leaves the lab.
        </p>

        <div className="grid gap-2 text-left mb-10">
          {[
            { n: '01', text: 'Pharmacy receives your Rx and starts compounding.' },
            { n: '02', text: "We'll email you a tracking number once it ships." },
            { n: '03', text: 'Your physician messages you at week six.' },
          ].map((s) => (
            <div
              key={s.n}
              className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4"
            >
              <span className="text-[10px] tracking-widest text-accent pt-0.5">
                {s.n}
              </span>
              <span className="text-sm text-foreground/80 leading-relaxed">
                {s.text}
              </span>
            </div>
          ))}
        </div>

        <Link
          href="/portal"
          className="inline-flex items-center gap-2 rounded-full bg-foreground text-background font-semibold px-7 py-3 hover:bg-accent hover:text-black transition-colors"
        >
          Back to portal
          <span aria-hidden>→</span>
        </Link>
      </div>
    </PortalShell>
  );
}
