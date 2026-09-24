'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import {
  createSetupIntentAction,
  listCardsAction,
  removeCardAction,
  setDefaultCardAction,
  type SavedCard,
} from '@/lib/cards';
import { cn } from '@/lib/utils';
import { btnPrimary, btnSecondary, btnSmall, errorBox, inset } from '@/components/portal/ui';

/**
 * Cards on file, entered inside Stripe's iframe.
 *
 * Nothing here ever sees a card number. The PaymentElement renders on
 * Stripe's origin, the SetupIntent attaches the card to the customer, and we
 * re-read the list from Stripe afterwards rather than trusting anything the
 * browser tells us about what was saved.
 */

function AddCardForm({ onSaved }: { onSaved: () => void }) {
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
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <p role="alert" className={errorBox}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || busy}
        className={cn(btnPrimary, 'w-full')}
      >
        {busy ? 'Saving…' : 'Save card'}
      </button>
      <p className="text-center text-[13px] text-black/55">
        Entered directly with Stripe. Card details never reach our servers.
      </p>
    </form>
  );
}

export function StripeCardsManager({
  publishableKey,
}: {
  publishableKey: string;
}) {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const stripePromise = useMemo<Promise<Stripe | null>>(
    () => loadStripe(publishableKey),
    [publishableKey],
  );

  const refresh = useCallback(() => {
    setLoading(true);
    void listCardsAction()
      .then(setCards)
      .finally(() => setLoading(false));
  }, []);
  useEffect(refresh, [refresh]);

  async function startAdd() {
    setAdding(true);
    const res = await createSetupIntentAction();
    if (res.ok && res.clientSecret) setClientSecret(res.clientSecret);
  }

  async function onSaved() {
    setAdding(false);
    setClientSecret(null);
    // Read the truth back from Stripe rather than optimistically inserting.
    refresh();
  }

  return (
    <div className="space-y-3">
      {loading && (
        <p role="status" className="text-[15px] text-black/55">Loading your cards…</p>
      )}

      {!loading && cards.length === 0 && !adding && (
        <p className="text-[15px] leading-relaxed text-black/65">
          No card on file. Add one and refills are charged automatically once
          your prescriber approves them — you are never charged before that.
        </p>
      )}

      {cards.map((c) => (
        <div
          key={c.id}
          className={cn(inset, 'flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3')}
        >
          <span className="text-[15px] font-medium capitalize text-black">
            {c.brand}
          </span>
          <span className="text-[15px] tabular-nums text-black/80">
            •••• {c.last4}
          </span>
          <span className="font-mono text-[13px] tabular-nums text-black/55">
            {String(c.expMonth).padStart(2, '0')}/{String(c.expYear).slice(-2)}
          </span>
          {c.isDefault && (
            <span className="inline-flex items-center gap-1.5 rounded-[2px] bg-black/[0.05] px-2 py-1 font-mono text-[12px] leading-none text-black">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#D5A850]" />
              Default
            </span>
          )}
          <div className="ml-auto flex flex-none gap-2">
            {!c.isDefault && (
              <button
                type="button"
                disabled={busyId === c.id}
                onClick={async () => {
                  setBusyId(c.id);
                  await setDefaultCardAction(c.id);
                  setBusyId(null);
                  refresh();
                }}
                className={cn(btnSmall, 'bg-white text-black ring-black/15 hover:bg-black/[0.04]')}
              >
                Make default
              </button>
            )}
            <button
              type="button"
              disabled={busyId === c.id}
              onClick={async () => {
                if (!window.confirm(`Remove the card ending ${c.last4}?`)) return;
                setBusyId(c.id);
                await removeCardAction(c.id);
                setBusyId(null);
                refresh();
              }}
              className={cn(btnSmall, 'bg-white text-red-800 ring-red-700/30 hover:bg-red-50')}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {adding && clientSecret ? (
        <div className={cn(inset, 'p-4')}>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                // Light, to sit on the white portal. Appearance only.
                theme: 'stripe',
                variables: {
                  colorPrimary: '#000000',
                  colorBackground: '#ffffff',
                  colorText: '#000000',
                  borderRadius: '2px',
                },
              },
            }}
          >
            <AddCardForm onSaved={onSaved} />
          </Elements>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setClientSecret(null);
            }}
            className="mt-2 min-h-[44px] w-full text-center font-mono text-[13px] text-black/60 hover:text-black"
          >
            Cancel
          </button>
        </div>
      ) : (
        !adding && (
          <button
            type="button"
            onClick={startAdd}
            className={btnSecondary}
          >
            + Add a card
          </button>
        )
      )}

      {adding && !clientSecret && (
        <p role="status" className="text-[15px] text-black/55">Opening secure form…</p>
      )}
    </div>
  );
}
