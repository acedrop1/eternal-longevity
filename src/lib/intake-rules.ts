/**
 * The intake's hard rules, shared by the wizard and the server.
 *
 * The wizard enforces these as the visitor types; intake-actions enforces them
 * again on submit, because a server action can be called without the wizard.
 * One copy, so the two can never disagree about who is knocked out.
 */
import {
  CONSENT_ITEMS,
  STEPS,
  productScreeningStep,
  type Field,
} from '@/lib/intakeSchema';

/** Whole years since an ISO yyyy-mm-dd date, or null if it isn't one. */
export function ageFromDob(v: unknown): number | null {
  // Date parses loose numeric strings — new Date('0210') is year 210, not
  // NaN — so a half-typed birth date would compute an age of ~1800 and
  // walk straight through the gate. Demand a complete ISO date.
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const dob = new Date(`${v}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

/** The knockout one answer fires, if any. */
export function fieldKnockout(f: Field, v: unknown): string | null {
  if (!f.knockoutOn || v === undefined || v === null || v === '') return null;
  if (f.knockoutOn.values.includes(String(v))) return f.knockoutOn.key;
  if (f.type === 'date' && f.knockoutOn.values.includes('under18')) {
    const age = ageFromDob(v);
    if (age !== null && age < 18) return f.knockoutOn.key;
  }
  return null;
}

/** Every field that can knock someone out, across both phases of the intake. */
const KNOCKOUT_FIELDS: Field[] = [
  ...STEPS,
  productScreeningStep({ name: '', contraindications: [] }),
]
  .flatMap((s) => s.fields)
  .filter((f) => f.knockoutOn);

/** The first knockout anywhere in these answers, or null. */
export function firstKnockout(answers: Record<string, unknown>): string | null {
  for (const f of KNOCKOUT_FIELDS) {
    const k = fieldKnockout(f, answers[f.id]);
    if (k) return k;
  }
  return null;
}

/** Every required acknowledgement is ticked. */
export function consentsComplete(v: unknown): boolean {
  const consents = (v ?? {}) as Record<string, unknown>;
  return CONSENT_ITEMS.filter((c) => c.required).every((c) => consents[c.id] === true);
}
