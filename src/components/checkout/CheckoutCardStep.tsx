'use client';

import { useRef, useState } from 'react';
import { FrameCardField, type FrameCardHandle } from '@/components/payments/FrameCardField';
import { saveCardAction } from '@/lib/cards';

/**
 * Card capture at checkout — saved, not charged.
 *
 * Nothing moves here and nothing appears on the member's statement. The card
 * is saved to their account and becomes the one charged when the prescriber
 * approves; if they decline it never is, so there is no refund to issue and
 * no processing fee lost.
 */
export function CheckoutCardStep({
  accountId,
  amountLabel,
  saved,
  onSaved,
}: {
  /** The member's processor account, when it already exists. */
  accountId?: string;
  amountLabel: string;
  saved: boolean;
  onSaved: () => void;
}) {
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
    /*
     * saveCard also makes this the card charged on approval, so a member who
     * chose "Use a different card" is charged this one, not the old one.
     */
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

  return (
    <form onSubmit={onSubmit}>
      <div className="rounded-inner bg-milk p-3 md:p-4">
        <FrameCardField ref={field} accountId={accountId} onCompleteChange={setComplete} />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-inner bg-red-50 px-4 py-3 text-[15px] leading-relaxed text-red-700 ring-1 ring-red-600/20">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!complete || busy}
        className="mt-5 min-h-[48px] w-full rounded-full bg-ink px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'Saving…' : 'Save card and continue'}
      </button>

      <p className="mt-3 text-center text-[13px] leading-relaxed text-ink/65">
        <strong className="font-semibold text-ink">Nothing is charged now.</strong>{' '}
        If your prescriber approves your treatment, this card is charged{' '}
        {amountLabel}. If they decide it is not right for you, it never is.
      </p>
    </form>
  );
}
