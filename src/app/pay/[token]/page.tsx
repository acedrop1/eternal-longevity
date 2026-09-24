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
      <main className="min-h-screen bg-white px-5 pb-16 pt-[112px] text-black md:px-8 md:pb-24 md:pt-[136px]">
        <div className="mx-auto max-w-lg">
          {!order ? (
            <div className="rounded-[4px] bg-[#F2F2F0] p-6 md:p-8">
              <h1
                className="mb-3 font-display font-normal [text-wrap:balance]"
                style={{ fontSize: 'clamp(1.8rem, 2vw + 1rem, 2.6rem)', fontStretch: '75%', lineHeight: 1.05 }}
              >
                This link is no longer valid.
              </h1>
              <p className="mb-6 text-[15px] leading-relaxed text-black/70">
                Payment links expire after seven days, and each one can only be
                used once. If your order is still open, we can send a fresh
                link.
              </p>
              <Link
                href="/portal/messages"
                className="inline-flex rounded-full bg-black px-5 py-3.5 font-mono text-[14px] text-white transition-colors hover:bg-black/85"
              >
                Message support
              </Link>
            </div>
          ) : order.alreadyPaid ? (
            <div className="rounded-[4px] bg-[#F2F2F0] p-6 md:p-8">
              <h1
                className="mb-3 font-display font-normal [text-wrap:balance]"
                style={{ fontSize: 'clamp(1.8rem, 2vw + 1rem, 2.6rem)', fontStretch: '75%', lineHeight: 1.05 }}
              >
                This order is already paid.
              </h1>
              <p className="mb-6 text-[15px] leading-relaxed text-black/70">
                Order {order.orderNumber} is with the pharmacy. You&apos;ll get
                tracking as soon as it ships.
              </p>
              <Link
                href="/portal/orders"
                className="inline-flex rounded-full bg-black px-5 py-3.5 font-mono text-[14px] text-white transition-colors hover:bg-black/85"
              >
                View your order
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-3 font-mono text-[13px] text-black/55">
                Prescriber approved
              </p>
              <h1
                className="mb-4 font-display font-normal [text-wrap:balance]"
                style={{ fontSize: 'clamp(2.2rem, 3vw + 1rem, 3.5rem)', fontStretch: '75%', lineHeight: 1 }}
              >
                Complete your payment.
              </h1>
              <p className="mb-8 text-[16px] leading-relaxed text-black/70">
                Your prescriber approved your treatment, but the card you saved
                could not be charged. Pay here and your prescription goes
                straight to the pharmacy for compounding.
              </p>

              <div className="rounded-[4px] bg-[#F2F2F0] p-6 md:p-8">
                <p className="mb-4 font-mono text-[13px] text-black/55">
                  Order {order.orderNumber}
                </p>
                <ul className="mb-4 space-y-1.5">
                  {order.items.map((it, i) => (
                    <li
                      key={`${it.name}-${i}`}
                      className="text-[16px] font-medium text-black"
                    >
                      {it.name}
                      {it.qty > 1 ? ` ×${it.qty}` : ''}
                    </li>
                  ))}
                </ul>
                {/* The charge is a care program; the drug is one component of it. */}
                <dl className="mb-5 border-t border-black/15 text-[15px]">
                  <div className="flex items-baseline justify-between gap-4 border-b border-black/15 py-3">
                    <dt className="text-black/70">Medication + physician care</dt>
                    <dd className="tabular-nums text-black">
                      ${(order.totalCents / 100).toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-b border-black/15 py-3">
                    <dt className="text-black/70">Ongoing prescriber messaging</dt>
                    <dd className="text-black">Included</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-b border-black/15 py-3">
                    <dt className="text-black/70">Cold-chain shipping</dt>
                    <dd className="text-black">Free</dd>
                  </div>
                </dl>
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] text-black/60">
                    Due today · {order.cadenceLabel} plan
                  </span>
                  <span className="text-2xl font-medium tabular-nums text-black">
                    ${(order.totalCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-[4px] bg-white p-6 ring-1 ring-black/15 md:p-8">
                <p className="mb-4 font-mono text-[13px] text-black/70">
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
                    <p className="mb-5 text-[15px] leading-relaxed text-black/75">
                      Card payment is being enabled on your account. In the
                      meantime, message us and we&apos;ll send payment details
                      and release your order to the pharmacy the same day.
                    </p>
                    <Link
                      href="/portal/messages"
                      className="inline-flex rounded-full bg-black px-5 py-3.5 font-mono text-[14px] text-white transition-colors hover:bg-black/85"
                    >
                      Message support to pay
                    </Link>
                  </>
                )}
              </div>

              {/* What happens next — sets the expectation that stops "where is my order" disputes. */}
              <div className="mt-4 rounded-[4px] bg-black p-6 text-white md:p-8">
                <p className="mb-5 font-mono text-[13px] text-white/60">
                  What happens next
                </p>
                <ol className="grid gap-4 sm:grid-cols-3">
                  {[
                    ['Payment clears', 'Your card is charged once, now.'],
                    ['Compounded for you', 'Your signed Rx reaches our licensed 503A pharmacy immediately. Paid before 4p ET, it goes out the same day.'],
                    ['At your door', 'Expedited cold-chain, 1–2 business days. Tracking lands in your inbox.'],
                  ].map(([t, d], i) => (
                    <li key={t} className="flex gap-3">
                      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent font-mono text-[12px] text-black">
                        {i + 1}
                      </span>
                      <span>
                        <span className="block text-[15px] font-medium text-white">{t}</span>
                        <span className="mt-0.5 block text-[13px] leading-relaxed text-white/65">{d}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="mt-6 text-[13px] leading-relaxed text-black/55">
                Your prescriber has already approved this order, so nothing here
                is charged on spec. Future cycles are billed only after each one
                is approved; a cycle that isn&apos;t approved is never charged.
                Cancel anytime from your account.
              </p>
              <p className="mt-3 font-mono text-[12px] text-black/50">
                This link is unique to your order and expires in seven days.
              </p>
            </>
          )}
        </div>
      </main>
      <div className="bg-white">
        <Footer />
      </div>
    </>
  );
}
