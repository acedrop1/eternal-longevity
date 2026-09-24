'use client';

import { useState } from 'react';
import { useMemberProfile } from './MemberProfileProvider';
import { formatAddressOneLine } from '@/lib/memberProfile';
import { SERVICEABLE_STATES } from '@/lib/intakeSchema';
import { cn } from '@/lib/utils';
import { btnPrimary, btnSecondary, btnSmall, field, fieldLabel, inset } from '@/components/portal/ui';
import { formatPhone } from '@/lib/format';

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
        <p className="text-[15px] text-black/60">
          No saved addresses yet. Add one to skip re-entering at checkout.
        </p>
      )}

      {profile.addresses.map((a) => (
        <div
          key={a.id}
          className={cn(inset, 'p-4', a.isPrimary && 'ring-black/30')}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-medium text-black">
                  {a.label}
                </span>
                {a.isPrimary && (
                  <span className="inline-flex items-center gap-1.5 rounded-[2px] bg-black/[0.05] px-2 py-1 font-mono text-[12px] leading-none text-black">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#D5A850]" />
                    Primary
                  </span>
                )}
              </div>
              <p className="text-[15px] text-black/80">{a.fullName}</p>
              <p className="mt-0.5 text-[14px] text-black/60">
                {formatAddressOneLine(a)}
              </p>
              {a.phone && (
                <p className="mt-0.5 text-[14px] tabular-nums text-black/60">{formatPhone(a.phone)}</p>
              )}
            </div>
            <div className="flex flex-shrink-0 gap-2">
              {!a.isPrimary && (
                <button
                  type="button"
                  onClick={() => setPrimaryAddress(a.id)}
                  className={cn(btnSmall, 'bg-white text-black ring-black/15 hover:bg-black/[0.04]')}
                >
                  Set primary
                </button>
              )}
              <button
                type="button"
                onClick={() => removeAddress(a.id)}
                className={cn(btnSmall, 'bg-white text-red-800 ring-red-700/30 hover:bg-red-50')}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}

      {adding ? (
        <div className={cn(inset, 'p-4 md:p-5')}>
          <p className="mb-4 text-[16px] font-medium text-black">New address</p>
          <div className="grid gap-4">
            <Field
              label="Label"
              value={draft.label}
              onChange={(v) => setDraft({ ...draft, label: v })}
              placeholder="Home / Work / Mom's"
            />
            <Field
              label="Full name"
              value={draft.fullName}
              onChange={(v) => setDraft({ ...draft, fullName: v })}
            />
            <Field
              label="Street address"
              value={draft.line1}
              onChange={(v) => setDraft({ ...draft, line1: v })}
            />
            <Field
              label="Apt / suite (optional)"
              value={draft.line2}
              onChange={(v) => setDraft({ ...draft, line2: v })}
            />
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
              <Field
                label="City"
                value={draft.city}
                onChange={(v) => setDraft({ ...draft, city: v })}
              />
              <div>
                <label className={fieldLabel}>State</label>
                <select
                  aria-label="State"
                  value={draft.state}
                  onChange={(e) => setDraft({ ...draft, state: e.target.value })}
                  className={cn(field, 'appearance-none')}
                >
                  <option value="">—</option>
                  {SERVICEABLE_STATES.map((st) => (
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
                placeholder="07512"
              />
            </div>
            <Field
              label="Phone (optional)"
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
                Make this my primary shipping address
              </span>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={saveDraft}
                className={btnPrimary}
              >
                Save address
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
          + Add another address
        </button>
      )}
    </div>
  );
}


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
      <label className={fieldLabel}>{label}</label>
      <input
        aria-label={label}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={field}
      />
    </div>
  );
}
