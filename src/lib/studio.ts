import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import {
  BRANDS,
  DEFAULT_SETTINGS,
  KINDS,
  PLATFORMS,
  STATUSES,
  type StudioData,
  type StudioFile,
  type StudioItem,
  type StudioLink,
  type StudioSettings,
  todayET,
} from '@/lib/studio-types';

/*
 * The content studio's gate and store.
 *
 * Gate: one team code, STUDIO_CODE (a Vercel env var, like SITE_PASSWORD).
 * Entering it sets a signed cookie good for 24 hours; changing the code signs
 * everyone out. No code set = nobody gets in.
 *
 * Store: one `site_settings` row per item (key studio:item:<id>) plus
 * studio:settings. Service role only, so every read and write goes through
 * these server functions after the cookie check. Files live in the private
 * `studio` bucket and are read through signed links.
 * ponytail: a key-value table, fine for a few thousand items; move to real
 * tables if the studio grows past that.
 */

export const SESSION_COOKIE = 'el_studio';
export const WHO_COOKIE = 'el_studio_who';
export const SESSION_SECONDS = 24 * 60 * 60;
export const BUCKET = 'studio';
const PREFIX = 'studio:item:';
const SETTINGS_KEY = 'studio:settings';

function secret(): string | null {
  const code = process.env.STUDIO_CODE?.trim();
  return code ? createHash('sha256').update(`el-studio:${code}`).digest('hex') : null;
}

const sign = (exp: number, key: string) => createHmac('sha256', key).update(String(exp)).digest('hex');

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function studioConfigured(): boolean {
  return secret() !== null;
}

export function codeMatches(code: string): boolean {
  const want = process.env.STUDIO_CODE?.trim();
  if (!want) return false;
  const h = (s: string) => createHash('sha256').update(s).digest('hex');
  return same(h(code.trim()), h(want));
}

export function sessionValue(): string {
  const key = secret()!;
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return `${exp}.${sign(exp, key)}`;
}

export async function studioSession(): Promise<{ ok: boolean; who: string | null }> {
  const jar = await cookies();
  const key = secret();
  const [exp, sig] = (jar.get(SESSION_COOKIE)?.value ?? '').split('.');
  const ok = !!key && !!sig && Number(exp) > Date.now() / 1000 && same(sig, sign(Number(exp), key));
  return { ok, who: ok ? (jar.get(WHO_COOKIE)?.value ?? null) : null };
}

export async function requireStudio(): Promise<string> {
  const s = await studioSession();
  if (!s.ok) throw new Error('Your studio session ended. Enter the code again.');
  return s.who ?? 'Team';
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

export async function putSettings(s: StudioSettings): Promise<void> {
  await write(SETTINGS_KEY, s);
}

export async function loadStudio(): Promise<StudioData> {
  const rows = await readAll();
  const items = rows.filter((r) => r.key.startsWith(PREFIX)).map((r) => r.value as StudioItem);
  const stored = rows.find((r) => r.key === SETTINGS_KEY)?.value as Partial<StudioSettings> | undefined;
  return { items: await withUrls(items), settings: { ...DEFAULT_SETTINGS, ...stored }, live: studioLive() };
}

export async function loadSettings(): Promise<StudioSettings> {
  return (await loadStudio()).settings;
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
    comments: prev?.comments ?? [],
    completedOn: finished ? (prev?.completedOn ?? day(raw.completedOn) ?? todayET()) : null,
    createdBy: prev?.createdBy ?? who,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };
}
