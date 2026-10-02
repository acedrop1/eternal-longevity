'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { createOrderAuthAction } from '@/lib/checkout-payment-actions';
import { setDefaultCardAction } from '@/lib/cards';

/**
 * Card capture at checkout — saved, not charged.
 *
 * Nothing moves here and nothing appears on the member's statement. When the
 * prescriber approves, this card is charged off-session; if they decline it
 * never is, so there is no refund to issue and no processing fee lost.
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

    const { error: confirmErr, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    });
    if (confirmErr) {
      setError(confirmErr.message ?? 'We could not save that card.');
      setBusy(false);
      return;
    }
    /*
     * The approval charge takes the default card. Without this, a member who
     * already had one and chose "Use a different card" would be charged the
     * old one. Best effort: a failure leaves the newest card, which is still
     * what gets charged when no default is set.
     */
    const pm = setupIntent?.payment_method;
    const pmId = typeof pm === 'string' ? pm : pm?.id;
    if (pmId) await setDefaultCardAction(pmId).catch(() => {});
    setBusy(false);
    onSaved();
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="rounded-inner bg-milk p-3 md:p-4">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-inner bg-red-50 px-4 py-3 text-[15px] leading-relaxed text-red-700 ring-1 ring-red-600/20">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || busy}
        className="mt-5 min-h-[48px] w-full rounded-full bg-ink px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'Saving…' : 'Save card and continue'}
      </button>

      <p className="mt-3 text-center text-[13px] leading-relaxed text-ink/55">
        <strong className="font-semibold text-ink">Nothing is charged now.</strong>{' '}
        If your prescriber approves your treatment, this card is charged{' '}
        {amountLabel}. If they decide it is not right for you, it never is.
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
}: {
  publishableKey: string;
  amountLabel: string;
  amountCents: number;
  saved: boolean;
  onSaved: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped by "Try again" to ask for a fresh card form.
  const [attempt, setAttempt] = useState(0);

  const stripePromise = useMemo<Promise<Stripe | null>>(
    () => loadStripe(publishableKey),
    [publishableKey],
  );

  useEffect(() => {
    if (saved) return;
    let cancelled = false;
    setError(null);
    createOrderAuthAction(amountCents)
      .catch(() => ({ ok: false, clientSecret: undefined }))
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.clientSecret) {
          setClientSecret(res.clientSecret);
        } else {
          setError('Card entry is unavailable right now.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [saved, amountCents, attempt]);

  if (saved) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-inner bg-butter-soft px-4 py-3.5 ring-1 ring-butter-deep/40">
        <span aria-hidden className="grid h-6 w-6 flex-none place-items-center rounded-full bg-butter text-[13px] text-ink">
          ✓
        </span>
        <p className="text-[15px] text-ink">
          Card saved. You are charged {amountLabel} only if your prescriber
          approves — never before, and never if they decline.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-inner bg-red-50 px-4 py-3 text-[15px] leading-relaxed text-red-700 ring-1 ring-red-600/20">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="min-h-[36px] rounded-full bg-white px-4 text-[14px] font-semibold text-ink ring-1 ring-ink/10 hover:bg-milk"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center gap-3 rounded-inner bg-milk px-4 py-4 text-[14px] text-ink/55">
        <span
          aria-hidden
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink/15 border-t-ink"
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
          theme: 'stripe',
          variables: {
            colorPrimary: '#111111',
            colorBackground: '#ffffff',
            colorText: '#111111',
            borderRadius: '18px', // rounded-inner, same as the site's inputs
            fontSizeBase: '16px',
          },
        },
      }}
    >
      <CardCapture onSaved={onSaved} amountLabel={amountLabel} />
    </Elements>
  );
}
