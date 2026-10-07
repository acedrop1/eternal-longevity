'use client';

/**
 * Card form on the approved-order pay link.
 *
 * The prescriber has already approved by the time anyone sees this, so the
 * charge goes through on submit — there is no authorize-then-capture step
 * that could strand money on a card. The server charges (and marks the order
 * paid); this component gets the customer through the form, and through
 * their bank's check when the bank asks for one.
 */

import { useRef, useState } from 'react';
import { confirm3ds, FrameCardField, type FrameCardHandle } from '@/components/payments/FrameCardField';
import { finishPaymentAction, payOrderAction } from '@/lib/checkout-payment-actions';

const TRY_AGAIN = 'We could not process that payment. Please try again.';

export function PayForm({
  token,
  amountLabel,
  cadenceLabel,
  orderNumber,
  accountId,
  cardSummary,
}: {
  token: string;
  amountLabel: string;
  cadenceLabel: string;
  orderNumber: string;
  /** The member's processor account, when it exists: links fraud signals to the charge. */
  accountId?: string;
  /** The card on file, offered as an option; null or absent asks for a card. */
  cardSummary?: { brand: string; last4: string } | null;
}) {
  const field = useRef<FrameCardHandle>(null);
  // The page exists because the saved card did not go through, so a new card leads.
  const [useSaved, setUseSaved] = useState(false);
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'paid' | 'pending' | null>(null);
  const recurring = cadenceLabel.toLowerCase() !== 'one-time';
  const saved = useSaved && !!cardSummary;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !authorized) return;
    const card = saved ? null : (field.current?.getCard() ?? null);
    if (!saved && !card) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await payOrderAction(token, card);
      if (!res.ok) {
        if (!saved && res.error === 'card_rejected') field.current?.setFieldError('number', res.message);
        setError(res.message || TRY_AGAIN);
        return;
      }
      if ('paid' in res && res.paid) return setDone('paid');
      if ('requiresAction' in res && res.requiresAction) {
        // The bank wants the cardholder to confirm. The server then reads the outcome.
        const check = await confirm3ds(res.clientSecret, accountId);
        if (!check.ok) {
          setError(check.message);
          return;
        }
        const fin = await finishPaymentAction(token, res.transferId);
        if (!fin.ok) {
          setError(fin.message || TRY_AGAIN);
          return;
        }
        return setDone(fin.paid ? 'paid' : 'pending');
      }
      setDone('pending');
    } catch {
      setError(TRY_AGAIN);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="rounded-inner bg-butter-soft px-4 py-4 ring-1 ring-butter-deep/40">
        <p className="text-[15px] font-semibold text-ink">
          {done === 'paid' ? 'Payment received. Thank you.' : 'Payment is processing.'}
        </p>
        <p className="mt-1 text-[15px] leading-relaxed text-ink/80">
          {done === 'paid'
            ? `Order ${orderNumber} is on its way to the pharmacy. You'll get tracking as soon as it ships.`
            : `Your bank is still confirming it. We'll email you as soon as it clears and send order ${orderNumber} to the pharmacy.`}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {cardSummary && (
        <div role="radiogroup" aria-label="Card to pay with" className="mb-4 grid gap-2 sm:grid-cols-2">
          {[
            { value: true, label: `${cardSummary.brand.charAt(0).toUpperCase()}${cardSummary.brand.slice(1)} •••• ${cardSummary.last4}` },
            { value: false, label: 'A different card' },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={useSaved === o.value}
              onClick={() => {
                setUseSaved(o.value);
                setError(null);
              }}
              className={`min-h-[48px] rounded-inner px-4 py-3 text-left text-[15px] font-medium text-ink ring-1 transition-colors ${
                useSaved === o.value ? 'bg-butter-soft ring-butter-deep' : 'bg-white ring-ink/10 hover:bg-milk'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {!saved && <FrameCardField ref={field} accountId={accountId} onCompleteChange={setComplete} />}

      {error && (
        <p role="alert" className="mt-4 rounded-inner bg-red-50 px-4 py-3 text-[15px] leading-relaxed text-red-800 ring-1 ring-red-700/20">
          {error}
        </p>
      )}

      {/* Card-network subscription rules: amount, frequency, cancel terms,
          and explicit consent — all before the button enables. */}
      <label className="mt-5 flex cursor-pointer gap-3 rounded-inner bg-milk px-4 py-3.5 text-[14px] leading-relaxed text-ink/85 ring-1 ring-transparent">
        <input
          type="checkbox"
          checked={authorized}
          onChange={(e) => setAuthorized(e.target.checked)}
          className="mt-1 h-4 w-4 flex-none accent-ink"
        />
        <span>
          <span className="mb-1 block text-[13px] font-semibold text-ink">
            Billing authorization
          </span>
          I authorize <strong className="font-medium text-ink">{amountLabel} today</strong> for
          order {orderNumber}
          {recurring ? (
            <>
              , on the <strong className="font-medium text-ink">{cadenceLabel.toLowerCase()} plan</strong>.
              Refills ship on this same prescription and are charged to this
              card, shipping included, on that schedule, without a new review, until I cancel, my
              prescriber pauses or stops the plan, or the prescription runs
              out. I can{' '}
              <strong className="font-medium text-ink">pause or cancel anytime</strong> from my account.
            </>
          ) : (
            <> as a one-time purchase.</>
          )}{' '}
          My prescriber has already approved this treatment.
        </span>
      </label>

      <button
        type="submit"
        disabled={submitting || !authorized || (!saved && !complete)}
        className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-butter px-5 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:bg-butter-deep disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting && (
          <span
            aria-hidden
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink"
          />
        )}
        {submitting ? 'Processing…' : `Pay ${amountLabel} — Start treatment`}
      </button>

      <p className="mt-3 text-center text-[12px] text-ink/65">
        Card details are encrypted in your browser and never touch our servers.
      </p>
    </form>
  );
}
