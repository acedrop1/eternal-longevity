'use client';

import { cn } from '@/lib/utils';
import { type Field, CONSENT_ITEMS } from '@/lib/intakeSchema';

interface FieldRendererProps {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}

const inputBase =
  'w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-base text-foreground placeholder-foreground/30 transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

export function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  switch (field.type) {
    case 'multi-select':
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {field.options?.map((opt) => {
            const selected = Array.isArray(value) && (value as string[]).includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const arr = Array.isArray(value) ? [...(value as string[])] : [];
                  if (selected) onChange(arr.filter((v) => v !== opt.value));
                  else onChange([...arr, opt.value]);
                }}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all',
                  selected
                    ? 'border-accent bg-accent/10 text-foreground'
                    : 'border-line bg-surface text-foreground/85 hover:border-foreground/30'
                )}
              >
                <span
                  className={cn(
                    'grid h-5 w-5 flex-shrink-0 place-items-center rounded-md border transition-all',
                    selected ? 'border-accent bg-accent text-background' : 'border-line bg-background'
                  )}
                >
                  {selected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className="text-sm md:text-base">{opt.label}</span>
              </button>
            );
          })}
        </div>
      );

    case 'single-select':
      return (
        <div className="grid gap-2">
          {field.options?.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all',
                  selected
                    ? 'border-accent bg-accent/10 text-foreground'
                    : 'border-line bg-surface text-foreground/85 hover:border-foreground/30'
                )}
              >
                <span
                  className={cn(
                    'grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border transition-all',
                    selected ? 'border-accent' : 'border-line'
                  )}
                >
                  {selected && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                </span>
                <span className="text-sm md:text-base">{opt.label}</span>
              </button>
            );
          })}
        </div>
      );

    case 'pill-grid':
      return (
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
          {field.options?.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  'rounded-2xl border px-4 py-3.5 text-base font-medium transition-all',
                  selected
                    ? 'border-accent bg-accent/10 text-foreground'
                    : 'border-line bg-surface text-foreground/75 hover:border-foreground/30'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );

    case 'text-short':
      return (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputBase}
        />
      );

    case 'text-long':
      return (
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={cn(inputBase, 'resize-none')}
        />
      );

    case 'number':
      return (
        <input
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
            type="range"
            min={field.min}
            max={field.max}
            value={num}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="mt-2 flex items-center justify-between text-[11px] tracking-wider text-foreground/50">
            <span>Poor</span>
            <span className="text-accent font-semibold text-base">{num}</span>
            <span>Excellent</span>
          </div>
        </div>
      );
    }

    case 'email':
      return (
        <input
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
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-all',
              allChecked
                ? 'border-accent bg-accent text-background hover:bg-accent-soft'
                : 'border-accent/60 bg-accent/5 text-foreground hover:bg-accent/10'
            )}
          >
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  'grid h-5 w-5 flex-shrink-0 place-items-center rounded-md border-2 transition-all',
                  allChecked ? 'border-background bg-background text-accent' : 'border-accent bg-background'
                )}
              >
                {allChecked && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span className="text-sm md:text-base font-semibold tracking-wide">
                {allChecked ? 'All accepted' : 'Accept all'}
              </span>
            </span>
            <span className="text-[11px] tracking-wider opacity-80">
              {allChecked ? 'TAP TO CLEAR' : 'AGREE TO EVERYTHING BELOW'}
            </span>
          </button>

          {/* Individual consent rows */}
          {CONSENT_ITEMS.map((c) => {
            const checked = !!consents[c.id];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange({ ...consents, [c.id]: !checked })}
                className={cn(
                  'flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-all',
                  checked ? 'border-accent bg-accent/5' : 'border-line bg-surface hover:border-foreground/30'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-md border transition-all',
                    checked ? 'border-accent bg-accent text-background' : 'border-line bg-background'
                  )}
                >
                  {checked && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className="text-sm text-foreground/85 leading-relaxed">
                  {c.label}
                  {c.required && <span className="ml-1.5 text-accent text-xs">*</span>}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    case 'account-creation': {
      const acc = (value as { password?: string; confirm?: string; mfa?: boolean }) ?? {};
      return (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs tracking-wider text-foreground/60">PASSWORD</label>
            <input
              type="password"
              value={acc.password ?? ''}
              onChange={(e) => onChange({ ...acc, password: e.target.value })}
              placeholder="At least 12 characters"
              className={inputBase}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs tracking-wider text-foreground/60">CONFIRM PASSWORD</label>
            <input
              type="password"
              value={acc.confirm ?? ''}
              onChange={(e) => onChange({ ...acc, confirm: e.target.value })}
              placeholder="Same password"
              className={inputBase}
            />
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...acc, mfa: !acc.mfa })}
            className={cn(
              'flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all',
              acc.mfa ? 'border-accent bg-accent/5' : 'border-line bg-surface'
            )}
          >
            <span className="text-sm text-foreground/85">Enable two-factor authentication</span>
            <span
              className={cn(
                'relative h-5 w-9 rounded-full transition-colors',
                acc.mfa ? 'bg-accent' : 'bg-foreground/15'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-transform',
                  acc.mfa ? 'translate-x-4' : 'translate-x-0.5'
                )}
              />
            </span>
          </button>
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
        'flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all',
        hasFile ? 'border-accent bg-accent/5' : 'border-line bg-surface hover:border-foreground/30'
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
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-accent">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      {hasFile ? (
        <>
          <div className="mb-1 text-sm font-semibold text-foreground">{fileName}</div>
          <div className="text-xs text-foreground/55">Tap to replace</div>
        </>
      ) : (
        <>
          <div className="mb-1 text-sm font-semibold text-foreground">Tap to upload</div>
          <div className="text-xs text-foreground/55">PDF or image · up to 10MB</div>
        </>
      )}
    </label>
  );
}
