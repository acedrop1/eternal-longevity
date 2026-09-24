'use client';

import { useState } from 'react';
import { useMemberProfile } from './MemberProfileProvider';
import { cn } from '@/lib/utils';
import { btnPrimary, btnSecondary, btnSmall, field, fieldLabel, inset } from '@/components/portal/ui';

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 19);
  if (/^3[47]/.test(digits)) {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
      .filter(Boolean)
      .join(' ');
  }
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function detectBrand(d: string): string {
  const x = d.replace(/\D/g, '');
  if (/^4/.test(x)) return 'VISA';
  if (/^5[1-5]/.test(x) || /^2[2-7]/.test(x)) return 'MASTERCARD';
  if (/^3[47]/.test(x)) return 'AMEX';
  if (/^6(?:011|5)/.test(x)) return 'DISCOVER';
  return 'CARD';
}

function formatExp(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

interface CardDraft {
  number: string;
  exp: string;
  cvc: string;
  name: string;
  isPrimary: boolean;
}

const EMPTY: CardDraft = {
  number: '',
  exp: '',
  cvc: '',
  name: '',
  isPrimary: false,
};

export function SavedCardsManager() {
  const { profile, addCard, removeCard, setPrimaryCard } = useMemberProfile();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<CardDraft>(EMPTY);

  function save() {
    const digits = draft.number.replace(/\D/g, '');
    if (digits.length < 13) return;
    if (!/^\d{2}\/\d{2}$/.test(draft.exp)) return;
    if (digits.length < 3 || !draft.name.trim()) return;
    const [m, y] = draft.exp.split('/');
    addCard({
      brand: detectBrand(digits),
      last4: digits.slice(-4),
      expMonth: m,
      expYear: y,
      nameOnCard: draft.name,
      isPrimary: draft.isPrimary || profile.cards.length === 0,
    });
    setDraft(EMPTY);
    setAdding(false);
  }

  return (
    <div className="space-y-3">
      {profile.cards.length === 0 && !adding && (
        <p className="text-[15px] text-black/60">
          No saved cards yet. Add one for faster checkout.
        </p>
      )}

      {profile.cards.map((c) => (
        <div
          key={c.id}
          className={cn(
            inset,
            'flex flex-wrap items-center gap-x-4 gap-y-3 p-4',
            c.isPrimary && 'ring-black/30'
          )}
        >
          <div className="grid h-10 w-14 flex-none place-items-center rounded-[2px] bg-[#F2F2F0] font-mono text-[11px] text-black/75">
            {c.brand}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[15px] font-medium tabular-nums text-black">
              •••• {c.last4}
              {c.isPrimary && (
                <span className="inline-flex items-center gap-1.5 rounded-[2px] bg-black/[0.05] px-2 py-1 font-mono text-[12px] font-normal leading-none text-black">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#D5A850]" />
                  Primary
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[14px] tabular-nums text-black/60">
              Expires {c.expMonth}/{c.expYear} · {c.nameOnCard}
            </div>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            {!c.isPrimary && (
              <button
                type="button"
                onClick={() => setPrimaryCard(c.id)}
                className={cn(btnSmall, 'bg-white text-black ring-black/15 hover:bg-black/[0.04]')}
              >
                Set primary
              </button>
            )}
            <button
              type="button"
              onClick={() => removeCard(c.id)}
              className={cn(btnSmall, 'bg-white text-red-800 ring-red-700/30 hover:bg-red-50')}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className={cn(inset, 'p-4 md:p-5')}>
          <p className="mb-4 text-[16px] font-medium text-black">New card</p>
          <div className="grid gap-4">
            <div>
              <label className={fieldLabel}>Card number</label>
              <input
                aria-label="Card number"
                type="text"
                inputMode="numeric"
                value={draft.number}
                onChange={(e) =>
                  setDraft({ ...draft, number: formatCardNumber(e.target.value) })
                }
                placeholder="1234 5678 9012 3456"
                className={inputClass}
              />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div>
                <label className={fieldLabel}>Expiry</label>
                <input
                  aria-label="Card expiry, MM/YY"
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={draft.exp}
                  onChange={(e) =>
                    setDraft({ ...draft, exp: formatExp(e.target.value) })
                  }
                  placeholder="04/27"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={fieldLabel}>CVC</label>
                <input
                  aria-label="Card security code"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={draft.cvc}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      cvc: e.target.value.replace(/\D/g, '').slice(0, 4),
                    })
                  }
                  placeholder="123"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={fieldLabel}>Name on card</label>
              <input
                aria-label="Name on card"
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={() =>
                setDraft({ ...draft, isPrimary: !draft.isPrimary })
              }
              aria-pressed={draft.isPrimary}
              className="flex min-h-[44px] items-center gap-3 rounded-[2px] bg-white px-4 py-3 text-left ring-1 ring-black/15 transition-colors hover:bg-black/[0.02]"
            >
              <span
                className={cn(
                  'grid h-5 w-5 flex-shrink-0 place-items-center rounded-[2px] ring-1',
                  draft.isPrimary
                    ? 'bg-black text-white ring-black'
                    : 'bg-white ring-black/30'
                )}
              >
                {draft.isPrimary && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span className="text-[15px] text-black/80">
                Make this my primary payment method
              </span>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={save}
                className={btnPrimary}
              >
                Save card
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(EMPTY);
                  setAdding(false);
                }}
                className={btnSecondary}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={btnSecondary}
        >
          + Add a new card
        </button>
      )}
    </div>
  );
}

const inputClass = cn(field, 'tabular-nums');
