'use server';

import { cookies } from 'next/headers';
import { allow, LIMITS } from '@/lib/rate-limit';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  BUCKET,
  SESSION_COOKIE,
  SESSION_SECONDS,
  WHO_COOKIE,
  cleanItem,
  codeMatches,
  ensureBucket,
  getItem,
  loadSettings,
  putItem,
  putSettings,
  removeItem,
  requireStudio,
  sessionValue,
  studioConfigured,
  studioLive,
  withUrls,
} from '@/lib/studio';
import type { GuideSection, StudioComment, StudioItem, StudioSettings } from '@/lib/studio-types';

type Result<T = null> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong.' };
  }
}

const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/studio' };

export async function unlockStudio(code: string): Promise<Result> {
  if (!studioConfigured()) return { ok: false, error: 'The studio code is not set up yet.' };
  if (!(await allow('studio', LIMITS.login))) return { ok: false, error: 'Too many tries. Wait five minutes.' };
  if (!codeMatches(String(code ?? ''))) return { ok: false, error: 'That code is not right.' };
  (await cookies()).set(SESSION_COOKIE, sessionValue(), { ...cookieBase, maxAge: SESSION_SECONDS });
  return { ok: true, data: null };
}

export async function lockStudio(): Promise<Result> {
  const jar = await cookies();
  jar.delete({ name: SESSION_COOKIE, path: '/studio' });
  return { ok: true, data: null };
}

export async function setStudioName(name: string): Promise<Result> {
  return run(async () => {
    await requireStudio();
    const people = (await loadSettings()).people;
    if (!people.includes(name)) throw new Error('Pick a name from the list.');
    (await cookies()).set(WHO_COOKIE, name, { ...cookieBase, maxAge: 365 * 24 * 60 * 60 });
    return null;
  });
}

export async function saveStudioItem(raw: Partial<StudioItem>): Promise<Result<StudioItem>> {
  return run(async () => {
    const who = await requireStudio();
    const prev = raw.id ? await getItem(raw.id) : null;
    const item = cleanItem(raw, prev, who);
    await putItem(item);
    return (await withUrls([item]))[0];
  });
}

export async function deleteStudioItem(id: string): Promise<Result> {
  return run(async () => {
    await requireStudio();
    const item = await getItem(id);
    if (item?.files.length && studioLive()) {
      await createSupabaseAdminClient().storage.from(BUCKET).remove(item.files.map((f) => f.path));
    }
    await removeItem(id);
    return null;
  });
}

/** A comment, optionally with a verdict that moves the item along. Appended on the server so two people commenting at once both land. */
export async function commentOnStudioItem(
  id: string,
  body: string,
  verdict?: 'approved' | 'changes' | 'review',
): Promise<Result<StudioItem>> {
  return run(async () => {
    const who = await requireStudio();
    const item = await getItem(id);
    if (!item) throw new Error('That item was deleted.');
    const text = String(body ?? '').trim().slice(0, 4000);
    if (text || verdict === 'approved' || verdict === 'changes') {
      const c: StudioComment = { id: crypto.randomUUID(), by: who, at: new Date().toISOString(), body: text };
      if (verdict === 'approved' || verdict === 'changes') c.verdict = verdict;
      item.comments = [...item.comments, c];
    }
    if (verdict) item.status = verdict;
    item.updatedAt = new Date().toISOString();
    await putItem(item);
    return (await withUrls([item]))[0];
  });
}

/** Where the browser uploads one file: a one-time signed slot in the private bucket. */
export async function studioUploadSlot(itemId: string, name: string): Promise<Result<{ path: string; token: string }>> {
  return run(async () => {
    await requireStudio();
    if (!studioLive()) throw new Error('Uploads work on the live site, not this local copy.');
    if (!/^[\w-]{8,64}$/.test(itemId)) throw new Error('Bad item.');
    await ensureBucket();
    const ext = (String(name).match(/\.([a-z0-9]{1,8})$/i)?.[1] ?? 'bin').toLowerCase();
    const base = String(name).replace(/\.[^.]*$/, '').replace(/[^\w-]+/g, '-').slice(0, 60) || 'file';
    const path = `${itemId}/${Date.now()}-${base}.${ext}`;
    const { data, error } = await createSupabaseAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message ?? 'Upload could not start.');
    return { path, token: data.token };
  });
}

/** Signed read links for files just uploaded. */
export async function studioFileUrls(paths: string[]): Promise<Result<Record<string, string>>> {
  return run(async () => {
    await requireStudio();
    if (!studioLive() || !paths.length) return {};
    const { data } = await createSupabaseAdminClient().storage.from(BUCKET).createSignedUrls(paths.slice(0, 60), 12 * 60 * 60);
    return Object.fromEntries((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl]] : [])));
  });
}

export async function saveStudioSettings(next: Partial<StudioSettings>): Promise<Result<StudioSettings>> {
  return run(async () => {
    await requireStudio();
    const prev = await loadSettings();
    const people = Array.isArray(next.people)
      ? [...new Set(next.people.map((p) => String(p).trim().slice(0, 40)).filter(Boolean))].slice(0, 20)
      : prev.people;
    const n = (v: unknown, d: number) => Math.max(0, Math.min(50, Math.round(Number(v)))) || d;
    const s: StudioSettings = {
      people: people.length ? people : prev.people,
      targets: next.targets
        ? { posts: n(next.targets.posts, prev.targets.posts), stories: n(next.targets.stories, prev.targets.stories) }
        : prev.targets,
      guide: Array.isArray(next.guide)
        ? next.guide.slice(0, 60).map((g: GuideSection) => ({
            id: /^[\w-]{1,64}$/.test(String(g.id)) ? String(g.id) : crypto.randomUUID(),
            title: String(g.title ?? '').slice(0, 120),
            body: String(g.body ?? '').slice(0, 8000),
          }))
        : prev.guide,
    };
    await putSettings(s);
    return s;
  });
}

/** Bulk add (the starter plan, or a backup): items run through the same cleaning as a single save. */
export async function importStudio(json: string): Promise<Result<number>> {
  return run(async () => {
    const who = await requireStudio();
    const parsed = JSON.parse(String(json)) as { items?: Partial<StudioItem>[]; settings?: Partial<StudioSettings> };
    const items = (parsed.items ?? []).slice(0, 500);
    for (const raw of items) {
      const prev = raw.id ? await getItem(raw.id) : null;
      const item = cleanItem(raw, prev, raw.createdBy && typeof raw.createdBy === 'string' ? raw.createdBy.slice(0, 40) : who);
      // Imported notes from the team thread keep their authors and times.
      if (!prev && Array.isArray(raw.comments)) {
        item.comments = raw.comments.slice(0, 50).map((c) => ({
          id: crypto.randomUUID(),
          by: String(c.by ?? who).slice(0, 40),
          at: typeof c.at === 'string' && !Number.isNaN(Date.parse(c.at)) ? c.at : new Date().toISOString(),
          body: String(c.body ?? '').slice(0, 4000),
          ...(c.verdict === 'approved' || c.verdict === 'changes' ? { verdict: c.verdict } : {}),
        }));
      }
      await putItem(item);
    }
    if (parsed.settings) {
      const r = await saveStudioSettings(parsed.settings);
      if (!r.ok) throw new Error(r.error);
    }
    return items.length;
  });
}
