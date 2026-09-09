'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { createSetupIntentAction } from '@/lib/cards';

/**
 * Card capture at checkout — saved, not charged.
 *
 * A SetupIntent stores the card against the Stripe customer without moving
 * money and without putting a pending authorisation on the member's statement.
 * When the prescriber signs, the order charges that card off-session.
 *
 * The alternative — an authorisation hold — was rejected deliberately: holds
 * show as a pending charge for days and expire after seven, so a prescriber
 * who takes a week to review would leave the charge un-capturable.
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

    const { error: confirmErr } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    });
    if (confirmErr) {
      setError(confirmErr.message ?? 'We could not save that card.');
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
        {busy ? 'Saving…' : 'Save card and continue'}
      </button>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-foreground/50">
        Nothing is charged now. If your prescriber approves your treatment,
        this card is charged {amountLabel}. If they decline, it never is.
      </p>
    </form>
  );
}

export function CheckoutCardStep({
  publishableKey,
  amountLabel,
  saved,
  onSaved,
}: {
  publishableKey: string;
  amountLabel: string;
  saved: boolean;
  onSaved: () => void;
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
    createSetupIntentAction().then((res) => {
      if (cancelled) return;
      if (res.ok && res.clientSecret) setClientSecret(res.clientSecret);
      else setError('Card entry is unavailable right now.');
    });
    return () => {
      cancelled = true;
    };
  }, [saved]);

  if (saved) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-accent/30 bg-accent/[0.06] px-4 py-3.5">
        <span aria-hidden className="text-accent">
          ✓
        </span>
        <p className="text-sm text-foreground/85">
          Card saved. You&apos;ll be charged {amountLabel} only if your
          prescriber approves.
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
