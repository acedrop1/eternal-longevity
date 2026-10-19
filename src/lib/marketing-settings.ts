import 'server-only';

/**
 * Admin → Settings → Marketing sign-up: whether customers are offered the
 * marketing email and marketing text opt-ins (sign-up, the assessment,
 * /subscribe). A switch only shows or hides the choice; nobody is ever
 * enrolled without ticking it themselves, and turning a switch off does not
 * unsubscribe anyone already on the list.
 *
 * One row in `site_settings` (key 'marketing'). No row: email on, texts as
 * NEXT_PUBLIC_SMS_MARKETING says (the launch setting).
 */

import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';

export interface MarketingSettings {
  email: boolean;
  sms: boolean;
}

export const DEFAULT_MARKETING: MarketingSettings = {
  email: true,
  sms: process.env.NEXT_PUBLIC_SMS_MARKETING === '1',
};

const KEY = 'marketing';
// The generated types predate site_settings.
const db = () => createSupabaseAdminClient() as unknown as SupabaseClient;

function clean(v: unknown): MarketingSettings {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return {
    email: typeof o.email === 'boolean' ? o.email : DEFAULT_MARKETING.email,
    sms: typeof o.sms === 'boolean' ? o.sms : DEFAULT_MARKETING.sms,
  };
}

/** Current settings, once per request. Never throws. */
export const getMarketingSettings = cache(async (): Promise<MarketingSettings> => {
  if (!supabaseAdminConfigured()) return DEFAULT_MARKETING;
  try {
    const { data, error } = await db().from('site_settings').select('value').eq('key', KEY).maybeSingle();
    if (error || !data) return DEFAULT_MARKETING;
    return clean(data.value);
  } catch {
    return DEFAULT_MARKETING;
  }
});

/** Admin only: the caller checks the role and writes the audit entry. */
export async function saveMarketingSettings(next: MarketingSettings): Promise<MarketingSettings> {
  const value = clean(next);
  if (!supabaseAdminConfigured()) throw new Error('Connect Supabase to save settings.');
  const { error } = await db()
    .from('site_settings')
    .upsert({ key: KEY, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
  return value;
}
