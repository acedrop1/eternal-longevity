'use server';

/**
 * Promotion codes.
 *
 * The discount is applied to the order total before the PaymentIntent is
 * created, so Stripe charges the already-reduced amount. Stripe's own coupons
 * only auto-apply to Checkout Sessions and Subscriptions; the first charge
 * here is a bare PaymentIntent minted from a pay link after approval, so a
 * Stripe coupon attached to a customer would silently do nothing.
 *
 * Redemption happens when the order is placed, not when it is paid. An order
 * can sit unpaid for seven days, and holding a limited code open that whole
 * time would let one code be spent many times over.
 */

import { revalidatePath } from 'next/cache';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth-server';
import { LIMITS, allow } from './rate-limit';

export interface PromoCode {
  id: string;
  code: string;
  kind: 'percent' | 'fixed';
  value: number;
  maxRedemptions: number | null;
  redeemedCount: number;
  expiresAt: string | null;
  active: boolean;
  note: string | null;
  /** Also waives the order's shipping. */
  includesShipping: boolean;
  createdAt: string;
}

export interface PromoCheck {
  ok: boolean;
  /** Cents taken off, already clamped to the subtotal. */
  discountCents?: number;
  code?: string;
  label?: string;
  /** Shipping is waived too; the server adds it to the order's discount. */
  includesShipping?: boolean;
  error?: string;
}

async function adminOnly() {
  const user = await getSession();
  if (!user || user.role !== 'admin') return false;
  return true;
}

/* ------------------------------ validation ------------------------------- */

/**
 * Check a code against a subtotal. Read-only — nothing is redeemed here, so
 * this is safe to call on every keystroke in the checkout.
 */
export async function checkPromoAction(
  rawCode: string,
  subtotalCents: number,
): Promise<PromoCheck> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: 'Enter a code.' };
  // Unauthenticated by design — so it is also a free oracle for guessing codes.
  if (!(await allow('promo', LIMITS.promo))) {
    return { ok: false, error: 'Too many attempts. Try again shortly.' };
  }
  if (!supabaseAdminConfigured()) {
    return { ok: false, error: 'Codes are unavailable right now.' };
  }

  const db = createSupabaseAdminClient();
  const { data: promo } = await db
    .from('promo_codes')
    .select('code, kind, value, max_redemptions, redeemed_count, expires_at, active, includes_shipping')
    .eq('code', code)
    .maybeSingle();

  // One message for every failure mode. Telling someone a code exists but is
  // exhausted, or expired, invites guessing at the ones that are not.
  const reject = { ok: false as const, error: 'That code is not valid.' };
  if (!promo || !promo.active) return reject;
  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
    return reject;
  }
  if (
    promo.max_redemptions !== null &&
    promo.redeemed_count >= promo.max_redemptions
  ) {
    return reject;
  }

  const raw =
    promo.kind === 'percent'
      ? Math.round((subtotalCents * promo.value) / 100)
      : promo.value;

  // Never below zero, and never more than the order is worth — a fixed code
  // larger than the basket must not produce a negative total.
  const discountCents = Math.max(0, Math.min(raw, subtotalCents));

  return {
    ok: true,
    discountCents,
    code: promo.code,
    label:
      (promo.kind === 'percent'
        ? `${promo.value}% off`
        : `$${(promo.value / 100).toFixed(2)} off`) +
      (promo.includes_shipping ? ' + free shipping' : ''),
    includesShipping: promo.includes_shipping,
  };
}

/* -------------------------------- admin ---------------------------------- */

export async function listPromosAction(): Promise<PromoCode[]> {
  if (!(await adminOnly()) || !supabaseAdminConfigured()) return [];
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  return (data ?? []).map((r) => ({
    id: r.id,
    code: r.code,
    kind: r.kind as 'percent' | 'fixed',
    value: r.value,
    maxRedemptions: r.max_redemptions,
    redeemedCount: r.redeemed_count,
    expiresAt: r.expires_at,
    active: r.active,
    note: r.note,
    includesShipping: r.includes_shipping,
    createdAt: r.created_at,
  }));
}

export interface PromoInput {
  code: string;
  kind: 'percent' | 'fixed';
  /** Percent 1-100, or dollars for a fixed code. */
  value: number;
  maxRedemptions?: number;
  expiresAt?: string;
  note?: string;
  includesShipping?: boolean;
}

/** The columns a create or an edit writes, or why the input is refused. */
function promoFields(input: PromoInput):
  | { ok: true; code: string; fields: { code: string; kind: string; value: number; max_redemptions: number | null; expires_at: string | null; note: string | null; includes_shipping: boolean } }
  | { ok: false; message: string } {
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,24}$/.test(code)) {
    return { ok: false, message: 'Codes are 3–24 characters: letters, numbers and hyphens.' };
  }
  if (input.kind === 'percent' && (input.value < 1 || input.value > 100)) {
    return { ok: false, message: 'A percentage must be between 1 and 100.' };
  }
  if (input.kind === 'fixed' && !(input.value > 0)) {
    return { ok: false, message: 'A fixed discount must be more than $0.' };
  }
  const max = input.maxRedemptions;
  if (max !== undefined && (!Number.isInteger(max) || max < 1)) {
    return { ok: false, message: 'Max uses is a whole number of at least 1, or blank for unlimited.' };
  }
  return {
    ok: true,
    code,
    fields: {
      code,
      kind: input.kind,
      // Percent stays a percent; a fixed discount is stored in cents.
      value: input.kind === 'percent' ? Math.round(input.value) : Math.round(input.value * 100),
      max_redemptions: max ?? null,
      expires_at: input.expiresAt || null,
      note: input.note?.trim() || null,
      includes_shipping: Boolean(input.includesShipping),
    },
  };
}

export async function createPromoAction(input: PromoInput): Promise<{ ok: boolean; message: string }> {
  const user = await getSession();
  if (!user || user.role !== 'admin') {
    return { ok: false, message: 'Not authorised.' };
  }
  if (!supabaseAdminConfigured()) {
    return { ok: false, message: 'Database is not configured.' };
  }

  const f = promoFields(input);
  if (!f.ok) return f;
  const { code } = f;

  const db = createSupabaseAdminClient();
  const { error } = await db.from('promo_codes').insert({ ...f.fields, created_by: user.id });

  if (error) {
    return {
      ok: false,
      message: error.message.includes('duplicate')
        ? `${code} already exists.`
        : error.message,
    };
  }
  revalidatePath('/portal/admin/billing');
  return { ok: true, message: `${code} created.` };
}

/** Turn a code off (or back on) without deleting its redemption history. */
export async function togglePromoAction(
  id: string,
  active: boolean,
): Promise<{ ok: boolean; message: string }> {
  if (!(await adminOnly())) return { ok: false, message: 'Not authorised.' };
  const db = createSupabaseAdminClient();
  const { error } = await db.from('promo_codes').update({ active }).eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/portal/admin/billing');
  return { ok: true, message: active ? 'Code enabled.' : 'Code disabled.' };
}

/**
 * Edit a code. Its redemption count is kept: an edit changes what the code
 * does from now on, not the orders already placed with it (those stored their
 * own discount).
 */
export async function updatePromoAction(
  id: string,
  input: PromoInput,
): Promise<{ ok: boolean; message: string }> {
  if (!(await adminOnly())) return { ok: false, message: 'Not authorised.' };
  if (!supabaseAdminConfigured()) return { ok: false, message: 'Database is not configured.' };
  const f = promoFields(input);
  if (!f.ok) return f;
  const db = createSupabaseAdminClient();
  const { error } = await db.from('promo_codes').update(f.fields).eq('id', id);
  if (error) {
    return {
      ok: false,
      message: error.message.includes('duplicate') ? `${f.code} already exists.` : error.message,
    };
  }
  revalidatePath('/portal/admin/billing');
  return { ok: true, message: `${f.code} saved.` };
}

/**
 * Delete a code nobody has used. A used code is part of the orders that
 * redeemed it, so it can only be disabled.
 */
export async function deletePromoAction(id: string): Promise<{ ok: boolean; message: string }> {
  if (!(await adminOnly())) return { ok: false, message: 'Not authorised.' };
  if (!supabaseAdminConfigured()) return { ok: false, message: 'Database is not configured.' };
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('promo_codes')
    .delete()
    .eq('id', id)
    .eq('redeemed_count', 0)
    .select('id');
  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: 'This code has been used, so it can only be disabled.' };
  revalidatePath('/portal/admin/billing');
  return { ok: true, message: 'Code deleted.' };
}
