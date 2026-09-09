'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { createOrderAuthAction } from '@/lib/order-payment';

/**
 * Payment at checkout.
 *
 * The money settles here, so the prescriber never meets a declined card and
 * the member gets a real receipt straight away rather than a pending line they
 * have to interpret. If the prescriber declines, the refund is automatic and
 * immediate — which is what the copy below promises.
 */
function CardCapture({
  onSaved,
  amountLabel,
}: {
  onSaved: () => void;
  amountLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setError(null);

    const { error: submitErr } = await elements.submit();
    if (submitErr) {
      setError(submitErr.message ?? 'Please check the card details.');
      setBusy(false);
      return;
    }

    const { error: confirmErr } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (confirmErr) {
      setError(
        confirmErr.message ??
          'We could not authorise that card. Try another one.',
      );
      setBusy(false);
      return;
    }
    setBusy(false);
    onSaved();
  }

  return (
    <form onSubmit={onSubmit}>
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || busy}
        className="mt-5 w-full rounded-full bg-accent py-3.5 text-base font-semibold text-black transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Processing…' : `Pay ${amountLabel} and continue`}
      </button>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-foreground/50">
        Charged now. If your prescriber decides this treatment is not right for
        you,{' '}
        <strong className="text-foreground/70">
          you are refunded in full
        </strong>{' '}
        and nothing ships.
      </p>
    </form>
  );
}

export function CheckoutCardStep({
  publishableKey,
  amountLabel,
  amountCents,
  saved,
  onSaved,
  onAuthorized,
}: {
  publishableKey: string;
  amountLabel: string;
  amountCents: number;
  saved: boolean;
  onSaved: () => void;
  /** The PaymentIntent holding the funds, so the order can be tied to it. */
  onAuthorized: (paymentIntentId: string) => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stripePromise = useMemo<Promise<Stripe | null>>(
    () => loadStripe(publishableKey),
    [publishableKey],
  );

  useEffect(() => {
    if (saved) return;
    let cancelled = false;
    createOrderAuthAction(amountCents).then((res) => {
      if (cancelled) return;
      if (res.ok && res.clientSecret) {
        setClientSecret(res.clientSecret);
        onAuthorized(res.paymentIntentId ?? '');
      } else {
        setError('Card entry is unavailable right now.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [saved, amountCents, onAuthorized]);

  if (saved) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-accent/30 bg-accent/[0.06] px-4 py-3.5">
        <span aria-hidden className="text-accent">
          ✓
        </span>
        <p className="text-sm text-foreground/85">
          {amountLabel} paid. Refunded in full if your prescriber does not
          approve your treatment.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error}
      </p>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center gap-3 text-sm text-foreground/55">
        <span
          aria-hidden
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-accent"
        />
        Loading secure card form…
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
            fontSizeBase: '16px',
          },
        },
      }}
    >
      <CardCapture onSaved={onSaved} amountLabel={amountLabel} />
    </Elements>
  );
}
