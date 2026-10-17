'use server';

/**
 * Which landing pages are published (Admin → Landing pages). One row in
 * `site_settings` (key "landing_status": { [slug]: true }), service role
 * only; locally without Supabase, .data/landing-status.json. A page not
 * marked published is visible to admins only.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSession } from './auth-server';
import { recordAudit } from './prescriber';
import { createSupabaseAdminClient, supabaseAdminConfigured } from './supabase/admin';
import { LANDINGS } from './landings';

const KEY = 'landing_status';
const DEV_FILE = path.join(process.cwd(), '.data', 'landing-status.json');
const db = () => createSupabaseAdminClient() as unknown as SupabaseClient;

export async function getLandingStatus(): Promise<Record<string, boolean>> {
  try {
    if (supabaseAdminConfigured()) {
      const { data } = await db().from('site_settings').select('value').eq('key', KEY).maybeSingle();
      return (data?.value as Record<string, boolean> | null) ?? {};
    }
    if (process.env.NODE_ENV !== 'development') return {};
    return JSON.parse(await fs.readFile(DEV_FILE, 'utf8')) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export async function setLandingPublishedAction(slug: string, published: boolean): Promise<{ ok: boolean; message: string }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return { ok: false, message: 'Admin access is required.' };
  if (!LANDINGS.some((l) => l.slug === slug)) return { ok: false, message: 'Unknown page.' };
  const next = { ...(await getLandingStatus()), [slug]: Boolean(published) };
  try {
    if (supabaseAdminConfigured()) {
      const { error } = await db()
        .from('site_settings')
        .upsert({ key: KEY, value: next, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw new Error(error.message);
    } else if (process.env.NODE_ENV === 'development') {
      await fs.mkdir(path.dirname(DEV_FILE), { recursive: true });
      await fs.writeFile(DEV_FILE, JSON.stringify(next, null, 2));
    } else {
      throw new Error('Connect Supabase to publish pages.');
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not save.' };
  }
  await recordAudit([
    {
      actorId: session.id,
      actorName: session.name,
      actorRole: 'admin',
      entity: 'landing_page',
      entityId: null,
      field: `/${slug} · Published`,
      oldValue: published ? 'No' : 'Yes',
      newValue: published ? 'Yes' : 'No',
    },
  ]);
  revalidatePath(`/${slug}`);
  revalidatePath('/portal/admin/landing-pages');
  return { ok: true, message: published ? 'Published.' : 'Unpublished.' };
}
