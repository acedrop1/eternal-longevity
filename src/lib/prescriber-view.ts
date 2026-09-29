/**
 * Pure helpers for the prescriber's view: category answers turned into labels,
 * and whether a patient owes the prescriber a reply. No I/O here, so the
 * doctor queue, the admin pages and the member home all read them the same
 * way (and the scratch assertion script can run them without a database).
 */
import {
  ALL_CATEGORY_STEPS,
  CATEGORY_LABEL,
  PRODUCT_CATEGORY,
  buildCategorySteps,
  type CategoryKey,
} from '@/lib/intake-categories';
import { fieldVisible } from '@/lib/intake-rules';

export interface CategoryItem {
  label: string;
  value: string;
  /** Matches the field's flagOn: the prescriber should weigh it. */
  flag: boolean;
}

export interface CategoryMedia {
  label: string;
  path: string;
  /** Short-lived signed URL, filled server-side for clinical roles only. null = unavailable. */
  url?: string | null;
}

export interface CategorySection {
  key: CategoryKey;
  title: string;
  items: CategoryItem[];
  photos: CategoryMedia[];
  files: CategoryMedia[];
}

/** Step id -> category, from the steps each category's products produce. */
const STEP_CATEGORY = new Map<string, CategoryKey>(
  (Object.keys(CATEGORY_LABEL) as CategoryKey[]).flatMap((key) =>
    buildCategorySteps(
      Object.keys(PRODUCT_CATEGORY).filter((id) => PRODUCT_CATEGORY[id] === key),
    ).map((st) => [st.id, key] as const),
  ),
);

const empty = (v: unknown) =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0);

/** Category answers grouped by category, as labels. Unanswered and hidden fields are skipped. */
export function categoryAnswers(answers: unknown): CategorySection[] {
  const a = (answers && typeof answers === 'object' ? answers : {}) as Record<string, unknown>;
  const out = new Map<CategoryKey, CategorySection>();

  for (const step of ALL_CATEGORY_STEPS) {
    const key = STEP_CATEGORY.get(step.id);
    if (!key) continue;
    for (const f of step.fields) {
      const v = a[f.id];
      if (empty(v)) continue;
      if (!fieldVisible(f, a)) continue;

      const sec =
        out.get(key) ??
        out.set(key, { key, title: CATEGORY_LABEL[key], items: [], photos: [], files: [] }).get(key)!;

      if (f.type === 'photo-upload') {
        for (const p of Array.isArray(v) ? v : []) {
          if (!p || typeof p !== 'object' || typeof p.path !== 'string') continue;
          const slot = f.slots?.find((s) => s.id === p.slot);
          sec.photos.push({
            label: (slot?.label ?? String(p.slot ?? 'Photo')).replace(/\s*\(optional\)$/i, ''),
            path: p.path,
          });
        }
        continue;
      }
      if (f.type === 'file-upload') {
        (Array.isArray(v) ? v : [])
          .filter((p): p is string => typeof p === 'string' && p !== '')
          .forEach((path, i) => sec.files.push({ label: `Lab result ${i + 1}`, path }));
        continue;
      }

      const values = (Array.isArray(v) ? v : [v]).map(String);
      const value = f.options
        ? values.map((x) => f.options!.find((o) => o.value === x)?.label ?? x).join(', ')
        : values.join(', ').trim();
      if (!value) continue;
      sec.items.push({
        label: f.label || step.heading,
        value,
        flag: !!f.flagOn?.some((x) => values.includes(x)),
      });
    }
  }
  return [...out.values()].filter((s) => s.items.length || s.photos.length || s.files.length);
}

export const categoryFlagCount = (sections: CategorySection[]) =>
  sections.reduce((n, s) => n + s.items.filter((i) => i.flag).length, 0);

/* ----------------------------- waiting on patient ------------------------ */

export interface ThreadRow {
  thread_user_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
}

export type ThreadStatus =
  | { state: 'waiting'; since: string; question: string }
  | { state: 'replied'; at: string };

/**
 * Per patient, from their 'doctor' channel: the prescriber's newest message is
 * newer than the patient's newest = waiting on patient; the patient wrote after
 * it = replied. No staff message at all = nothing to show.
 */
export function threadStatuses(rows: ThreadRow[]): Record<string, ThreadStatus> {
  const last = new Map<string, { staff?: ThreadRow; patient?: ThreadRow }>();
  for (const r of rows) {
    const e = last.get(r.thread_user_id) ?? {};
    const side = r.sender_id === r.thread_user_id ? 'patient' : 'staff';
    if (!e[side] || e[side]!.created_at < r.created_at) e[side] = r;
    last.set(r.thread_user_id, e);
  }
  const out: Record<string, ThreadStatus> = {};
  for (const [uid, { staff, patient }] of last) {
    if (!staff) continue;
    out[uid] =
      !patient || patient.created_at < staff.created_at
        ? { state: 'waiting', since: staff.created_at, question: staff.body }
        : { state: 'replied', at: patient.created_at };
  }
  return out;
}

/** "3h", "2d": coarse on purpose so server and client renders agree. */
export function ago(iso: string, now = Date.now()): string {
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m`;
  if (m < 60 * 24) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

/* ------------------------------ reply notify ----------------------------- */

export const NOTIFY_WINDOW_MS = 15 * 60 * 1000;

/**
 * Whether the newest of these patient message times should notify. Replays the
 * thread: a message notifies when 15 minutes have passed since the last one
 * that did, so it is one email per thread per 15 minutes without storing sends.
 */
export function shouldNotifyReply(patientTimes: string[]): boolean {
  const ts = patientTimes.map((t) => new Date(t).getTime()).sort((x, y) => x - y);
  let lastSent = -Infinity;
  let sentNewest = false;
  for (const t of ts) {
    sentNewest = t - lastSent >= NOTIFY_WINDOW_MS;
    if (sentNewest) lastSent = t;
  }
  return sentNewest;
}
