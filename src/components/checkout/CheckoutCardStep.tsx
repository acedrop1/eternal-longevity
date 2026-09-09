'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { createOrderAuthAction } from '@/lib/order-auth';

/**
 * Authorisation at checkout — money held, not taken.
 *
 * A saved card proves the card exists; it does not prove the money is there.
 * This places a real hold for the full amount, so the funds are confirmed and
 * reserved before a prescriber ever sees the order. Approve captures the hold;
 * decline releases it.
 *
 * The member does see a pending line for the full amount in the meantime. That
 * is the cost of the guarantee, and the copy below says so rather than letting
 * them discover it on their statement.
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
        {busy ? 'Authorising…' : `Authorise ${amountLabel} and continue`}
      </button>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-foreground/50">
        We place a hold for {amountLabel} — you may see it as pending, but{' '}
        <strong className="text-foreground/70">nothing is taken yet</strong>. If
        your prescriber approves, the hold becomes the charge. If they decline,
        it is released and disappears.
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
          {amountLabel} authorised and held. It becomes a charge only if your
          prescriber approves — otherwise it is released.
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
