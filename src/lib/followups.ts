/**
 * Who is due which follow-up email. Pure: no I/O, no server imports, so the
 * recovery cron and a plain assertion script share the same rules.
 *
 * Four sequences, each a handful of steps timed from an anchor:
 *   lead   — email given, no account yet            (marketing)
 *   plan   — assessment done, no order placed       (marketing)
 *   photos — order placed, hair/skin photos missing (transactional)
 *   pay    — approved, card failed, pay link open   (transactional)
 *
 * The cron runs once a day, so a step goes out on the first run at least N
 * hours after the anchor. Only the latest step whose time has come is sent
 * (a run that finds someone 80 hours in sends the last reminder, not the
 * first), and nobody gets more than one follow-up in any 20-hour window.
 */

export type Stage = 'pay' | 'photos' | 'plan' | 'lead';

/** Hours after the anchor at which each step becomes due. */
export const STEP_HOURS: Record<Stage, readonly number[]> = {
  lead: [1, 24, 72],
  plan: [2, 24, 72],
  photos: [2, 24, 72],
  pay: [24, 72],
};

/** Stages that need consent and honour unsubscribe. */
export const MARKETING: readonly Stage[] = ['lead', 'plan'];

/** Most urgent first: when one person is due two, this one wins the day. */
const PRIORITY: readonly Stage[] = ['pay', 'photos', 'plan', 'lead'];

/** Older than this and the sequence is over, sent or not. */
export const MAX_AGE_HOURS = 14 * 24;

/** One email per person per day; 20h so a cron that fires a few minutes early is not blocked. */
export const GAP_HOURS = 20;

/** What the email step shows next to the consent box. Stored verbatim on the lead. */
export const LEAD_CONSENT = {
  version: 'v1',
  text: 'We’ll email you about your assessment. You can unsubscribe anytime.',
} as const;

export interface Candidate {
  stage: Stage;
  /** Whatever the sequence is about: lead id, intake id, order id. */
  ref: string;
  email: string;
  /** When the clock started (ISO). */
  anchor: string;
  /** Highest step already sent, -1 when none. */
  lastStep: number;
  unsubscribed?: boolean;
  suspended?: boolean;
  /** They moved forward: account made, order placed, photos in, paid, cancelled. */
  movedOn?: boolean;
  /** Pay stage: the link stops working here (ISO). */
  expiresAt?: string;
}

const HOUR = 3_600_000;

/** Why this candidate must not be emailed, or null. */
export function blocked(c: Candidate, now: number): string | null {
  if (c.movedOn) return 'moved_on';
  if (c.suspended) return 'suspended';
  if (c.unsubscribed && MARKETING.includes(c.stage)) return 'unsubscribed';
  if (c.expiresAt && Date.parse(c.expiresAt) <= now) return 'expired';
  return null;
}

/** The step to send now, or null. */
export function dueStep(c: Candidate, now: number): number | null {
  const hours = (now - Date.parse(c.anchor)) / HOUR;
  if (!(hours >= 0) || hours > MAX_AGE_HOURS) return null;
  let due = -1;
  STEP_HOURS[c.stage].forEach((t, i) => {
    if (hours >= t) due = i;
  });
  return due > c.lastStep ? due : null;
}

/**
 * Everyone due an email this run, most urgent first, at most one per person.
 * `mailedRecently` holds addresses that got a follow-up inside GAP_HOURS.
 */
export function selectDue<T extends Candidate>(
  candidates: T[],
  now: number,
  mailedRecently: Iterable<string>,
): { c: T; step: number }[] {
  const taken = new Set(Array.from(mailedRecently, (e) => e.toLowerCase()));
  const out: { c: T; step: number }[] = [];
  const sorted = [...candidates].sort(
    (a, b) => PRIORITY.indexOf(a.stage) - PRIORITY.indexOf(b.stage),
  );
  for (const c of sorted) {
    const email = c.email.trim().toLowerCase();
    if (!email || taken.has(email) || blocked(c, now)) continue;
    const step = dueStep(c, now);
    if (step === null) continue;
    taken.add(email);
    out.push({ c, step });
  }
  return out;
}
