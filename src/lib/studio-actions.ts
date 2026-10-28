'use server';

import { cookies } from 'next/headers';
import { allow, LIMITS } from '@/lib/rate-limit';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  BUCKET,
  SESSION_COOKIE,
  SESSION_SECONDS,
  cleanItem,
  ensureBucket,
  getItem,
  loadStored,
  logEvent,
  putNote,
  newCode,
  putItem,
  putStored,
  removeItem,
  requireAdmin,
  requireStudio,
  sessionValue,
  studioConfigured,
  studioLive,
  userForCode,
  withUrls,
} from '@/lib/studio';
import {
  MEMBER_KINDS,
  VERDICTS,
  canAssign,
  type GridBrand,
  type GridPage,
  type GuideSection,
  type Role,
  type StudioComment,
  type StudioFile,
  type StudioItem,
  type StudioSettings,
  type StudioUser,
  STATUS_LABEL,
  isFinished,
} from '@/lib/studio-types';

/** What changed between two versions of an item, in plain words for the Activity log. */
function changes(prev: StudioItem | null, next: StudioItem): { action: string; detail?: string }[] {
  if (!prev) return [{ action: `added a ${next.kind}`, detail: next.assignee ? `for ${next.assignee}` : undefined }];
  const out: { action: string; detail?: string }[] = [];
  if (prev.status !== next.status) {
    const done = isFinished(next.status);
    out.push({
      action: done
        ? next.status === 'posted'
          ? 'marked posted'
          : 'marked done'
        : isFinished(prev.status)
          ? 'reopened'
          : next.status === 'review'
            ? 'sent for review'
            : `moved to ${STATUS_LABEL[next.status]}`,
    });
  }
  const newFiles = next.files.filter((f) => !prev.files.some((p) => p.path === f.path));
  if (newFiles.length) out.push({ action: `uploaded ${newFiles.length} file${newFiles.length > 1 ? 's' : ''} to`, detail: newFiles.map((f) => f.name).join(', ') });
  const newLinks = next.links.filter((l) => !prev.links.some((p) => p.url === l.url));
  if (newLinks.length) out.push({ action: `added ${newLinks.length} link${newLinks.length > 1 ? 's' : ''} to`, detail: newLinks.map((l) => l.url).join(' ') });
  if (prev.due !== next.due) out.push({ action: 'changed the date on', detail: `${prev.due ?? 'none'} → ${next.due ?? 'none'}` });
  if (prev.assignee !== next.assignee) out.push({ action: 'reassigned', detail: `${prev.assignee || 'anyone'} → ${next.assignee || 'anyone'}` });
  if (prev.flagged !== next.flagged) out.push({ action: next.flagged ? 'flagged as urgent' : 'unflagged' });
  if (prev.title !== next.title || prev.notes !== next.notes) out.push({ action: 'edited the instructions on' });
  return out;
}

async function logChanges(prev: StudioItem | null, next: StudioItem, by: string): Promise<void> {
  for (const c of changes(prev, next)) await logEvent({ by, action: c.action, itemId: next.id, itemTitle: next.title, detail: c.detail });
}

type Result<T = null> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong.' };
  }
}

const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/studio' };

async function requireManager(): Promise<StudioUser> {
  const u = await requireStudio();
  if (!canAssign(u.role)) throw new Error('Only Adam or Mo can do that.');
  return u;
}

export async function unlockStudio(code: string): Promise<Result> {
  if (!studioConfigured()) return { ok: false, error: 'The studio is not set up yet.' };
  if (!(await allow('studio', LIMITS.login))) return { ok: false, error: 'Too many tries. Wait five minutes.' };
  const user = await userForCode(String(code ?? ''));
  if (!user) return { ok: false, error: 'That code is not right, or it was turned off.' };
  (await cookies()).set(SESSION_COOKIE, sessionValue(user), { ...cookieBase, maxAge: SESSION_SECONDS });
  try {
    const s = await loadStored();
    await putStored({ ...s, users: s.users.map((u) => (u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u)) });
  } catch {
    // Last-seen is a nicety; the sign-in already worked.
  }
  await logEvent({ by: user.name, action: 'signed in' });
  return { ok: true, data: null };
}

export async function lockStudio(): Promise<Result> {
  (await cookies()).delete({ name: SESSION_COOKIE, path: '/studio' });
  return { ok: true, data: null };
}

/*
 * Who may change what. Adam and Mo issue work: any field, any item. Content
 * (Jacob) works what he is given: on an item someone else made he can move it
 * along (never to Approved or Changes asked), attach files and links, and leave
 * notes. He can add his own posts, stories and inspo, and edit those freely
 * short of a verdict.
 */
function allowedEdit(raw: Partial<StudioItem>, prev: StudioItem | null, user: StudioUser): Partial<StudioItem> {
  if (canAssign(user.role)) return raw;
  const verdictKept = (s: unknown) => (VERDICTS.includes(s as never) && s !== prev?.status ? (prev?.status ?? 'todo') : s);
  if (!prev) {
    if (!MEMBER_KINDS.includes(raw.kind as never)) throw new Error('Tasks and shoots come from Adam or Mo.');
    return { ...raw, status: verdictKept(raw.status) as StudioItem['status'] };
  }
  if (prev.createdBy === user.name) {
    if (!MEMBER_KINDS.includes(raw.kind as never)) raw = { ...raw, kind: prev.kind };
    return { ...raw, status: verdictKept(raw.status) as StudioItem['status'] };
  }
  return { ...prev, status: verdictKept(raw.status) as StudioItem['status'], files: raw.files, links: raw.links, platforms: raw.platforms, cover: raw.cover };
}

export async function saveStudioItem(raw: Partial<StudioItem>): Promise<Result<StudioItem>> {
  return run(async () => {
    const user = await requireStudio();
    const prev = raw.id ? await getItem(raw.id) : null;
    const item = cleanItem(allowedEdit(raw, prev, user), prev, user.name);
    await putItem(item);
    await logChanges(prev, item, user.name);
    return (await withUrls([item]))[0];
  });
}

export async function deleteStudioItem(id: string): Promise<Result> {
  return run(async () => {
    const user = await requireStudio();
    const item = await getItem(id);
    if (item && !canAssign(user.role) && item.createdBy !== user.name) throw new Error('Only Adam or Mo can delete this.');
    if (item?.files.length && studioLive()) {
      await createSupabaseAdminClient().storage.from(BUCKET).remove(item.files.map((f) => f.path));
    }
    await removeItem(id);
    if (item) await logEvent({ by: user.name, action: 'deleted', itemTitle: item.title });
    return null;
  });
}

/** A note, optionally with a verdict that moves the item along. Appended on the server so two people at once both land. */
export async function commentOnStudioItem(
  id: string,
  body: string,
  verdict?: 'approved' | 'changes' | 'review',
): Promise<Result<StudioItem>> {
  return run(async () => {
    const user = await requireStudio();
    if ((verdict === 'approved' || verdict === 'changes') && !canAssign(user.role)) throw new Error('Only Adam or Mo can approve.');
    const item = await getItem(id);
    if (!item) throw new Error('That item was deleted.');
    const text = String(body ?? '').trim().slice(0, 4000);
    if (text || verdict === 'approved' || verdict === 'changes') {
      const c: StudioComment = { id: crypto.randomUUID(), by: user.name, at: new Date().toISOString(), body: text };
      if (verdict === 'approved' || verdict === 'changes') c.verdict = verdict;
      item.comments = [...item.comments, c];
    }
    const before = item.status;
    if (verdict) item.status = verdict;
    item.updatedAt = new Date().toISOString();
    await putItem(item);
    const said = text ? text.slice(0, 280) : undefined;
    if (verdict === 'approved') await logEvent({ by: user.name, action: 'approved', itemId: id, itemTitle: item.title, detail: said });
    else if (verdict === 'changes') await logEvent({ by: user.name, action: 'asked for changes on', itemId: id, itemTitle: item.title, detail: said });
    else if (verdict === 'review' && before !== 'review') await logEvent({ by: user.name, action: 'sent for review', itemId: id, itemTitle: item.title, detail: said });
    else if (said) await logEvent({ by: user.name, action: 'left a note on', itemId: id, itemTitle: item.title, detail: said });
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

/** Reuse a picture already in the studio on a new item: copied into that item's own folder. */
export async function studioCopyFile(from: StudioFile, toItemId: string): Promise<Result<StudioFile>> {
  return run(async () => {
    await requireStudio();
    if (!studioLive()) throw new Error('Copying works on the live site, not this local copy.');
    if (!/^[\w-]{8,64}$/.test(toItemId) || !/^[\w-]{3,64}\/[\w.-]{1,160}$/.test(String(from?.path))) throw new Error('Bad file.');
    const path = `${toItemId}/${Date.now()}-${from.path.split('/')[1].replace(/^\d+-/, '')}`;
    const store = createSupabaseAdminClient().storage.from(BUCKET);
    const { error } = await store.copy(from.path, path);
    if (error) throw new Error(error.message);
    const { data } = await store.createSignedUrl(path, 12 * 60 * 60);
    return { path, name: String(from.name ?? '').slice(0, 200), type: String(from.type ?? '').slice(0, 100), size: Number(from.size) || 0, url: data?.signedUrl };
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

export async function saveStudioSettings(next: Partial<Pick<StudioSettings, 'targets' | 'guide'>>): Promise<Result<StudioSettings>> {
  return run(async () => {
    await requireManager();
    const prev = await loadStored();
    const n = (v: unknown, d: number) => Math.max(0, Math.min(50, Math.round(Number(v)))) || d;
    return putStored({
      ...prev,
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
    });
  });
}

/** The Grid tab: anyone signed in sets a page's handle and its screenshots of live posts. */
export async function saveStudioGrid(brand: GridBrand, page: GridPage): Promise<Result<GridPage>> {
  return run(async () => {
    const user = await requireStudio();
    if (brand !== 'longevity' && brand !== 'hair') throw new Error('Bad page.');
    const prev = await loadStored();
    const handle = String(page.handle ?? '').trim().replace(/^@/, '').slice(0, 30);
    if (handle && !/^[\w.]+$/.test(handle)) throw new Error('A handle is letters, numbers, dots and underscores only.');
    const ours = (f: unknown): f is StudioFile =>
      typeof (f as StudioFile)?.path === 'string' && (f as StudioFile).path.startsWith(`grid-${brand}/`) && !(f as StudioFile).path.includes('..');
    const file = (f: StudioFile) => ({ path: f.path, name: String(f.name ?? '').slice(0, 120), type: String(f.type ?? '').slice(0, 60), size: Number(f.size) || 0 });
    const live = (Array.isArray(page.live) ? page.live : []).filter(ours).slice(0, 90).map(file);
    const t = (v: unknown, max: number) => String(v ?? '').slice(0, max);
    const next: GridPage = {
      handle,
      live,
      name: t(page.name, 60),
      bio: t(page.bio, 300),
      link: t(page.link, 100),
      posts: t(page.posts, 12),
      followers: t(page.followers, 12),
      following: t(page.following, 12),
      avatar: ours(page.avatar) ? file(page.avatar) : null,
    };
    await putStored({ ...prev, grid: { ...prev.grid, [brand]: next } });
    if (live.length !== prev.grid[brand].live.length || handle !== prev.grid[brand].handle) {
      await logEvent({ by: user.name, action: `updated the ${handle ? '@' + handle : brand} grid`, detail: `${live.length} live posts` });
    }
    return next;
  });
}

/** Adam's or Mo's note on someone's week, for the end-of-week report. */
export async function saveReportNote(person: string, weekStart: string, text: string): Promise<Result> {
  return run(async () => {
    await requireManager();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !/^[\w .'-]{1,40}$/.test(person)) throw new Error('Bad report.');
    await putNote(person, weekStart, String(text ?? '').slice(0, 8000));
    return null;
  });
}

/* ---------- team (admin only) ---------- */

const ROLES: Role[] = ['admin', 'manager', 'member'];

/** Adds a teammate and issues their code. The code is returned once and never stored. */
export async function addStudioUser(name: string, role: Role): Promise<Result<{ settings: StudioSettings; code: string }>> {
  return run(async () => {
    await requireAdmin();
    const clean = String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!clean) throw new Error('Add a name.');
    const s = await loadStored();
    if (s.users.some((u) => u.name.toLowerCase() === clean.toLowerCase())) throw new Error(`${clean} is already on the team.`);
    const { code, hash, salt } = newCode();
    await logEvent({ by: (await requireAdmin()).name, action: `added ${clean} to the team and issued a code` });
    const user = { id: crypto.randomUUID(), name: clean, role: ROLES.includes(role) ? role : 'member', active: true, lastLogin: null, ver: 0, hash, salt };
    return { settings: await putStored({ ...s, users: [...s.users, user] }), code };
  });
}

/** A new code for someone; their old code stops working and they are signed out. */
export async function issueStudioCode(id: string): Promise<Result<{ settings: StudioSettings; code: string }>> {
  return run(async () => {
    await requireAdmin();
    const s = await loadStored();
    if (!s.users.some((u) => u.id === id)) throw new Error('That person is not on the team.');
    const { code, hash, salt } = newCode();
    const users = s.users.map((u) => (u.id === id ? { ...u, hash, salt, ver: u.ver + 1 } : u));
    await logEvent({ by: (await requireAdmin()).name, action: `issued a new code for ${s.users.find((u) => u.id === id)?.name}` });
    return { settings: await putStored({ ...s, users }), code };
  });
}

/** Role, access on/off, or removal. Never leaves the studio without an active admin. */
export async function updateStudioUser(
  id: string,
  change: { role?: Role; active?: boolean; remove?: boolean },
): Promise<Result<StudioSettings>> {
  return run(async () => {
    const me = await requireAdmin();
    const s = await loadStored();
    const target = s.users.find((u) => u.id === id);
    if (!target) throw new Error('That person is not on the team.');
    if (id === me.id) throw new Error('You can’t change your own access.');
    let users = change.remove
      ? s.users.filter((u) => u.id !== id)
      : s.users.map((u) =>
          u.id !== id
            ? u
            : {
                ...u,
                role: change.role && ROLES.includes(change.role) ? change.role : u.role,
                active: change.active ?? u.active,
                // Switching someone off or changing their role signs them out.
                ver: u.ver + 1,
              },
        );
    if (!users.some((u) => u.active && u.role === 'admin')) throw new Error('Keep at least one admin.');
    await logEvent({
      by: me.name,
      action: change.remove
        ? `removed ${target.name} from the team`
        : change.active === false
          ? `turned off ${target.name}’s access`
          : change.active === true
            ? `turned on ${target.name}’s access`
            : `made ${target.name} ${change.role}`,
    });
    users = users.slice(0, 30);
    return putStored({ ...s, users });
  });
}

/** Bulk add (the starter plan, or a backup): items run through the same cleaning as a single save. */
export async function importStudio(json: string): Promise<Result<number>> {
  return run(async () => {
    const user = await requireManager();
    const parsed = JSON.parse(String(json)) as { items?: Partial<StudioItem>[]; settings?: Partial<StudioSettings> };
    const items = (parsed.items ?? []).slice(0, 500);
    for (const raw of items) {
      const prev = raw.id ? await getItem(raw.id) : null;
      const item = cleanItem(raw, prev, typeof raw.createdBy === 'string' ? raw.createdBy.slice(0, 40) : user.name);
      // Imported notes from the team thread keep their authors and times.
      if (!prev && Array.isArray(raw.comments)) {
        item.comments = raw.comments.slice(0, 50).map((c) => ({
          id: crypto.randomUUID(),
          by: String(c.by ?? user.name).slice(0, 40),
          at: typeof c.at === 'string' && !Number.isNaN(Date.parse(c.at)) ? c.at : new Date().toISOString(),
          body: String(c.body ?? '').slice(0, 4000),
          ...(c.verdict === 'approved' || c.verdict === 'changes' ? { verdict: c.verdict } : {}),
        }));
      }
      await putItem(item);
    }
    if (parsed.settings) {
      const r = await saveStudioSettings({ targets: parsed.settings.targets, guide: parsed.settings.guide });
      if (!r.ok) throw new Error(r.error);
    }
    return items.length;
  });
}
