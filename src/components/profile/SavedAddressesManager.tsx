'use client';

import { useState } from 'react';
import { useMemberProfile } from './MemberProfileProvider';
import { formatAddressOneLine } from '@/lib/memberProfile';
import { STATES_AVAILABLE } from '@/lib/intakeSchema';
import { cn } from '@/lib/utils';

interface NewAddressDraft {
  label: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  isPrimary: boolean;
}

const EMPTY: NewAddressDraft = {
  label: 'Home',
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  isPrimary: false,
};

export function SavedAddressesManager() {
  const { profile, addAddress, removeAddress, setPrimaryAddress } = useMemberProfile();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<NewAddressDraft>(EMPTY);

  function saveDraft() {
    if (
      !draft.fullName.trim() ||
      !draft.line1.trim() ||
      !draft.city.trim() ||
      !draft.state.trim() ||
      !draft.zip.trim()
    ) {
      return;
    }
    addAddress({
      label: draft.label || 'Address',
      fullName: draft.fullName,
      line1: draft.line1,
      line2: draft.line2 || undefined,
      city: draft.city,
      state: draft.state,
      zip: draft.zip,
      phone: draft.phone || undefined,
      isPrimary: draft.isPrimary || profile.addresses.length === 0,
    });
    setDraft(EMPTY);
    setAdding(false);
  }

  return (
    <div className="space-y-3">
      {profile.addresses.length === 0 && !adding && (
        <p className="text-sm text-foreground/55">
          No saved addresses yet. Add one to skip re-entering at checkout.
        </p>
      )}

      {profile.addresses.map((a) => (
        <div
          key={a.id}
          className={cn(
            'rounded-2xl border p-4',
            a.isPrimary
              ? 'border-accent/40 bg-accent/5'
              : 'border-line bg-background'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {a.label}
                </span>
                {a.isPrimary && (
                  <span className="rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] tracking-widest font-semibold">
                    PRIMARY
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground/85">{a.fullName}</p>
              <p className="text-xs text-foreground/55 mt-0.5">
                {formatAddressOneLine(a)}
              </p>
              {a.phone && (
                <p className="text-xs text-foreground/55 mt-0.5">{a.phone}</p>
              )}
            </div>
            <div className="flex flex-shrink-0 gap-2">
              {!a.isPrimary && (
                <button
                  type="button"
                  onClick={() => setPrimaryAddress(a.id)}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-[10px] tracking-widest text-foreground/85 hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  SET PRIMARY
                </button>
              )}
              <button
                type="button"
                onClick={() => removeAddress(a.id)}
                className="rounded-full border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-[10px] tracking-widest text-red-300 hover:bg-red-500/10 transition-colors"
              >
                REMOVE
              </button>
            </div>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 md:p-5">
          <div className="mb-4 text-[10px] tracking-widest text-accent">
            NEW ADDRESS
          </div>
          <div className="grid gap-4">
            <Field
              label="LABEL"
              value={draft.label}
              onChange={(v) => setDraft({ ...draft, label: v })}
              placeholder="Home / Work / Mom's"
            />
            <Field
              label="FULL NAME"
              value={draft.fullName}
              onChange={(v) => setDraft({ ...draft, fullName: v })}
            />
            <Field
              label="STREET ADDRESS"
              value={draft.line1}
              onChange={(v) => setDraft({ ...draft, line1: v })}
            />
            <Field
              label="APT / SUITE (OPTIONAL)"
              value={draft.line2}
              onChange={(v) => setDraft({ ...draft, line2: v })}
            />
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
              <Field
                label="CITY"
                value={draft.city}
                onChange={(v) => setDraft({ ...draft, city: v })}
              />
              <div>
                <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
                  STATE
                </label>
                <select
                  value={draft.state}
                  onChange={(e) => setDraft({ ...draft, state: e.target.value })}
                  className={cn(inputClass, 'appearance-none')}
                >
                  <option value="">—</option>
                  {STATES_AVAILABLE.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="ZIP"
                value={draft.zip}
                onChange={(v) =>
                  setDraft({ ...draft, zip: v.replace(/\D/g, '').slice(0, 5) })
                }
                inputMode="numeric"
                placeholder="07030"
              />
            </div>
            <Field
              label="PHONE (OPTIONAL)"
              value={draft.phone}
              onChange={(v) => setDraft({ ...draft, phone: v })}
              type="tel"
              placeholder="(555) 555-5555"
            />
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
                Make this my primary shipping address
              </span>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={saveDraft}
                className="rounded-full bg-accent text-black font-semibold px-5 py-2.5 text-sm hover:bg-accent-soft transition-colors"
              >
                Save address
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
          + Add another address
        </button>
      )}
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-line bg-background px-4 py-3 text-base text-foreground placeholder-foreground/30 transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: 'numeric' | 'tel' | 'email';
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
        {label}
      </label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}
