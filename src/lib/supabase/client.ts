/**
 * Supabase client for use in browser / client components.
 *
 * Usage (inside a 'use client' component):
 *   const supabase = createSupabaseBrowserClient();
 *   const { data } = await supabase.from('orders').select('*');
 */
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/env';

export function createSupabaseBrowserClient() {
  if (!supabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.',
    );
  }
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
