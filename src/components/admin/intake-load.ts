import 'server-only';
import { formatDate as fmtDate } from '@/lib/format';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ALL_CATEGORY_STEPS } from '@/lib/intake-categories';
import { categoryAnswers } from '@/lib/prescriber-view';
import { doctorThreadStatuses, signIntakeMedia } from '@/lib/clinical-review';
import type { IntakeRowView } from '@/components/admin/AdminIntakeQueue';

/**
 * Applications for the admin index (`/queue`) and its record page
 * (`/queue/[id]`). Same query and mapping for both. Caller checks the role and
 * that Supabase is configured; this throws on a failed query.
 */

/** Category fields are shown labelled (with photos) above; keep them out of the raw list. */
const CATEGORY_FIELD_IDS = new Set(ALL_CATEGORY_STEPS.flatMap((s) => s.fields.map((f) => f.id)));

function flattenAnswers(answers: unknown): { label: string; value: string }[] {
  if (!answers || typeof answers !== 'object') return [];
  return Object.entries(answers as Record<string, unknown>)
    .filter(([label]) => !CATEGORY_FIELD_IDS.has(label))
    .map(([label, value]) => ({
      label,
      value: value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value),
    }));
}

const text = (a: Record<string, unknown>, k: string) => (typeof a[k] === 'string' ? (a[k] as string).trim() : '');

/** Every completed intake (not the half-finished `awaiting_visit` ones). */
const LISTED = ['submitted', 'in_review', 'needs_info', 'approved', 'declined'] as const;

export async function loadIntakes(id?: string): Promise<IntakeRowView[]> {
  const db = createSupabaseAdminClient();
  let q = db
    .from('intake_submissions')
    .select('id, user_id, case_id, email, status, answers, created_at')
    .in('status', [...LISTED]);
  q = id ? q.eq('id', id) : q.order('created_at', { ascending: false }).limit(500);
  const { data, error } = await q;
  if (error) throw error;
  if (!data) return [];

  const threads = await doctorThreadStatuses(data.map((r) => r.user_id ?? ''));
  const intakes: IntakeRowView[] = data.map((r) => {
    const a = (r.answers && typeof r.answers === 'object' ? r.answers : {}) as Record<string, unknown>;
    return {
      id: r.id,
      userId: r.user_id,
      caseId: r.case_id,
      email: r.email,
      name: [text(a, 'first_name'), text(a, 'last_name')].filter(Boolean).join(' '),
      state: text(a, 'state'),
      status: r.status,
      submittedAt: fmtDate(r.created_at),
      createdAt: r.created_at,
      // Arrived from a product card, or from the generic Apply Now?
      source: a.requestedProduct ? String(a.requestedProduct) : null,
      answers: flattenAnswers(r.answers),
      categories: categoryAnswers(r.answers),
      thread: r.user_id ? threads[r.user_id] : undefined,
    };
  });
  // Photos and labs are only shown on the record page; the index never signs them.
  if (id) await signIntakeMedia(intakes.flatMap((i) => i.categories));
  return intakes;
}
