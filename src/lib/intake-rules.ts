/**
 * The intake's hard rules, shared by the wizard and the server.
 *
 * The wizard enforces these as the visitor types; intake-actions enforces them
 * again on submit, because a server action can be called without the wizard.
 * One copy, so the two can never disagree about who is knocked out.
 */
import {
  CONDITIONS_STEP,
  CONSENT_ITEMS,
  GOAL_STEP,
  MEDS_STEP,
  PRODUCT_SCREEN_FIELD,
  RECOMMEND_STEP,
  STATE_NAMES,
  STEPS,
  passwordValid,
  productScreeningStep,
  type Cond,
  type Field,
  type Step,
} from '@/lib/intakeSchema';
import {
  ALL_CATEGORY_STEPS,
  MEDIA_STEPS,
  PRODUCT_CATEGORY,
  buildCategorySteps,
} from '@/lib/intake-categories';

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

/**
 * First three ZIP digits for each served state (USPS ranges). A state missing
 * here is not checked. ponytail: prefix ranges, not a ZIP database; border
 * oddities like Fishers Island NY (063xx) fail — add a range if one turns up.
 */
const ZIP3: Record<string, [number, number][]> = {
  NJ: [[70, 89]],
  NY: [[5, 5], [100, 149]],
  PA: [[150, 196]],
  MI: [[480, 499]],
};

/** A 5-digit ZIP that belongs to the chosen state (wizard and server). */
export function zipInState(zip: unknown, state: unknown): boolean {
  if (typeof zip !== 'string' || !/^\d{5}$/.test(zip)) return false;
  const ranges = typeof state === 'string' ? ZIP3[state] : undefined;
  const p = Number(zip.slice(0, 3));
  return !ranges || ranges.some(([lo, hi]) => p >= lo && p <= hi);
}

const REQUIRED_MSG: Record<string, string> = {
  state: 'Choose your state.',
  email: 'Enter your email.',
  first_name: 'Enter your first name.',
  last_name: 'Enter your last name.',
  dob: 'Enter your date of birth.',
  zip: 'Enter your ZIP code.',
  phone: 'Enter your mobile number.',
  sex: 'Choose one.',
  height: 'Set your height.',
  weight_lb: 'Enter your weight.',
  consents: 'Tick the required acknowledgement to continue.',
  account: 'Choose a password that meets every rule, and type it twice.',
};

/**
 * What is wrong with one visible answer, in words for the visitor, or null.
 * Knockouts are not problems: they pass here and stop at the knockout screen.
 */
export function fieldProblem(f: Field, v: unknown, answers: Record<string, unknown>): string | null {
  if (f.type === 'height') {
    return typeof answers.height_ft === 'number' && typeof answers.height_in === 'number'
      ? null
      : REQUIRED_MSG.height;
  }
  if (!fieldComplete(f, v)) return REQUIRED_MSG[f.id] ?? 'Please answer this question.';
  if (typeof v !== 'string' || v === '') return null;
  const t = v.trim();
  if (f.type === 'date') {
    const age = ageFromDob(t);
    // Date rolls 02/31 over to March, so compare the round trip.
    if (age === null || new Date(`${t}T00:00:00Z`).toISOString().slice(0, 10) !== t) {
      return 'Enter a real date as MM/DD/YYYY.';
    }
    if (age < 0) return 'That date is in the future.';
    if (age > 120) return 'Check the year.';
    return null;
  }
  if (f.type === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? null : 'Enter a valid email address.';
  }
  if (f.id === 'first_name' || f.id === 'last_name') {
    return /^\p{L}[\p{L}\p{M} '’-]*$/u.test(t) ? null : 'Use letters, spaces, hyphens or apostrophes.';
  }
  if (f.id === 'phone') {
    return /^[2-9]\d{9}$/.test(t) ? null : 'Enter a 10-digit US mobile number.';
  }
  if (f.id === 'zip') {
    if (!/^\d{5}$/.test(t)) return 'Enter a 5-digit ZIP code.';
    const st = answers.state;
    if (!zipInState(t, st)) return `That ZIP doesn't look like it's in ${STATE_NAMES[String(st)] ?? 'your state'}.`;
  }
  return null;
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

/** One condition: the answer (or any of a multi-select's answers) is one of the values. */
function condHolds(c: Cond, answers: Record<string, unknown>): boolean {
  const v = answers[c.field];
  return (Array.isArray(v) ? v : [v]).some((x) => c.values.includes(String(x)));
}

/** Every condition holds (none = shown). */
export function condsHold(c: Cond | Cond[] | undefined, answers: Record<string, unknown>): boolean {
  return !c || (Array.isArray(c) ? c : [c]).every((x) => condHolds(x, answers));
}

/** showIf: shown when every condition holds, against all the answers so far. */
export function fieldVisible(f: Field, answers: Record<string, unknown>): boolean {
  return condsHold(f.showIf, answers);
}

/** Step-level showIf (all) and showIfAny (at least one). */
export function stepVisible(s: Step, answers: Record<string, unknown>): boolean {
  return condsHold(s.showIf, answers) && (!s.showIfAny || s.showIfAny.some((c) => condHolds(c, answers)));
}

/** Ids of the fields actually asked: visible fields of visible steps. */
export function visibleFieldIds(steps: Step[], answers: Record<string, unknown>): Set<string> {
  return new Set(
    steps.filter((s) => stepVisible(s, answers)).flatMap((s) => s.fields.filter((f) => fieldVisible(f, answers)).map((f) => f.id)),
  );
}

/** Every answer id the assessment can ask, in any category. */
const ASSESSMENT_FIELD_IDS = new Set(
  [...STEPS, GOAL_STEP, CONDITIONS_STEP, MEDS_STEP, RECOMMEND_STEP, ...buildCategorySteps(Object.keys(PRODUCT_CATEGORY))]
    .flatMap((s) => s.fields.map((f) => f.id)),
);

/**
 * Drop answers to questions that are no longer asked (a hidden step or field,
 * another category after the goal changed, a product screen for a product no
 * longer offered), so a stale answer is never stored or trips a knockout.
 * `keep` are ids on file that the steps deliberately skip. Mutates `answers`.
 */
export function pruneHidden(steps: Step[], answers: Record<string, unknown>, keep: string[] = []): void {
  // Hiding one answer can hide another that depends on it; repeat until stable.
  for (let changed = true; changed; ) {
    changed = false;
    const shown = visibleFieldIds(steps, answers);
    for (const id of Object.keys(answers)) {
      const asked = ASSESSMENT_FIELD_IDS.has(id) || id.startsWith(PRODUCT_SCREEN_FIELD);
      if (asked && !shown.has(id) && !keep.includes(id)) {
        delete answers[id];
        changed = true;
      }
    }
  }
}

/** The first problem with the visible answers of these steps, or null (the server's check). */
export function stepsProblem(steps: Step[], answers: Record<string, unknown>): string | null {
  for (const s of steps) {
    if (!stepVisible(s, answers)) continue;
    for (const f of s.fields) {
      if (fieldVisible(f, answers) && fieldProblem(f, answers[f.id], answers)) {
        return 'Some answers are missing. Go back and complete every step.';
      }
    }
  }
  return null;
}

/** The products an intake covers: the one it was filed for, plus any assessed since. */
export function intakeProductIds(a: Record<string, unknown>): string[] {
  const ids = [a.requestedProductId, ...(Array.isArray(a.assessedProductIds) ? a.assessedProductIds : [])];
  return [...new Set(ids.filter((x): x is string => typeof x === 'string' && Object.prototype.hasOwnProperty.call(PRODUCT_CATEGORY, x)))];
}

/**
 * Uploads still owed after checkout: a photo step with a required photo
 * missing, or (optional) lab results they said they have, until the portal
 * visit has been sent once.
 */
export function outstandingMedia(a: Record<string, unknown>): Step[] {
  const cats = new Set(intakeProductIds(a).map((id) => PRODUCT_CATEGORY[id]));
  return MEDIA_STEPS.filter(({ step, category }) => {
    if (!cats.has(category) || !stepVisible(step, a)) return false;
    const f = step.fields[0];
    return f.type === 'photo-upload' ? !fieldComplete(f, a[f.id]) : !a.mediaCompletedAt && !(Array.isArray(a[f.id]) && (a[f.id] as unknown[]).length);
  }).map(({ step }) => step);
}

/** Hair/skin photos still owed: the doctor queue's "Photos pending". */
export const photosPending = (a: Record<string, unknown>) =>
  outstandingMedia(a).some((s) => s.fields.some((f) => f.type === 'photo-upload'));

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
  if (f.type === 'recommendation') {
    const c = v as { productId?: unknown; cadence?: unknown };
    return typeof c?.productId === 'string' && typeof c.cadence === 'string';
  }
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
    const shown = stepVisible(step, answers);
    for (const f of step.fields) {
      if (!shown || !fieldVisible(f, answers)) {
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

/** Who-you-are answers a member has on file and is not asked again (health questions always are). */
const ON_FILE_IDS = ['state', 'first_name', 'last_name', 'dob', 'zip', 'phone', 'sex', 'weight_lb', 'consents'];

/** The answer ids a member's assessment skips, from their newest intake. */
export function knownAnswerIds(onFile: Record<string, unknown>): string[] {
  const has = (k: string) => onFile[k] !== undefined && onFile[k] !== null && onFile[k] !== '';
  return [
    ...ON_FILE_IDS.filter((k) => has(k) && (k !== 'consents' || consentsComplete(onFile[k]))),
    ...(typeof onFile.height_ft === 'number' ? ['height'] : []),
  ];
}
