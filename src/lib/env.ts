/**
 * Client-safe environment helpers.
 *
 * Only NEXT_PUBLIC_* values appear here, so this module is safe to import from
 * client components. Server-only secrets (service-role key, Stripe secret,
 * Resend / Twilio tokens) are read directly inside their own server-only
 * modules — never here.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * True when the Supabase project URL + anon key are both present. The whole app
 * runs as a localStorage-backed demo when this is false, so nothing breaks
 * before the backend is connected.
 */
export const supabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
