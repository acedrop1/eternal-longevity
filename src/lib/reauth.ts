import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/env';

/**
 * Prove the person at the keyboard is still the account holder.
 *
 * A signature is the legal artifact this practice produces, and a session that
 * survives thirty idle minutes is not evidence that the prescriber is the one
 * clicking. EHRs ask again at the moment of signing for exactly this reason;
 * so does Shopify before it moves a payout account.
 *
 * The check runs on a throwaway client with no cookie storage — signing in here
 * must not rotate, extend or replace the session the browser is holding.
 */
export async function passwordMatches(
  email: string,
  password: string,
): Promise<boolean> {
  if (!supabaseConfigured || !password) return false;
  try {
    const probe = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await probe.auth.signInWithPassword({ email, password });
    return !error;
  } catch {
    return false;
  }
}
