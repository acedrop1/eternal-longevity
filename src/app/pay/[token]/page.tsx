import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { getOrderByPayToken } from '@/lib/pay-on-approval';
import { PayForm } from '@/components/pay/PayForm';
import { stripeConfigured } from '@/lib/stripe';

export const metadata: Metadata = {
  title: 'Complete your payment | Eternal Longevity',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PayPageProps {
  params: Promise<{ token: string }>;
}

/**
 * The secure pay link a member receives once their prescriber approves.
 * Card fields land here the moment a processor is live; until then this
 * confirms the amount and routes them to support to settle.
 */
export default async function PayPage({ params }: PayPageProps) {
  const { token } = await params;
  const order = await getOrderByPayToken(token);

  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY ?? '';
  const cardReady = stripeConfigured() && publishableKey.startsWith('pk_');

  return (
    <>
      <Header />
      <main className="bg-background min-h-screen px-6 pt-32 pb-24">
        <div className="mx-auto max-w-lg">
          {!order ? (
            <div className="rounded-3xl border border-line bg-surface p-8 text-center">
              <h1 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">
                This link is no longer valid.
              </h1>
              <p className="mb-6 text-sm text-foreground/60 leading-relaxed">
                Payment links expire after seven days, and each one can only be
                used once. If your order is still open, we can send a fresh
                link.
              </p>
              <Link
                href="/portal/messages"
                className="pill bg-accent px-6 py-3 text-sm font-semibold text-black"
              >
                Message support
              </Link>
            </div>
          ) : order.alreadyPaid ? (
            <div className="rounded-3xl border border-line bg-surface p-8 text-center">
              <h1 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">
                This order is already paid.
              </h1>
              <p className="mb-6 text-sm text-foreground/60 leading-relaxed">
                Order {order.orderNumber} is with the pharmacy. You&apos;ll get
                tracking as soon as it ships.
              </p>
              <Link
                href="/portal/orders"
                className="pill bg-accent px-6 py-3 text-sm font-semibold text-black"
              >
                View your order
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-2 text-[11px] tracking-widest text-accent">
                PRESCRIBER APPROVED
              </p>
              <h1
                className="mb-3 font-semibold tracking-tight text-foreground"
                style={{
                  fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                }}
              >
                Complete your payment.
              </h1>
              <p className="mb-8 text-foreground/65 leading-relaxed">
                Your prescriber approved your treatment. Once payment clears,
                your prescription goes straight to the pharmacy for compounding.
              </p>

              <div className="rounded-3xl border border-line bg-surface p-6">
                <p className="mb-4 text-[11px] tracking-widest text-foreground/50">
                  ORDER {order.orderNumber}
                </p>
                <ul className="mb-5 space-y-2 border-b border-line pb-5">
                  {order.items.map((it, i) => (
                    <li
                      key={`${it.name}-${i}`}
                      className="flex items-baseline justify-between gap-4 text-sm"
                    >
                      <span className="text-foreground/85">
                        {it.name}
                        {it.qty > 1 ? ` ×${it.qty}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-foreground/55">Amount due</span>
                  <span className="text-2xl font-semibold tabular-nums text-foreground">
                    ${(order.totalCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-line bg-surface p-6">
                <p className="mb-4 text-[11px] tracking-widest text-foreground/50">
                  PAYMENT DETAILS
                </p>
                {cardReady ? (
                  <PayForm
                    token={token}
                    publishableKey={publishableKey}
                    amountLabel={`$${(order.totalCents / 100).toFixed(2)}`}
                  />
                ) : (
                  <>
                    <p className="mb-4 text-sm text-foreground/75 leading-relaxed">
                      Card payment is being enabled on your account. In the
                      meantime, message us and we&apos;ll send payment details
                      and release your order to the pharmacy the same day.
                    </p>
                    <Link
                      href="/portal/messages"
                      className="pill bg-accent px-6 py-3 text-sm font-semibold text-black"
                    >
                      Message support to pay
                    </Link>
                  </>
                )}
              </div>

              <p className="mt-6 text-center text-xs text-foreground/40">
                This link is unique to your order and expires in seven days.
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
