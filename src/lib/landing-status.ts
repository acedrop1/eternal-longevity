import 'server-only';

/**
 * Which landing pages are published: { [slug]: true }, from `site_settings`
 * (key "landing_status"); locally without Supabase, .data/landing-status.json.
 * A plain server module, not a server action, so it isn't a public endpoint
 * that lists the unpublished pages. Admin → Landing pages writes it
 * (landing-actions).
 */
import { promises as fs } from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient, supabaseAdminConfigured } from './supabase/admin';

export const LANDING_KEY = 'landing_status';
export const LANDING_DEV_FILE = path.join(process.cwd(), '.data', 'landing-status.json');

export async function getLandingStatus(): Promise<Record<string, boolean>> {
  try {
    if (supabaseAdminConfigured()) {
      const db = createSupabaseAdminClient() as unknown as SupabaseClient;
      const { data } = await db.from('site_settings').select('value').eq('key', LANDING_KEY).maybeSingle();
      return (data?.value as Record<string, boolean> | null) ?? {};
    }
    if (process.env.NODE_ENV !== 'development') return {};
    return JSON.parse(await fs.readFile(LANDING_DEV_FILE, 'utf8')) as Record<string, boolean>;
  } catch {
    return {};
  }
}
