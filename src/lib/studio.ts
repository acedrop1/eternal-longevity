import 'server-only';
import { createHash, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import {
  BRANDS,
  DEFAULT_GRID,
  DEFAULT_TARGETS,
  KINDS,
  PLATFORMS,
  STATUSES,
  type GuideSection,
  type StudioData,
  type StudioEvent,
  type StudioMiss,
  type StudioFile,
  type StudioItem,
  type StudioLink,
  type StudioSettings,
  type StudioUser,
  todayET,
} from '@/lib/studio-types';

/*
 * The content studio's gate and store.
 *
 * Gate: a personal code per teammate (below). A code sets a signed cookie
 * good for 24 hours. No STUDIO_CODE set = nobody gets in.
 *
 * Store: one `site_settings` row per item (key studio:item:<id>) plus
 * studio:settings. Service role only, so every read and write goes through
 * these server functions after the cookie check. Files live in the private
 * `studio` bucket and are read through signed links.
 * ponytail: a key-value table, fine for a few thousand items; move to real
 * tables if the studio grows past that.
 */

export const SESSION_COOKIE = 'el_studio';
export const SESSION_SECONDS = 24 * 60 * 60;
export const BUCKET = 'studio';
const PREFIX = 'studio:item:';
const SETTINGS_KEY = 'studio:settings';

/*
 * Logins: every teammate has their own code, issued by an admin from
 * Settings → Team and stored only as a salted scrypt hash. STUDIO_CODE (the
 * Vercel env var) is the owner's code and always signs in as the first admin,
 * so the owner can never be locked out. The cookie names the person and their
 * code version: issuing a new code or switching someone off signs them out.
 */

type StoredUser = Omit<StudioUser, 'hasCode'> & { hash?: string; salt?: string; ver: number };
type Stored = { users: StoredUser[]; targets: StudioSettings['targets']; guide: GuideSection[] };

function signingKey(): string | null {
  const code = process.env.STUDIO_CODE?.trim();
  return code ? createHash('sha256').update(`el-studio:${code}`).digest('hex') : null;
}

const sign = (payload: string, key: string) => createHmac('sha256', key).update(payload).digest('hex');

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function studioConfigured(): boolean {
  return signingKey() !== null;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
const normal = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');
const hashCode = (code: string, salt: string) => scryptSync(normal(code), salt, 32).toString('hex');

/** A fresh code like 7KQM-29XR (32^8, about a trillion). */
export function newCode(): { code: string; hash: string; salt: string } {
  const raw = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  const salt = randomBytes(16).toString('hex');
  return { code: `${raw.slice(0, 4)}-${raw.slice(4)}`, hash: hashCode(raw, salt), salt };
}

export const publicUser = ({ hash, salt, ver, ...u }: StoredUser): StudioUser => (void salt, void ver, { ...u, hasCode: !!hash });

function publicSettings(s: Stored): StudioSettings {
  return {
    people: s.users.filter((u) => u.active).map((u) => u.name),
    users: s.users.map(publicUser),
    targets: s.targets,
    guide: s.guide,
    grid: DEFAULT_GRID,
  };
}

/** Settings as stored, with the old name list (before logins) turned into users. */
function normalise(raw: unknown): Stored {
  const r = (raw ?? {}) as Partial<Stored> & { people?: string[] };
  const users: StoredUser[] =
    r.users ??
    (r.people ?? ['Adam', 'Jacob', 'Mo']).map((name, i) => ({
      // Stable until first saved, so a sign-in cookie still matches after the list is written.
      id: `u-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name,
      role: i === 0 ? 'admin' : name === 'Mo' ? 'manager' : 'member',
      active: true,
      lastLogin: null,
      ver: 0,
    }));
  return { users, targets: r.targets ?? DEFAULT_TARGETS, guide: r.guide ?? [] };
}

/** Who a code belongs to, or null. */
export async function userForCode(code: string): Promise<StoredUser | null> {
  const s = await loadStored();
  const owner = process.env.STUDIO_CODE?.trim();
  const h = (v: string) => createHash('sha256').update(v).digest('hex');
  if (owner && same(h(code.trim()), h(owner))) return s.users.find((u) => u.active && u.role === 'admin') ?? null;
  if (normal(code).length !== 8) return null;
  return s.users.find((u) => u.active && u.hash && u.salt && same(hashCode(code, u.salt), u.hash)) ?? null;
}

export function sessionValue(u: StoredUser): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${exp}.${u.id}.${u.ver}`;
  return `${payload}.${sign(payload, signingKey()!)}`;
}

export async function studioSession(): Promise<{ ok: boolean; user: StudioUser | null }> {
  const key = signingKey();
  const [exp, id, ver, sig] = ((await cookies()).get(SESSION_COOKIE)?.value ?? '').split('.');
  if (!key || !sig || !(Number(exp) > Date.now() / 1000) || !same(sig, sign(`${exp}.${id}.${ver}`, key))) {
    return { ok: false, user: null };
  }
  const u = (await loadStored()).users.find((x) => x.id === id);
  if (!u || !u.active || String(u.ver) !== ver) return { ok: false, user: null };
  return { ok: true, user: publicUser(u) };
}

/** Notes that someone has the studio open, at most every 5 minutes, so "last seen" is true without a fresh sign-in. */
export async function touchStudio(id: string): Promise<void> {
  try {
    const s = await loadStored();
    const u = s.users.find((x) => x.id === id);
    if (!u || (u.lastSeen && Date.now() - Date.parse(u.lastSeen) < 5 * 60_000)) return;
    await putStored({ ...s, users: s.users.map((x) => (x.id === id ? { ...x, lastSeen: new Date().toISOString() } : x)) });
  } catch {
    // Presence is a nicety.
  }
}

export async function requireStudio(): Promise<StudioUser> {
  const s = await studioSession();
  if (!s.user) throw new Error('Your studio session ended. Enter your code again.');
  return s.user;
}

export async function requireAdmin(): Promise<StudioUser> {
  const u = await requireStudio();
  if (u.role !== 'admin') throw new Error('Only an admin can do that.');
  return u;
}

/* ---------- store ---------- */

type Row = { key: string; value: unknown };
// The generated types predate site_settings.
const table = () => createSupabaseAdminClient().from('site_settings' as never);

// Local builds with no database keep data in memory.
const memory = ((globalThis as { __studio?: Map<string, unknown> }).__studio ??= new Map());

export const studioLive = () => supabaseAdminConfigured();

async function readAll(): Promise<Row[]> {
  if (!studioLive()) return [...memory].map(([key, value]) => ({ key, value }));
  const { data, error } = await table().select('key, value').like('key', 'studio:%');
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

async function write(key: string, value: unknown): Promise<void> {
  if (!studioLive()) return void memory.set(key, value);
  const { error } = await table().upsert({ key, value, updated_at: new Date().toISOString() } as never);
  if (error) throw new Error(error.message);
}

/*
 * Activity log: one row per event, keyed studio-log:<ISO time>:<random> so the
 * newest sort first and the main studio:% read never loads them.
 * ponytail: never pruned; at a few hundred events a week it stays small for years.
 */
const LOG_PREFIX = 'studio-log:';

export async function logEvent(e: Omit<StudioEvent, 'at'>): Promise<void> {
  const at = new Date().toISOString();
  try {
    await write(`${LOG_PREFIX}${at}:${randomBytes(3).toString('hex')}`, { ...e, at });
  } catch {
    // The log never blocks the work itself.
  }
}

export async function loadActivity(limit = 400): Promise<StudioEvent[]> {
  if (!studioLive()) {
    return [...memory]
      .filter(([k]) => k.startsWith(LOG_PREFIX))
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, limit)
      .map(([, v]) => v as StudioEvent);
  }
  const { data } = await table().select('value').like('key', `${LOG_PREFIX}%`).order('key', { ascending: false }).limit(limit);
  return ((data ?? []) as { value: StudioEvent }[]).map((r) => r.value);
}

export async function removeItem(id: string): Promise<void> {
  if (!studioLive()) return void memory.delete(PREFIX + id);
  const { error } = await table().delete().eq('key', PREFIX + id);
  if (error) throw new Error(error.message);
}

export async function getItem(id: string): Promise<StudioItem | null> {
  if (!studioLive()) return (memory.get(PREFIX + id) as StudioItem) ?? null;
  const { data } = await table().select('value').eq('key', PREFIX + id).maybeSingle();
  return ((data as { value?: StudioItem } | null)?.value as StudioItem) ?? null;
}

export async function putItem(item: StudioItem): Promise<void> {
  await write(PREFIX + item.id, item);
}

export async function loadStored(): Promise<Stored> {
  if (!studioLive()) return normalise(memory.get(SETTINGS_KEY));
  const { data, error } = await table().select('value').eq('key', SETTINGS_KEY).maybeSingle();
  if (error) throw new Error(error.message);
  return normalise((data as { value?: unknown } | null)?.value);
}

/*
 * The Grid's pages live in their own row: settings is rewritten on every sign-in
 * and presence tick, and an older copy of the app would drop fields it doesn't know.
 */
const GRID_KEY = 'studio:grid';

export async function loadGrid(): Promise<StudioSettings['grid']> {
  if (!studioLive()) return { ...DEFAULT_GRID, ...(memory.get(GRID_KEY) as object) };
  const { data } = await table().select('value').eq('key', GRID_KEY).maybeSingle();
  return { ...DEFAULT_GRID, ...((data as { value?: object } | null)?.value ?? {}) };
}

export async function putGrid(grid: StudioSettings['grid']): Promise<void> {
  await write(GRID_KEY, grid);
}

export async function putStored(s: Stored): Promise<StudioSettings> {
  await write(SETTINGS_KEY, s);
  return publicSettings(s);
}

const MISSES_KEY = 'studio:misses';
const NOTE_PREFIX = 'studio:note:';

/**
 * Every assigned item whose due day ended unfinished (or that was finished after
 * it) is written down the first time anyone opens the studio afterwards. The
 * record keeps the original due date, so moving the date later can't hide it.
 */
async function recordMisses(items: StudioItem[], stored: unknown): Promise<StudioMiss[]> {
  const misses = { ...((stored as Record<string, StudioMiss> | undefined) ?? {}) };
  const today = todayET();
  let added = false;
  for (const i of items) {
    if (i.kind === 'inspo' || !i.due || !i.assignee) continue;
    const late = i.completedOn ? i.completedOn > i.due : i.due < today;
    const key = `${i.id}:${i.due}`;
    if (!late || misses[key]) continue;
    misses[key] = { key, itemId: i.id, title: i.title, assignee: i.assignee, brand: i.brand, kind: i.kind, due: i.due, firstSeen: new Date().toISOString() };
    added = true;
  }
  if (added) await write(MISSES_KEY, misses).catch(() => {});
  return Object.values(misses);
}

export async function putNote(person: string, weekStart: string, text: string): Promise<void> {
  await write(`${NOTE_PREFIX}${person}:${weekStart}`, text);
}

export async function loadStudio(withActivity = false): Promise<StudioData> {
  const rows = await readAll();
  const items = rows.filter((r) => r.key.startsWith(PREFIX)).map((r) => r.value as StudioItem);
  const settings = await gridUrls({
    ...publicSettings(normalise(rows.find((r) => r.key === SETTINGS_KEY)?.value)),
    grid: { ...DEFAULT_GRID, ...(rows.find((r) => r.key === GRID_KEY)?.value as Partial<StudioSettings['grid']>) },
  });
  const misses = await recordMisses(items, rows.find((r) => r.key === MISSES_KEY)?.value);
  const notes = Object.fromEntries(rows.filter((r) => r.key.startsWith(NOTE_PREFIX)).map((r) => [r.key.slice(NOTE_PREFIX.length), String(r.value ?? '')]));
  return {
    items: await withUrls(items),
    settings,
    activity: withActivity ? await loadActivity() : [],
    misses: withActivity ? misses : [],
    notes: withActivity ? notes : {},
    live: studioLive(),
  };
}

export async function loadSettings(): Promise<StudioSettings> {
  return publicSettings(await loadStored());
}

/* ---------- files ---------- */

export async function ensureBucket(): Promise<void> {
  const storage = createSupabaseAdminClient().storage;
  const { data } = await storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await storage.createBucket(BUCKET, {
    public: false,
    allowedMimeTypes: ['image/*', 'video/*', 'application/pdf'],
  });
  if (error && !/exists/i.test(error.message)) throw new Error(error.message);
}

async function gridUrls(s: StudioSettings): Promise<StudioSettings> {
  const pages = Object.entries(s.grid) as [keyof StudioSettings['grid'], StudioSettings['grid']['hair']][];
  const signed = await withUrls(pages.map(([k, g]) => ({ id: k, files: g.avatar ? [...g.live, g.avatar] : g.live }) as StudioItem));
  return {
    ...s,
    grid: Object.fromEntries(
      pages.map(([k, g], n) => [k, { ...g, live: signed[n].files.slice(0, g.live.length), avatar: g.avatar ? signed[n].files[g.live.length] : null }]),
    ) as StudioSettings['grid'],
  };
}

export async function withUrls(items: StudioItem[]): Promise<StudioItem[]> {
  const paths = items.flatMap((i) => i.files.map((f) => f.path));
  if (!paths.length || !studioLive()) return items;
  const { data } = await createSupabaseAdminClient().storage.from(BUCKET).createSignedUrls(paths, 12 * 60 * 60);
  const url = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return items.map((i) => ({ ...i, files: i.files.map((f) => ({ ...f, url: url.get(f.path) ?? undefined })) }));
}

/* ---------- input ---------- */

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T =>
  list.includes(v as T) ? (v as T) : fallback;
const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** Only http(s) links: a javascript: link would run in a teammate's session. */
export function safeUrl(v: unknown): string | null {
  try {
    const u = new URL(String(v).trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

/** A file path this item may hold: its own folder in the bucket. */
const ownPath = (id: string, p: unknown) =>
  typeof p === 'string' && p.startsWith(`${id}/`) && /^[\w-]+\/[\w.-]+$/.test(p);

/** Everything a browser sends, rebuilt field by field; comments are never taken from the browser. */
export function cleanItem(raw: Partial<StudioItem>, prev: StudioItem | null, who: string): StudioItem {
  const id = prev?.id ?? (typeof raw.id === 'string' && /^[\w-]{8,64}$/.test(raw.id) ? raw.id : crypto.randomUUID());
  const kind = oneOf(raw.kind, KINDS, 'task');
  const status = oneOf(raw.status, STATUSES, 'todo');
  const finished = status === 'done' || status === 'posted';
  const now = new Date().toISOString();
  return {
    id,
    kind,
    title: text(raw.title, 200).trim() || 'Untitled',
    notes: text(raw.notes, 8000),
    brand: oneOf(raw.brand, BRANDS, 'longevity'),
    platforms: Array.isArray(raw.platforms) ? raw.platforms.filter((p) => PLATFORMS.includes(p as never)) : [],
    due: day(raw.due),
    status,
    assignee: text(raw.assignee, 40),
    flagged: raw.flagged === true,
    links: (Array.isArray(raw.links) ? raw.links : [])
      .slice(0, 40)
      .flatMap((l: StudioLink) => {
        const url = safeUrl(l?.url);
        return url ? [{ url, label: text(l.label, 120) || undefined }] : [];
      }),
    files: (Array.isArray(raw.files) ? raw.files : [])
      .slice(0, 60)
      .filter((f: StudioFile) => ownPath(id, f?.path))
      .map((f: StudioFile) => ({ path: f.path, name: text(f.name, 200), type: text(f.type, 100), size: Number(f.size) || 0 })),
    cover:
      raw.cover && typeof raw.cover === 'object'
        ? { at: Math.max(0, Math.min(3600, Number(raw.cover.at) || 0)), path: ownPath(id, raw.cover.path) ? raw.cover.path : undefined }
        : null,
    format: raw.format === 'post' || raw.format === 'reel' ? raw.format : null,
    comments: prev?.comments ?? [],
    completedOn: finished ? (prev?.completedOn ?? day(raw.completedOn) ?? todayET()) : null,
    completedBy: finished ? (prev && (prev.status === 'done' || prev.status === 'posted') ? (prev.completedBy ?? null) : who) : null,
    createdBy: prev?.createdBy ?? who,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };
}
