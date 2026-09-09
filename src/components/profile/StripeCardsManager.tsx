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
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || busy}
        className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-black transition-colors hover:bg-accent-soft disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save card'}
      </button>
      <p className="text-center text-[11px] text-foreground/45">
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
        <p className="text-sm text-foreground/55">Loading your cards…</p>
      )}

      {!loading && cards.length === 0 && !adding && (
        <p className="text-sm text-foreground/65">
          No card on file. Add one and refills are charged automatically once
          your prescriber approves them — you are never charged before that.
        </p>
      )}

      {cards.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
        >
          <span className="text-sm font-semibold capitalize text-foreground">
            {c.brand}
          </span>
          <span className="text-sm tabular-nums text-foreground/80">
            •••• {c.last4}
          </span>
          <span className="text-xs tabular-nums text-foreground/50">
            {String(c.expMonth).padStart(2, '0')}/{String(c.expYear).slice(-2)}
          </span>
          {c.isDefault && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent">
              DEFAULT
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
                className="rounded-full border border-line px-3 py-1 text-[11px] text-foreground/70 transition-colors hover:text-foreground disabled:opacity-40"
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
              className="rounded-full border border-line px-3 py-1 text-[11px] text-foreground/50 transition-colors hover:border-red-400/40 hover:text-red-300 disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {adding && clientSecret ? (
        <div className="rounded-2xl border border-line bg-surface p-4">
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
            <AddCardForm onSaved={onSaved} />
          </Elements>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setClientSecret(null);
            }}
            className="mt-3 w-full text-center text-xs text-foreground/50 hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        !adding && (
          <button
            type="button"
            onClick={startAdd}
            className={cn(
              'w-full rounded-2xl border border-dashed border-line py-3 text-sm text-foreground/70',
              'transition-colors hover:border-accent/40 hover:text-foreground',
            )}
          >
            + Add a card
          </button>
        )
      )}

      {adding && !clientSecret && (
        <p className="text-sm text-foreground/55">Opening secure form…</p>
      )}
    </div>
  );
}
