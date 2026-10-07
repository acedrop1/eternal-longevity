'use client';

import { useConfirm } from '@/components/ui/useConfirm';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FrameCardField, type FrameCardHandle } from '@/components/payments/FrameCardField';
import {
  listCardsAction,
  removeCardAction,
  saveCardAction,
  setDefaultCardAction,
  type SavedCard,
} from '@/lib/cards';
import { cn } from '@/lib/utils';
import { btnPrimary, btnSecondary, btnSmall, errorBox, inset } from '@/components/portal/ui';

/**
 * Cards on file, entered inside the processor's iframe.
 *
 * Nothing here ever sees a card number. The field encrypts it in the browser,
 * the server saves it to the member's account, and we re-read the list
 * afterwards rather than trusting anything the browser tells us about what
 * was saved.
 */

function AddCardForm({ accountId, onSaved }: { accountId?: string; onSaved: () => void }) {
  const field = useRef<FrameCardHandle>(null);
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const card = field.current?.getCard();
    if (!card || busy) return;
    setBusy(true);
    setError(null);
    const res = await saveCardAction(card).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      onSaved();
      return;
    }
    const message = res?.message ?? 'We could not save your card just now. Please try again in a minute.';
    if (res?.error === 'card_rejected') field.current?.setFieldError('number', message);
    setError(message);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FrameCardField ref={field} accountId={accountId} onCompleteChange={setComplete} />
      {error && (
        <p role="alert" className={errorBox}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!complete || busy}
        className={cn(btnPrimary, 'w-full')}
      >
        {busy ? 'Saving…' : 'Save card'}
      </button>
      <p className="text-center text-[15px] text-ink/70">
        Encrypted in your browser. We never see your full card number.
      </p>
    </form>
  );
}

export function CardsManager({ accountId }: { accountId?: string }) {
  const [confirm, confirmDialog] = useConfirm();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  const refresh = useCallback(() => {
    setLoading(true);
    void listCardsAction()
      .then(setCards)
      .finally(() => setLoading(false));
  }, []);
  useEffect(refresh, [refresh]);

  function onSaved() {
    setAdding(false);
    // Read the truth back from the server rather than optimistically inserting.
    refresh();
    // The page above offers what a new card unlocks (a declined refill, an
    // approved order waiting on payment) when it sees card=added.
    router.replace('/portal/account?card=added', { scroll: false });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {confirmDialog}
      {loading && (
        <p role="status" className="text-[15px] text-ink/70">Loading your cards…</p>
      )}

      {!loading && cards.length === 0 && !adding && (
        <p className="text-[15px] leading-relaxed text-ink/70">
          No card on file. Add one and refills are charged automatically once
          your prescriber approves them — you are never charged before that.
        </p>
      )}

      {cards.map((c) => (
        <div
          key={c.id}
          className={cn(inset, 'flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3')}
        >
          <span className="text-[15px] font-medium capitalize text-ink">
            {c.brand}
          </span>
          <span className="text-[15px] tabular-nums text-ink/80">
            •••• {c.last4}
          </span>
          <span className="text-[14px] font-medium tabular-nums text-ink/70">
            {String(c.expMonth).padStart(2, '0')}/{String(c.expYear).slice(-2)}
          </span>
          {c.isDefault && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-butter-soft px-2.5 py-1 text-[12px] font-medium leading-none text-ink ring-1 ring-inset ring-butter-deep/60">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-400" />
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
                className={cn(btnSmall, 'bg-white text-ink ring-ink/10 hover:bg-milk')}
              >
                Make default
              </button>
            )}
            <button
              type="button"
              disabled={busyId === c.id}
              onClick={async () => {
                if (!(await confirm({ title: `Remove the card ending ${c.last4}?`, confirmLabel: 'Remove card', danger: true }))) return;
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

      {adding ? (
        <div className={cn(inset, 'p-4')}>
          <AddCardForm accountId={accountId} onSaved={onSaved} />
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="mt-2 min-h-[44px] w-full text-center text-[14px] font-medium text-ink/70 hover:text-ink"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={btnSecondary}
        >
          + Add a card
        </button>
      )}
    </div>
  );
}
