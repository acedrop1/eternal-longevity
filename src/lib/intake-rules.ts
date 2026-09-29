/**
 * The intake's hard rules, shared by the wizard and the server.
 *
 * The wizard enforces these as the visitor types; intake-actions enforces them
 * again on submit, because a server action can be called without the wizard.
 * One copy, so the two can never disagree about who is knocked out.
 */
import {
  CONSENT_ITEMS,
  PRODUCT_SCREEN_FIELD,
  STEPS,
  passwordValid,
  productScreeningStep,
  type Field,
  type Step,
} from '@/lib/intakeSchema';
import { ALL_CATEGORY_STEPS } from '@/lib/intake-categories';

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
  ...ALL_CATEGORY_STEPS,
]
  .flatMap((s) => s.fields)
  .filter((f) => f.knockoutOn);

/** The first knockout anywhere in these answers, or null. */
export function firstKnockout(answers: Record<string, unknown>): string | null {
  for (const f of KNOCKOUT_FIELDS) {
    const k = fieldKnockout(f, answers[f.id]);
    if (k) return k;
  }
  // Second and later products' screens: product_contraindications__<productId>.
  const screen = KNOCKOUT_FIELDS.find((f) => f.id === PRODUCT_SCREEN_FIELD);
  for (const [key, v] of Object.entries(answers)) {
    if (!screen || !key.startsWith(`${PRODUCT_SCREEN_FIELD}__`)) continue;
    const k = fieldKnockout(screen, v);
    if (k) return k;
  }
  return null;
}

/** showIf: shown when the named field (same step) holds one of the values. */
export function fieldVisible(f: Field, answers: Record<string, unknown>): boolean {
  if (!f.showIf) return true;
  const v = answers[f.showIf.field];
  const vals = Array.isArray(v) ? v : [v];
  return vals.some((x) => f.showIf!.values.includes(String(x)));
}

/** Storage paths held by a photo-upload / file-upload answer; null if malformed. */
export function mediaPaths(f: Field, v: unknown): string[] | null {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return null;
  if (f.type === 'file-upload') {
    return v.length <= MAX_FILES && v.every((p) => typeof p === 'string') ? (v as string[]) : null;
  }
  const slots = new Set((f.slots ?? []).map((s) => s.id));
  const ok = v.every(
    (x) => x && typeof x === 'object' && slots.has((x as { slot?: string }).slot ?? '') && typeof (x as { path?: unknown }).path === 'string',
  );
  return ok ? (v as { path: string }[]).map((x) => x.path) : null;
}

export const MAX_FILES = 3;

/** A path the caller may reference: inside their own <uid>/ folder, no traversal. */
export function ownMediaPath(path: string, uid: string): boolean {
  return path.startsWith(`${uid}/`) && !path.split('/').includes('..') && path.length < 300;
}

/** A required answer is present (and, for the special types, actually complete). */
export function fieldComplete(f: Field, v: unknown): boolean {
  if (f.type === 'photo-upload') {
    const filled = new Set(Array.isArray(v) ? v.map((x) => (x as { slot?: string })?.slot) : []);
    const slots = f.slots ?? [];
    if (!slots.filter((s) => s.required).every((s) => filled.has(s.id))) return false;
    return !f.required || filled.size > 0;
  }
  if (!f.required) return true;
  if (v === null || v === undefined || v === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  if (f.type === 'consent-stack') return consentsComplete(v);
  if (f.type === 'account-creation') {
    const acc = (v as { password?: string; confirm?: string }) ?? {};
    return !!acc.password && passwordValid(acc.password) && acc.password === acc.confirm;
  }
  if (f.type === 'id-upload') return v instanceof File || typeof v === 'string';
  return true;
}

/**
 * The server's check of a submitted visit: every visible required answer is
 * there, hidden answers are dropped, and every photo or file sits in the
 * caller's own storage folder. Returns an error message, or null. Mutates
 * `answers` to remove answers to hidden fields.
 */
export function visitProblem(steps: Step[], answers: Record<string, unknown>, uid: string): string | null {
  for (const step of steps) {
    for (const f of step.fields) {
      if (!fieldVisible(f, answers)) {
        delete answers[f.id];
        continue;
      }
      if (!fieldComplete(f, answers[f.id])) return 'Some answers are missing. Go back and complete every step.';
    }
  }
  // Every media answer anywhere in the payload, asked in this visit or not.
  const media = [...steps, ...ALL_CATEGORY_STEPS]
    .flatMap((s) => s.fields)
    .filter((f) => f.type === 'photo-upload' || f.type === 'file-upload');
  for (const f of media) {
    const paths = mediaPaths(f, answers[f.id]);
    if (!paths || !paths.every((p) => ownMediaPath(p, uid))) return 'A photo or file could not be verified. Please upload it again.';
  }
  return null;
}

/** Every required acknowledgement is ticked. */
export function consentsComplete(v: unknown): boolean {
  const consents = (v ?? {}) as Record<string, unknown>;
  return CONSENT_ITEMS.filter((c) => c.required).every((c) => consents[c.id] === true);
}
