'use client';

import { useState } from 'react';
import {
  adminSavePrescriber,
  doctorSaveOwnDetails,
  type SettingsResult,
} from '@/lib/admin-settings-actions';
import { CREDENTIALS, type PrescriberRecord } from '@/lib/prescriberTypes';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30';
const label = 'mb-1.5 block text-[11px] tracking-wider text-foreground/60';

/**
 * The prescriber's own facts, editable by him and by an admin.
 *
 * His credential used to be typed into the end of his name and his state
 * licence was a constant in a page file, so correcting "MD" to "DO" meant a
 * code change. These print on prescriptions and on published legal pages, so
 * they belong in one editable row — and every change is written to the audit
 * trail whoever makes it.
 */
export function PrescriberForm({
  record,
  mode,
}: {
  record: PrescriberRecord;
  mode: 'admin' | 'doctor';
}) {
  const [form, setForm] = useState({
    name: record.name,
    credential: record.credential,
    npi: record.npi,
    licenseState: record.licenseState,
    licenseNumber: record.licenseNumber,
    licenseExpires: record.licenseExpires,
    phone: record.phone,
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SettingsResult | null>(null);

  const dirty =
    form.name !== record.name ||
    form.credential !== record.credential ||
    form.npi !== record.npi ||
    form.licenseState !== record.licenseState ||
    form.licenseNumber !== record.licenseNumber ||
    form.licenseExpires !== record.licenseExpires ||
    form.phone !== record.phone;

  const set = (patch: Partial<typeof form>) =>
    setForm((f) => ({ ...f, ...patch }));

  async function save() {
    if (!dirty || busy) return;
    setBusy(true);
    setResult(null);
    try {
      setResult(
        mode === 'doctor'
          ? await doctorSaveOwnDetails(form)
          : await adminSavePrescriber({ ...form, doctorId: record.id ?? '' }),
      );
    } catch {
      setResult({ ok: false, message: 'Request failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="pf-name">
            FULL NAME
          </label>
          <input
            id="pf-name"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Bader Elder"
            className={field}
          />
          <p className="mt-1.5 text-[11px] text-foreground/45">
            Without the credential — it is added from the field beside this.
          </p>
        </div>
        <div>
          <label className={label} htmlFor="pf-cred">
            CREDENTIAL
          </label>
          <select
            id="pf-cred"
            value={form.credential}
            onChange={(e) => set({ credential: e.target.value })}
            className={cn(field, 'appearance-none')}
          >
            <option value="">—</option>
            {CREDENTIALS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-foreground/45">
            Prints as {form.name || 'Name'}
            {form.credential ? `, ${form.credential}` : ''}.
          </p>
        </div>
        <div>
          <label className={label} htmlFor="pf-npi">
            NPI (10 DIGITS)
          </label>
          <input
            id="pf-npi"
            value={form.npi}
            inputMode="numeric"
            onChange={(e) =>
              set({ npi: e.target.value.replace(/\D/g, '').slice(0, 10) })
            }
            placeholder="1234567890"
            className={field}
          />
        </div>
        {mode === 'doctor' && (
          <div>
            <label className={label} htmlFor="pf-phone">
              MOBILE
            </label>
            <input
              id="pf-phone"
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="(201) 555-0134"
              className={field}
            />
            <p className="mt-1.5 text-[11px] text-foreground/45">
              Where a new order texts you.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <label className={label} htmlFor="pf-state">
            LICENCE STATE
          </label>
          <input
            id="pf-state"
            value={form.licenseState}
            maxLength={2}
            onChange={(e) =>
              set({ licenseState: e.target.value.toUpperCase().slice(0, 2) })
            }
            placeholder="NJ"
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="pf-lic">
            LICENCE NUMBER
          </label>
          <input
            id="pf-lic"
            value={form.licenseNumber}
            onChange={(e) => set({ licenseNumber: e.target.value })}
            placeholder="25MB11925900"
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="pf-exp">
            EXPIRES
          </label>
          <input
            id="pf-exp"
            type="date"
            value={form.licenseExpires}
            onChange={(e) => set({ licenseExpires: e.target.value })}
            className={field}
          />
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-foreground/45">
        These appear on every prescription sent to the pharmacy and on the
        published prescription policy. Every change is recorded in the audit
        trail with who made it.
      </p>

      {result && (
        <p
          className={cn(
            'mt-4 rounded-2xl border px-4 py-3 text-sm',
            result.ok
              ? 'border-accent/40 bg-accent/5 text-accent'
              : 'border-red-500/30 bg-red-500/5 text-red-300',
          )}
        >
          {result.message}
        </p>
      )}

      <div className="mt-5">
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={save}
          className={cn(
            'rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]',
            busy || !dirty
              ? 'cursor-not-allowed bg-foreground/15 text-foreground/40'
              : 'bg-accent text-black hover:bg-accent-soft',
          )}
        >
          {busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </button>
      </div>
    </div>
  );
}
