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
import { createPayIntentAction } from '@/lib/pay-on-approval';

const ERRORS: Record<string, string> = {
  invalid_link: 'This payment link is no longer valid.',
  already_paid: 'This order has already been paid.',
  expired: 'This payment link has expired. We can send you a fresh one.',
  not_configured: 'Card payment is not available right now.',
  invalid_amount: 'We could not read the amount for this order.',
};

function CardFields({ amountLabel }: { amountLabel: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;

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
        <p className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-base font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting && (
          <span
            aria-hidden
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black"
          />
        )}
        {submitting ? 'Processing…' : `Pay ${amountLabel}`}
      </button>

      <p className="mt-3 text-center text-[11px] text-foreground/45">
        Secured by Stripe. Your card details never touch our servers.
      </p>
    </form>
  );
}

export function PayForm({
  token,
  publishableKey,
  amountLabel,
}: {
  token: string;
  publishableKey: string;
  amountLabel: string;
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
      <p className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error}
      </p>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center gap-3 text-sm text-foreground/50">
        <span
          aria-hidden
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-accent"
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
          theme: 'night',
          variables: {
            colorPrimary: '#d5a850',
            colorBackground: '#0f0f0f',
            colorText: '#e5e5e5',
            borderRadius: '14px',
          },
        },
      }}
    >
      <CardFields amountLabel={amountLabel} />
    </Elements>
  );
}
