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
      <Header />
      <main className="min-h-screen bg-white px-5 pb-16 pt-32 text-ink md:px-10 md:pb-24 md:pt-36">
        <div className="mx-auto max-w-lg">
          {!order ? (
            <div className="rounded-shell bg-milk p-6 md:p-8">
              <h1 className="mb-3 text-[32px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[40px]">
                This link is no longer valid.
              </h1>
              <p className="mb-6 text-[15px] leading-relaxed text-ink-soft">
                Payment links expire after seven days, and each one can only be
                used once. If your order is still open, we can send a fresh
                link.
              </p>
              <Link
                href="/portal/messages"
                className="inline-flex rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-ink/85"
              >
                Message support
              </Link>
            </div>
          ) : order.alreadyPaid ? (
            <div className="rounded-shell bg-milk p-6 md:p-8">
              <h1 className="mb-3 text-[32px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[40px]">
                This order is already paid.
              </h1>
              <p className="mb-6 text-[15px] leading-relaxed text-ink-soft">
                Order {order.orderNumber} is with the pharmacy. You&apos;ll get
                tracking as soon as it ships.
              </p>
              <Link
                href="/portal/orders"
                className="inline-flex rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-ink/85"
              >
                View your order
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-milk px-3.5 py-1.5 text-[13px] font-medium text-ink">
                <span aria-hidden className="h-2 w-2 rounded-full bg-butter-deep" />
                Prescriber approved
              </p>
              <h1 className="mb-4 text-[44px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[56px]">
                Complete your payment.
              </h1>
              <p className="mb-8 text-[16px] leading-relaxed text-ink-soft">
                Your prescriber approved your treatment, but the card you saved
                could not be charged. Pay here and your prescription goes
                straight to the pharmacy for compounding.
              </p>

              <div className="rounded-shell bg-milk p-6 md:p-8">
                <p className="mb-4 text-[13px] font-medium text-ink/55">
                  Order {order.orderNumber}
                </p>
                <ul className="mb-4 space-y-1.5">
                  {order.items.map((it, i) => (
                    <li
                      key={`${it.name}-${i}`}
                      className="text-[16px] font-semibold tracking-[-0.01em] text-ink"
                    >
                      {it.name}
                      {it.qty > 1 ? ` ×${it.qty}` : ''}
                    </li>
                  ))}
                </ul>
                {/* The charge is a care program; the drug is one component of it. */}
                <dl className="mb-5 border-t border-ink/10 text-[15px]">
                  <div className="flex items-baseline justify-between gap-4 border-b border-ink/10 py-3">
                    <dt className="text-ink-soft">Medication + physician care</dt>
                    <dd className="tabular-nums text-ink">
                      ${((order.totalCents - order.shippingCents) / 100).toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-b border-ink/10 py-3">
                    <dt className="text-ink-soft">Ongoing prescriber messaging</dt>
                    <dd className="text-ink">Included</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-b border-ink/10 py-3">
                    <dt className="text-ink-soft">Shipping</dt>
                    <dd className="tabular-nums text-ink">${(order.shippingCents / 100).toFixed(2)}</dd>
                  </div>
                </dl>
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] text-ink-soft">
                    Due today · {order.cadenceLabel} plan
                  </span>
                  <span className="text-[28px] font-semibold tracking-[-0.03em] tabular-nums text-ink">
                    ${(order.totalCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-shell bg-white p-6 ring-1 ring-ink/10 md:p-8">
                <p className="mb-4 text-[13px] font-medium text-ink/70">
                  Payment details
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
                    <p className="mb-5 text-[15px] leading-relaxed text-ink-soft">
                      Card payment is being enabled on your account. In the
                      meantime, message us and we&apos;ll send payment details
                      and release your order to the pharmacy the same day.
                    </p>
                    <Link
                      href="/portal/messages"
                      className="inline-flex rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-ink/85"
                    >
                      Message support to pay
                    </Link>
                  </>
                )}
              </div>

              {/* What happens next — sets the expectation that stops "where is my order" disputes. */}
              <div className="mt-3 rounded-shell bg-milk p-6 md:p-8">
                <p className="mb-5 text-[13px] font-medium text-ink/55">
                  What happens next
                </p>
                <ol className="grid gap-4 sm:grid-cols-3">
                  {[
                    ['Payment clears', 'Your card is charged once, now.'],
                    ['Compounded for you', 'Your signed Rx reaches our licensed 503A pharmacy immediately. Paid before 4p ET, it goes out the same day.'],
                    ['At your door', 'Overnight cold-chain or 2-day, depending on the treatment. Tracking lands in your inbox.'],
                  ].map(([t, d], i) => (
                    <li key={t} className="flex gap-3">
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-inner bg-ink text-[13px] font-semibold text-butter">
                        {i + 1}
                      </span>
                      <span>
                        <span className="block text-[15px] font-semibold tracking-[-0.01em] text-ink">{t}</span>
                        <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-soft">{d}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="mt-6 text-[13px] leading-relaxed text-ink/55">
                Your prescriber has already approved this order, so nothing here
                is charged on spec. Future cycles are billed only after each one
                is approved; a cycle that isn&apos;t approved is never charged.
                Cancel anytime from your account.
              </p>
              <p className="mt-3 text-[12px] text-ink/50">
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
