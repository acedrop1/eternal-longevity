'use client';

import { useState } from 'react';
import { useMemberProfile } from './MemberProfileProvider';
import { cn } from '@/lib/utils';

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
        <p className="text-sm text-foreground/55">
          No saved cards yet. Add one for faster checkout.
        </p>
      )}

      {profile.cards.map((c) => (
        <div
          key={c.id}
          className={cn(
            'flex items-center gap-4 rounded-2xl border p-4',
            c.isPrimary
              ? 'border-accent/40 bg-accent/5'
              : 'border-line bg-background'
          )}
        >
          <div className="grid h-10 w-14 place-items-center rounded-lg bg-foreground/10 text-[10px] font-bold tracking-widest text-foreground/75">
            {c.brand}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground">
              •••• {c.last4}
              {c.isPrimary && (
                <span className="ml-2 rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] tracking-widest font-semibold">
                  PRIMARY
                </span>
              )}
            </div>
            <div className="text-xs text-foreground/55 mt-0.5">
              Expires {c.expMonth}/{c.expYear} · {c.nameOnCard}
            </div>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            {!c.isPrimary && (
              <button
                type="button"
                onClick={() => setPrimaryCard(c.id)}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-[10px] tracking-widest text-foreground/85 hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                SET PRIMARY
              </button>
            )}
            <button
              type="button"
              onClick={() => removeCard(c.id)}
              className="rounded-full border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-[10px] tracking-widest text-red-300 hover:bg-red-500/10 transition-colors"
            >
              REMOVE
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 md:p-5">
          <div className="mb-4 text-[10px] tracking-widest text-accent">
            NEW CARD
          </div>
          <div className="grid gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
                CARD NUMBER
              </label>
              <input
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
                <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
                  EXPIRY
                </label>
                <input
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
                <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
                  CVC
                </label>
                <input
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
              <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
                NAME ON CARD
              </label>
              <input
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
              className="flex items-center gap-3 rounded-2xl border border-line bg-background px-4 py-3 text-left hover:border-foreground/30 transition-colors"
            >
              <span
                className={cn(
                  'grid h-5 w-5 flex-shrink-0 place-items-center rounded-md border-2',
                  draft.isPrimary
                    ? 'border-accent bg-accent text-background'
                    : 'border-line bg-surface'
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
              <span className="text-sm text-foreground/85">
                Make this my primary payment method
              </span>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={save}
                className="rounded-full bg-accent text-black font-semibold px-5 py-2.5 text-sm hover:bg-accent-soft transition-colors"
              >
                Save card
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(EMPTY);
                  setAdding(false);
                }}
                className="rounded-full border border-line bg-surface text-foreground/85 px-4 py-2 text-xs tracking-wider hover:text-foreground hover:border-foreground/30 transition-colors"
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
          className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-soft"
        >
          + Add a new card
        </button>
      )}
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-line bg-background px-4 py-3 text-base text-foreground placeholder-foreground/30 transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';
