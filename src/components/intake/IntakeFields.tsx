'use client';

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Field, CONSENT_ITEMS, PASSWORD_RULES } from '@/lib/intakeSchema';

interface FieldRendererProps {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}

// Same field treatment as the contact form. 16px text keeps iOS from zooming.
const inputBase =
  'w-full min-w-0 rounded-[2px] bg-black/[0.04] px-4 py-3 text-[16px] text-black ring-1 ring-black/10 placeholder:text-black/35 transition-shadow focus:outline-none focus:ring-2 focus:ring-black';

// Choice rows. Radios invert to black; checkboxes take a heavy ring and a
// filled box, so the selected state never rests on colour alone.
const tileBase =
  'flex min-h-[48px] w-full items-center gap-3 rounded-[4px] px-4 py-3 text-left transition-[box-shadow,background-color,color] duration-200';
const tileIdle = 'bg-black/[0.04] text-black ring-1 ring-black/10 hover:ring-black/30';
const labelSmall = 'mb-2 block font-mono text-[13px] text-black/70';

function CheckBox({ on, className }: { on: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid h-5 w-5 flex-shrink-0 place-items-center rounded-[2px] transition-colors',
        on ? 'bg-black text-white' : 'bg-white ring-1 ring-black/25',
        className
      )}
    >
      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  );
}

/** (201) 887-8847 as you type. Stored digits are unaffected by the mask. */
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  switch (field.type) {
    case 'multi-select':
      return (
        <div role="group" aria-label={field.label || 'Select all that apply'} className="grid gap-2 sm:grid-cols-2">
          {field.options?.map((opt) => {
            const selected = Array.isArray(value) && (value as string[]).includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  const arr = Array.isArray(value) ? [...(value as string[])] : [];
                  if (selected) onChange(arr.filter((v) => v !== opt.value));
                  else onChange([...arr, opt.value]);
                }}
                className={cn(tileBase, selected ? 'bg-white text-black ring-2 ring-black' : tileIdle)}
              >
                <CheckBox on={selected} />
                <span className="text-[15px] leading-snug md:text-[16px]">{opt.label}</span>
              </button>
            );
          })}
        </div>
      );

    case 'single-select':
      return (
        <div role="radiogroup" aria-label={field.label || 'Choose an option'} className="grid gap-2">
          {field.options?.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(opt.value)}
                className={cn(tileBase, selected ? 'bg-black text-white ring-2 ring-black' : tileIdle)}
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid h-5 w-5 flex-shrink-0 place-items-center rounded-full transition-colors',
                    selected ? 'ring-2 ring-white' : 'bg-white ring-1 ring-black/25'
                  )}
                >
                  {selected && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                </span>
                <span className="text-[15px] leading-snug md:text-[16px]">{opt.label}</span>
              </button>
            );
          })}
        </div>
      );

    case 'pill-grid':
      return (
        <div
          role="radiogroup"
          aria-label={field.label || 'Choose an option'}
          className={cn(
            'grid gap-2 sm:grid-cols-3',
            (field.options?.length ?? 0) === 3 &&
              (field.options ?? []).every((o) => o.label.length <= 10)
              ? 'grid-cols-3'
              : 'grid-cols-2'
          )}
        >
          {field.options?.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(opt.value)}
                className={cn(
                  'inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-[4px] px-2 py-3 text-[15px] font-medium transition-[box-shadow,background-color,color] duration-200',
                  selected ? 'bg-black text-white ring-2 ring-black' : tileIdle
                )}
              >
                {selected && <Check aria-hidden className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={3} />}
                {opt.label}
              </button>
            );
          })}
        </div>
      );

    case 'text-short': {
      const isPhone = field.id === 'phone';
      const isZip = field.id === 'zip';
      return (
        <input
          id={`fld-${field.id}`}
          aria-label={field.label || undefined}
          type={isPhone ? 'tel' : 'text'}
          inputMode={isPhone || isZip ? 'numeric' : undefined}
          autoComplete={
            isPhone
              ? 'tel'
              : isZip
                ? 'postal-code'
                : field.id === 'first_name'
                  ? 'given-name'
                  : field.id === 'last_name'
                    ? 'family-name'
                    : undefined
          }
          maxLength={isPhone ? 14 : isZip ? 5 : undefined}
          value={
            isPhone
              ? formatPhone((value as string) ?? '')
              : ((value as string) ?? '')
          }
          onChange={(e) =>
            onChange(
              isPhone
                ? e.target.value.replace(/\D/g, '').slice(0, 10)
                : isZip
                  ? e.target.value.replace(/\D/g, '').slice(0, 5)
                  : e.target.value
            )
          }
          placeholder={field.placeholder}
          className={inputBase}
        />
      );
    }

    case 'text-long':
      return (
        <textarea
          id={`fld-${field.id}`}
          aria-label={field.label || undefined}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={cn(inputBase, 'resize-none')}
        />
      );

    case 'date': {
      const raw = String(value ?? '');
      // Stored complete as ISO; stored as loose digits while still being typed.
      const digits = /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? raw.slice(5, 7) + raw.slice(8, 10) + raw.slice(0, 4)
        : raw.replace(/\D/g, '').slice(0, 8);
      const shown =
        digits.length <= 2
          ? digits
          : digits.length <= 4
            ? `${digits.slice(0, 2)}/${digits.slice(2)}`
            : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
      return (
        <input
          id={`fld-${field.id}`}
          aria-label={field.label || undefined}
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          maxLength={10}
          value={shown}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(0, 8);
            onChange(
              d.length === 8
                ? `${d.slice(4)}-${d.slice(0, 2)}-${d.slice(2, 4)}`
                : d
            );
          }}
          placeholder="MM / DD / YYYY"
          className={inputBase}
        />
      );
    }

    case 'number':
      return (
        <input
          id={`fld-${field.id}`}
          aria-label={field.label || undefined}
          type="number"
          value={(value as number | string) ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            const n = v === '' ? '' : Number(v);
            // Knockout under 18 for age field
            if (field.knockoutOn?.values.includes('under18') && typeof n === 'number') {
              if (n > 0 && n < 18) onChange('under18');
              else onChange(n);
            } else {
              onChange(n);
            }
          }}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          className={inputBase}
        />
      );

    case 'slider': {
      const num = (value as number) ?? Math.floor(((field.min ?? 0) + (field.max ?? 10)) / 2);
      return (
        <div>
          <input
            id={`fld-${field.id}`}
            aria-label={field.label || undefined}
            type="range"
            min={field.min}
            max={field.max}
            value={num}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-black"
          />
          <div className="mt-2 flex items-center justify-between font-mono text-[12px] text-black/55">
            <span>Poor</span>
            <span className="text-[16px] font-medium tabular-nums text-black">{num}</span>
            <span>Excellent</span>
          </div>
        </div>
      );
    }

    case 'height': {
      // Total inches. Starts unset ("slide to set") so a default can never be
      // submitted as someone's real height; − / + give exact 1-inch steps.
      const min = field.min ?? 48;
      const max = field.max ?? 90;
      const set = typeof value === 'number';
      const inches = set ? (value as number) : Math.round((min + max) / 2);
      const clamp = (n: number) => Math.min(max, Math.max(min, n));
      const pct = ((inches - min) / (max - min)) * 100;
      const step = (d: number) => onChange(clamp(inches + d));
      return (
        <div className="rounded-[4px] bg-[#F2F2F0] px-4 pb-5 pt-4 md:px-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label="One inch shorter"
              onClick={() => step(set ? -1 : 0)}
              className="grid h-11 w-11 flex-none place-items-center rounded-full bg-white text-[20px] leading-none ring-1 ring-black/15 transition-colors hover:bg-black/[0.04]"
            >
              −
            </button>
            <p className="text-center" aria-live="polite">
              <span
                className={cn('block font-display font-normal tabular-nums', set ? 'text-black' : 'text-black/35')}
                style={{ fontSize: 'clamp(2.4rem, 3vw + 1.2rem, 3.25rem)', fontStretch: '75%', lineHeight: 1 }}
              >
                {set ? `${Math.floor(inches / 12)}′ ${inches % 12}″` : '—'}
              </span>
              <span className="mt-1 block font-mono text-[12px] text-black/55">
                {set ? `${Math.round(inches * 2.54)} cm` : 'Slide to set'}
              </span>
            </p>
            <button
              type="button"
              aria-label="One inch taller"
              onClick={() => step(set ? 1 : 0)}
              className="grid h-11 w-11 flex-none place-items-center rounded-full bg-white text-[20px] leading-none ring-1 ring-black/15 transition-colors hover:bg-black/[0.04]"
            >
              +
            </button>
          </div>
          <input
            id={`fld-${field.id}`}
            aria-label="Height in inches"
            aria-valuetext={set ? `${Math.floor(inches / 12)} feet ${inches % 12} inches` : 'Not set'}
            type="range"
            min={min}
            max={max}
            step={1}
            value={inches}
            onChange={(e) => onChange(Number(e.target.value))}
            className="el-range mt-5 w-full"
            style={{ ['--pct' as string]: `${set ? pct : 0}%` }}
          />
          <div className="mt-2 flex justify-between font-mono text-[12px] text-black/50">
            <span>{`${Math.floor(min / 12)}′ ${min % 12}″`}</span>
            <span>{`${Math.floor(max / 12)}′ ${max % 12}″`}</span>
          </div>
        </div>
      );
    }

    case 'email':
      return (
        <input
          id={`fld-${field.id}`}
          aria-label={field.label || undefined}
          type="email"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputBase}
        />
      );

    case 'password':
      return (
        <input
          id={`fld-${field.id}`}
          aria-label={field.label || undefined}
          type="password"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputBase}
        />
      );

    case 'consent-stack': {
      const consents = (value as Record<string, boolean>) ?? {};
      const allChecked = CONSENT_ITEMS.every((c) => consents[c.id]);

      const acceptAll = () => {
        const next: Record<string, boolean> = {};
        for (const c of CONSENT_ITEMS) next[c.id] = true;
        onChange(next);
      };

      const clearAll = () => {
        const next: Record<string, boolean> = {};
        for (const c of CONSENT_ITEMS) next[c.id] = false;
        onChange(next);
      };

      return (
        <div className="space-y-3">
          {/* Accept-all toggle row */}
          <button
            type="button"
            onClick={allChecked ? clearAll : acceptAll}
            aria-pressed={allChecked}
            className={cn(
              'flex min-h-[56px] w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[4px] px-4 py-3.5 text-left transition-colors',
              allChecked ? 'bg-black text-white hover:bg-black/85' : 'bg-white text-black ring-2 ring-black hover:bg-black/[0.04]'
            )}
          >
            <span className="flex items-center gap-3">
              <span
                aria-hidden
                className={cn(
                  'grid h-5 w-5 flex-shrink-0 place-items-center rounded-[2px]',
                  allChecked ? 'bg-white text-black' : 'ring-2 ring-black'
                )}
              >
                {allChecked && <Check className="h-3.5 w-3.5" strokeWidth={3.5} />}
              </span>
              <span className="text-[15px] font-medium md:text-[16px]">
                {allChecked ? 'All accepted' : 'Accept all'}
              </span>
            </span>
            <span className={cn('font-mono text-[12px]', allChecked ? 'text-white/70' : 'text-black/55')}>
              {allChecked ? 'Tap to clear' : 'Agree to everything below'}
            </span>
          </button>

          {/* Individual consent rows */}
          {CONSENT_ITEMS.map((c) => {
            const checked = !!consents[c.id];
            return (
              <button
                key={c.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => onChange({ ...consents, [c.id]: !checked })}
                className={cn(
                  tileBase,
                  'items-start py-4',
                  checked ? 'bg-white text-black ring-2 ring-black' : tileIdle
                )}
              >
                <CheckBox on={checked} className="mt-0.5" />
                <span className="text-[14px] leading-relaxed text-black/85 md:text-[15px]">
                  {c.label}
                  {c.required && (
                    <span className="ml-1.5 font-mono text-[12px] text-black/50">
                      * <span className="sr-only">required</span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    case 'account-creation': {
      const acc = (value as { password?: string; confirm?: string }) ?? {};
      return (
        <div className="space-y-4">
          <div>
            <label htmlFor={`fld-${field.id}`} className={labelSmall}>Password</label>
            <input
              id={`fld-${field.id}`}
              aria-label={field.label || undefined}
              type="password"
              value={acc.password ?? ''}
              onChange={(e) => onChange({ ...acc, password: e.target.value })}
              placeholder="Create a password"
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor={`fld-${field.id}-confirm`} className={labelSmall}>Confirm password</label>
            <input
              id={`fld-${field.id}-confirm`}
              aria-label={field.label || undefined}
              type="password"
              value={acc.confirm ?? ''}
              onChange={(e) => onChange({ ...acc, confirm: e.target.value })}
              placeholder="Same password"
              className={inputBase}
            />
          </div>

          {/* Live password checklist — unmet rules turn red once typing starts. */}
          <ul className="space-y-2">
            {PASSWORD_RULES.map((r) => {
              const pw = acc.password ?? '';
              const met = r.test(pw);
              const idle = pw.length === 0;
              return (
                <li
                  key={r.id}
                  className={cn(
                    'flex items-center gap-2 font-mono text-[13px] transition-colors',
                    idle ? 'text-black/50' : met ? 'text-emerald-700' : 'text-red-700'
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'grid h-4 w-4 flex-none place-items-center rounded-[2px] ring-1',
                      idle ? 'ring-black/25' : met ? 'bg-emerald-700/10 ring-emerald-700/50' : 'bg-red-700/10 ring-red-700/50'
                    )}
                  >
                    {!idle && (met ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />)}
                  </span>
                  {r.label}
                </li>
              );
            })}
            {(acc.confirm ?? '') !== '' && acc.confirm !== acc.password && (
              <li role="alert" className="flex items-center gap-2 font-mono text-[13px] text-red-700">
                <span aria-hidden className="grid h-4 w-4 flex-none place-items-center rounded-[2px] bg-red-700/10 ring-1 ring-red-700/50">
                  <X className="h-3 w-3" strokeWidth={3} />
                </span>
                Passwords match
              </li>
            )}
          </ul>
        </div>
      );
    }

    case 'id-upload':
    case 'optional-upload':
      return (
        <UploadField value={value as File | string | null} onChange={onChange} />
      );

    default:
      return null;
  }
}

function UploadField({
  value,
  onChange,
}: {
  value: File | string | null;
  onChange: (v: unknown) => void;
}) {
  const hasFile = value instanceof File || typeof value === 'string';
  const fileName = value instanceof File ? value.name : typeof value === 'string' ? value : '';

  return (
    <label
      className={cn(
        'flex w-full cursor-pointer flex-col items-center justify-center rounded-[4px] border px-6 py-10 text-center transition-colors focus-within:ring-2 focus-within:ring-black',
        hasFile ? 'border-2 border-black bg-white' : 'border-dashed border-black/25 bg-black/[0.04] hover:border-black/50'
      )}
    >
      <input
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
        }}
      />
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-black/70">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      {hasFile ? (
        <>
          <div className="mb-1 max-w-full truncate text-[15px] font-medium text-black">{fileName}</div>
          <div className="font-mono text-[12px] text-black/55">Tap to replace</div>
        </>
      ) : (
        <>
          <div className="mb-1 text-[15px] font-medium text-black">Tap to upload</div>
          <div className="font-mono text-[12px] text-black/55">PDF or image · up to 10MB</div>
        </>
      )}
    </label>
  );
}
