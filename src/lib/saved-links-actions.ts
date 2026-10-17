'use server';

/**
 * Admin → Marketing → Saved links: tagged links from the link builder, kept
 * by name so they can be copied again. One row in `site_settings`
 * (key "saved_links", migration 0027, service role only). Locally without
 * Supabase they live in .data/saved-links.json. Admin only.
 */
import { promises as fs } from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSession } from './auth-server';
import { createSupabaseAdminClient, supabaseAdminConfigured } from './supabase/admin';
import { SITE_URL } from './site';

export interface SavedLink {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  createdBy: string;
}

const KEY = 'saved_links';
const MAX = 200;
const DEV_FILE = path.join(process.cwd(), '.data', 'saved-links.json');
// The generated types predate site_settings.
const db = () => createSupabaseAdminClient() as unknown as SupabaseClient;

async function read(): Promise<SavedLink[]> {
  if (supabaseAdminConfigured()) {
    const { data, error } = await db().from('site_settings').select('value').eq('key', KEY).maybeSingle();
    if (error) throw new Error(error.message);
    const links = (data?.value as { links?: SavedLink[] } | null)?.links;
    return Array.isArray(links) ? links : [];
  }
  if (process.env.NODE_ENV !== 'development') return [];
  try {
    return JSON.parse(await fs.readFile(DEV_FILE, 'utf8')) as SavedLink[];
  } catch {
    return [];
  }
}

async function write(links: SavedLink[]): Promise<void> {
  if (supabaseAdminConfigured()) {
    const { error } = await db()
      .from('site_settings')
      .upsert({ key: KEY, value: { links }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw new Error(error.message);
    return;
  }
  if (process.env.NODE_ENV !== 'development') throw new Error('Connect Supabase to save links.');
  await fs.mkdir(path.dirname(DEV_FILE), { recursive: true });
  await fs.writeFile(DEV_FILE, JSON.stringify(links, null, 2));
}

async function admin() {
  const s = await getSession();
  return s && s.role === 'admin' ? s : null;
}

export async function listSavedLinksAction(): Promise<SavedLink[]> {
  if (!(await admin())) return [];
  return read().catch(() => []);
}

export async function saveLinkAction(input: { name: string; url: string }): Promise<{ ok: boolean; message: string; links?: SavedLink[] }> {
  const session = await admin();
  if (!session) return { ok: false, message: 'Admin access is required.' };
  const name = String(input?.name ?? '').trim().slice(0, 80);
  const url = String(input?.url ?? '').trim();
  if (!name) return { ok: false, message: 'Give the link a name.' };
  // Only links to our own site.
  const base = SITE_URL.replace(/\/$/, '');
  if (!url.startsWith(`${base}/`) || url.length > 500) return { ok: false, message: 'That link is not on our site.' };
  try {
    const links = await read();
    if (links.length >= MAX) return { ok: false, message: `${MAX} saved links is the limit. Delete one first.` };
    const next: SavedLink[] = [
      { id: crypto.randomUUID(), name, url, createdAt: new Date().toISOString(), createdBy: session.name },
      ...links,
    ];
    await write(next);
    return { ok: true, message: 'Saved.', links: next };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not save.' };
  }
}

export async function deleteLinkAction(id: string): Promise<{ ok: boolean; message: string; links?: SavedLink[] }> {
  if (!(await admin())) return { ok: false, message: 'Admin access is required.' };
  try {
    const next = (await read()).filter((l) => l.id !== id);
    await write(next);
    return { ok: true, message: 'Deleted.', links: next };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not delete.' };
  }
}
