'use server';

/**
 * A signed-in member's unfinished assessment, saved as they answer so the
 * portal can offer "Continue your Finasteride visit" and /start resumes on the
 * screen they left. One per entry point: a product id, a category key, or
 * 'general'. Deleted when that assessment is submitted.
 *
 * Guests are not saved here: until they sign in there is no account to hold
 * health answers (the browser keeps only their contact details, see
 * IntakeWizard). Signing in mid-assessment starts saving from that screen.
 */

import { getSession } from '@/lib/auth-server';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import type { Json } from '@/lib/database.types';

export interface AssessmentDraft {
  entry: string;
  answers: Record<string, unknown>;
  screen: string | null;
  progress: number;
  updatedAt: string;
}

const KEEP_DAYS = 30;
const ENTRY = /^[a-z0-9-]{1,40}$/;
const MAX_BYTES = 64 * 1024;
// Never kept: the password, and consents (confirmed fresh at submit).
const SKIP = new Set(['account', 'password', 'consents']);

// ponytail: demo mode (no database) keeps drafts in this server process only.
const demoDrafts = new Map<string, AssessmentDraft>();

async function memberId(): Promise<string | null> {
  const user = await getSession();
  return user?.role === 'member' ? user.id : null;
}

const fresh = (iso: string) => Date.now() - new Date(iso).getTime() < KEEP_DAYS * 864e5;

/**
 * When they last submitted an assessment. A draft saved before that is spent:
 * the save racing the submit (an answer's debounced save landing after the
 * delete) must not bring back a "continue" card for a visit already sent.
 */
async function lastSubmittedAt(db: ReturnType<typeof createSupabaseAdminClient>, userId: string): Promise<string> {
  const { data } = await db
    .from('intake_submissions')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.created_at ?? '';
}

export async function saveAssessmentDraftAction(
  entry: string,
  answers: Record<string, unknown>,
  screen: string | null,
  progress: number,
): Promise<void> {
  const userId = await memberId();
  if (!userId || !ENTRY.test(entry) || !answers || typeof answers !== 'object') return;
  const kept = Object.fromEntries(Object.entries(answers).filter(([k]) => !SKIP.has(k)));
  if (JSON.stringify(kept).length > MAX_BYTES) return;
  const row = {
    entry,
    answers: kept,
    screen: typeof screen === 'string' ? screen.slice(0, 120) : null,
    progress: Math.max(0, Math.min(100, Math.round(Number(progress) || 0))),
    updatedAt: new Date().toISOString(),
  };

  if (!supabaseAdminConfigured()) {
    demoDrafts.set(`${userId}:${entry}`, row);
    return;
  }
  const db = createSupabaseAdminClient();
  const { error } = await db.from('assessment_drafts').upsert(
    {
      user_id: userId,
      entry,
      answers: kept as unknown as Json,
      screen: row.screen,
      progress: row.progress,
      updated_at: row.updatedAt,
    },
    { onConflict: 'user_id,entry' },
  );
  if (error) console.error('[drafts] save failed:', error.message);
}

/** The caller's draft for one entry point, if recent. */
export async function getAssessmentDraft(entry: string): Promise<AssessmentDraft | null> {
  const userId = await memberId();
  if (!userId || !ENTRY.test(entry)) return null;
  if (!supabaseAdminConfigured()) {
    const d = demoDrafts.get(`${userId}:${entry}`);
    return d && fresh(d.updatedAt) ? d : null;
  }
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('assessment_drafts')
    .select('entry, answers, screen, progress, updated_at')
    .eq('user_id', userId)
    .eq('entry', entry)
    .maybeSingle();
  if (!data || !fresh(data.updated_at) || data.updated_at <= (await lastSubmittedAt(db, userId))) return null;
  return {
    entry: data.entry,
    answers: (data.answers ?? {}) as Record<string, unknown>,
    screen: data.screen,
    progress: data.progress,
    updatedAt: data.updated_at,
  };
}

/** The caller's recent drafts, newest first, for the portal. */
export async function listAssessmentDrafts(): Promise<AssessmentDraft[]> {
  const userId = await memberId();
  if (!userId) return [];
  if (!supabaseAdminConfigured()) {
    return [...demoDrafts.entries()]
      .filter(([k, d]) => k.startsWith(`${userId}:`) && fresh(d.updatedAt))
      .map(([, d]) => d)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('assessment_drafts')
    .select('entry, screen, progress, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(5);
  const since = await lastSubmittedAt(db, userId);
  return (data ?? [])
    .filter((d) => fresh(d.updated_at) && d.updated_at > since)
    .map((d) => ({ entry: d.entry, answers: {}, screen: d.screen, progress: d.progress, updatedAt: d.updated_at }));
}

/** Submitted: the draft for that entry point is done with. */
export async function deleteAssessmentDraft(userId: string, entry: string): Promise<void> {
  // Called from the submit action with the session's own id; refuse anyone else's.
  if ((await memberId()) !== userId || !ENTRY.test(entry)) return;
  if (!supabaseAdminConfigured()) {
    demoDrafts.delete(`${userId}:${entry}`);
    return;
  }
  const db = createSupabaseAdminClient();
  await db.from('assessment_drafts').delete().eq('user_id', userId).eq('entry', entry);
}
