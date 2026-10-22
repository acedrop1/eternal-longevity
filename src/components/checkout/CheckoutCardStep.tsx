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
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <CardBrands />
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink/60">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Encrypted by our payment processor
        </span>
      </div>
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

/** Accepted card brands, drawn inline (no image requests, no icon package). */
function CardBrands() {
  const chip = 'grid h-6 w-[38px] place-items-center rounded-[4px] bg-white ring-1 ring-ink/12';
  return (
    <ul aria-label="Cards accepted: Visa, Mastercard, American Express, Discover" className="flex items-center gap-1.5">
      <li className={chip}>
        <svg viewBox="0 0 38 24" width="38" height="24" aria-hidden>
          <text x="19" y="16.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="10.5" fontWeight="800" fontStyle="italic" fill="#1a1f71">VISA</text>
        </svg>
      </li>
      <li className={chip}>
        <svg viewBox="0 0 38 24" width="38" height="24" aria-hidden>
          <circle cx="15.5" cy="12" r="6.5" fill="#eb001b" />
          <circle cx="22.5" cy="12" r="6.5" fill="#f79e1b" />
          <path d="M19 6.5a6.5 6.5 0 0 1 0 11a6.5 6.5 0 0 1 0-11z" fill="#ff5f00" />
        </svg>
      </li>
      <li className={chip}>
        <svg viewBox="0 0 38 24" width="38" height="24" aria-hidden>
          <rect x="3" y="4" width="32" height="16" rx="2" fill="#1f72cd" />
          <text x="19" y="15.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="7.5" fontWeight="800" fill="#fff">AMEX</text>
        </svg>
      </li>
      <li className={chip}>
        <svg viewBox="0 0 38 24" width="38" height="24" aria-hidden>
          <text x="16" y="14.6" textAnchor="end" fontFamily="Arial, Helvetica, sans-serif" fontSize="5.8" fontWeight="800" fill="#231f20">DISC</text>
          <circle cx="18.6" cy="12.6" r="2.3" fill="#f68121" />
          <text x="21.2" y="14.6" fontFamily="Arial, Helvetica, sans-serif" fontSize="5.8" fontWeight="800" fill="#231f20">VER</text>
        </svg>
      </li>
    </ul>
  );
}
