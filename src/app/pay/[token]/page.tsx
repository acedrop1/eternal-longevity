import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { getOrderByPayToken } from '@/lib/pay-on-approval';
import { PayForm } from '@/components/pay/PayForm';
import { stripeConfigured } from '@/lib/stripe';

export const metadata: Metadata = {
  title: 'Complete your payment',
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
      <div className="theme-light bg-background text-foreground">
      <Header />
      <main className="min-h-screen bg-background px-6 pb-16 pt-20 text-foreground">
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
                <ul className="mb-4 space-y-1.5">
                  {order.items.map((it, i) => (
                    <li
                      key={`${it.name}-${i}`}
                      className="text-sm font-semibold text-foreground"
                    >
                      {it.name}
                      {it.qty > 1 ? ` ×${it.qty}` : ''}
                    </li>
                  ))}
                </ul>
                {/* The charge is a care program; the drug is one component of it. */}
                <dl className="mb-5 space-y-2 border-y border-line py-4 text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-foreground/65">Medication + physician care</dt>
                    <dd className="tabular-nums text-foreground">
                      ${(order.totalCents / 100).toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-foreground/65">Ongoing prescriber messaging</dt>
                    <dd className="text-accent">Included</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-foreground/65">Cold-chain shipping</dt>
                    <dd className="text-accent">Free</dd>
                  </div>
                </dl>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-foreground/55">
                    Due today · {order.cadenceLabel} plan
                  </span>
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
                    cadenceLabel={order.cadenceLabel}
                    orderNumber={order.orderNumber}
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

              {/* What happens next — sets the expectation that stops "where is my order" disputes. */}
              <div className="mt-6 rounded-3xl border border-line bg-surface p-6">
                <p className="mb-4 text-[11px] tracking-widest text-foreground/50">
                  WHAT HAPPENS NEXT
                </p>
                <ol className="grid gap-4 sm:grid-cols-3">
                  {[
                    ['Payment clears', 'Your card is charged once, now.'],
                    ['Compounded for you', 'Your signed Rx reaches our licensed 503A pharmacy immediately. Paid before 4p ET, it goes out the same day.'],
                    ['At your door', 'Expedited cold-chain, 1–2 business days. Tracking lands in your inbox.'],
                  ].map(([t, d], i) => (
                    <li key={t} className="flex gap-3">
                      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent text-[11px] font-bold text-black">
                        {i + 1}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-foreground">{t}</span>
                        <span className="block text-xs text-foreground/55 leading-relaxed">{d}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="mt-6 text-center text-xs leading-relaxed text-foreground/45">
                Your prescriber has already approved this order, so nothing here
                is charged on spec. Future cycles are billed only after each one
                is approved; a cycle that isn&apos;t approved is never charged.
                Cancel anytime from your account.
              </p>
              <p className="mt-3 text-center text-xs text-foreground/40">
                This link is unique to your order and expires in seven days.
              </p>
            </>
          )}
        </div>
      </main>
      </div>
      <Footer />
    </>
  );
}
