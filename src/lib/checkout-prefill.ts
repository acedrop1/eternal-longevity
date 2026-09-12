import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';

export interface CheckoutPrefill {
  fullName: string;
  phone: string;
  zip: string;
}

/**
 * What the member already told us, so checkout does not ask twice.
 *
 * Their most recent shipping address wins — it is the one they last confirmed
 * — and the intake fills whatever is missing behind it.
 */
export async function checkoutPrefill(userId: string): Promise<CheckoutPrefill> {
  const empty = { fullName: '', phone: '', zip: '' };
  if (!supabaseAdminConfigured()) return empty;

  try {
    const db = createSupabaseAdminClient();
    const [{ data: profile }, { data: intake }, { data: lastOrder }] =
      await Promise.all([
        db
          .from('profiles')
          .select('full_name, phone')
          .eq('id', userId)
          .maybeSingle(),
        db
          .from('intake_submissions')
          .select('answers')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        db
          .from('orders')
          .select('shipping_address')
          .eq('user_id', userId)
          .not('shipping_address', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const a = (intake?.answers ?? {}) as Record<string, unknown>;
    const addr = (lastOrder?.shipping_address ?? {}) as Record<string, string>;
    const pick = (...vals: unknown[]) =>
      String(vals.find((v) => typeof v === 'string' && v.trim()) ?? '').trim();

    return {
      fullName: pick(
        addr.fullName,
        profile?.full_name,
        [a.first_name, a.last_name].filter(Boolean).join(' '),
      ),
      phone: pick(addr.phone, profile?.phone, a.phone),
      zip: pick(addr.zip, a.zip),
    };
  } catch {
    return empty;
  }
}
