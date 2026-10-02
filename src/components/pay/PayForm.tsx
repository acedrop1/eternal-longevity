'use client';

/**
 * Card form on the approved-order pay link.
 *
 * The prescriber has already approved by the time anyone sees this, so the
 * PaymentIntent charges on confirm — there is no authorize-then-capture step
 * that could strand money on a card. The Stripe webhook flips the order to
 * paid; this component only has to get the customer through the form.
 */

import { useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { createPayIntentAction } from '@/lib/checkout-payment-actions';

const ERRORS: Record<string, string> = {
  invalid_link: 'This payment link is no longer valid.',
  already_paid: 'This order has already been paid.',
  expired: 'This payment link has expired. We can send you a fresh one.',
  not_configured: 'Card payment is not available right now.',
  invalid_amount: 'We could not read the amount for this order.',
};

function CardFields({
  amountLabel,
  cadenceLabel,
  orderNumber,
}: {
  amountLabel: string;
  cadenceLabel: string;
  orderNumber: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recurring = cadenceLabel.toLowerCase() !== 'one-time';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || submitting || !authorized) return;

    setSubmitting(true);
    setError(null);

    const { error: submitErr } = await elements.submit();
    if (submitErr) {
      setError(submitErr.message ?? 'Please check your card details.');
      setSubmitting(false);
      return;
    }

    const { error: confirmErr } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}?paid=1`,
      },
    });

    // We only get here if confirmation failed — success redirects away.
    setError(confirmErr.message ?? 'We could not process that card.');
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: 'tabs' }} />

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
        disabled={!stripe || submitting || !authorized}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-butter px-5 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:bg-butter-deep disabled:cursor-not-allowed disabled:opacity-50"
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
        Secured by Stripe. Your card details never touch our servers.
      </p>
    </form>
  );
}

export function PayForm({
  token,
  publishableKey,
  amountLabel,
  cadenceLabel,
  orderNumber,
}: {
  token: string;
  publishableKey: string;
  amountLabel: string;
  cadenceLabel: string;
  orderNumber: string;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stripePromise = useMemo<Promise<Stripe | null>>(
    () => loadStripe(publishableKey),
    [publishableKey],
  );

  useEffect(() => {
    let cancelled = false;
    createPayIntentAction(token).then((res) => {
      if (cancelled) return;
      if (res.ok && res.clientSecret) setClientSecret(res.clientSecret);
      else setError(ERRORS[res.error ?? ''] ?? 'We could not start payment.');
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <p role="alert" className="rounded-inner bg-red-50 px-4 py-3 text-[15px] leading-relaxed text-red-800 ring-1 ring-red-700/20">
        {error}
      </p>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center gap-3 text-[13px] font-medium text-ink/65">
        <span
          aria-hidden
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink/15 border-t-ink"
        />
        Loading secure payment…
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#111111',
            colorBackground: '#ffffff',
            colorText: '#111111',
            borderRadius: '18px',
            fontSizeBase: '16px',
          },
        },
      }}
    >
      <CardFields
        amountLabel={amountLabel}
        cadenceLabel={cadenceLabel}
        orderNumber={orderNumber}
      />
    </Elements>
  );
}
