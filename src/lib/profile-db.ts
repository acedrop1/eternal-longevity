'use server';

/**
 * Server-side cart and member profile, backed by Supabase.
 *
 * Addresses and payment methods have their own owner-scoped tables; the
 * scalar profile fields and the cart live on the profile row. Everything here
 * runs as the caller through RLS, so a member can only ever touch their own
 * data — no service-role client is needed.
 */

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/env';
import { getSession } from '@/lib/auth-server';
import type { MemberProfile, SavedAddress, SavedCard } from '@/lib/memberProfile';
import type { CartItem } from '@/lib/cartTypes';
import type { Database, Json } from '@/lib/database.types';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type AddressUpdate = Database['public']['Tables']['addresses']['Update'];

type Result = { ok: boolean; error?: string };

/** True when the Supabase-backed profile is available. */
export async function profileDbConfigured(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  return Boolean(await getSession());
}

/* -------------------------------------------------------------------------- */
/*  Reads                                                                     */
/* -------------------------------------------------------------------------- */

/** The caller's profile: scalar fields plus saved addresses and cards. */
export async function loadProfile(): Promise<MemberProfile | null> {
  if (!supabaseConfigured) return null;
  const user = await getSession();
  if (!user) return null;

  const db = await createSupabaseServerClient();
  const [{ data: row }, { data: addresses }, { data: cards }] = await Promise.all([
    db
      .from('profiles')
      .select('full_name, phone, date_of_birth, two_factor_enabled, notification_prefs')
      .eq('id', user.id)
      .maybeSingle(),
    db.from('addresses').select('*').eq('user_id', user.id).order('created_at'),
    db.from('payment_methods').select('*').eq('user_id', user.id).order('created_at'),
  ]);

  return {
    fullName: row?.full_name ?? undefined,
    phone: row?.phone ?? undefined,
    dateOfBirth: row?.date_of_birth ?? undefined,
    twoFactorEnabled: row?.two_factor_enabled ?? false,
    notifications: (row?.notification_prefs as Record<string, boolean>) ?? undefined,
    addresses: (addresses ?? []).map((a) => ({
      id: a.id,
      label: a.label,
      fullName: a.full_name,
      line1: a.line1,
      line2: a.line2 ?? undefined,
      city: a.city,
      state: a.state,
      zip: a.zip,
      phone: a.phone ?? undefined,
      isPrimary: a.is_primary,
    })),
    cards: (cards ?? []).map((c) => ({
      id: c.id,
      brand: c.brand,
      last4: c.last4,
      expMonth: c.exp_month,
      expYear: c.exp_year,
      nameOnCard: c.name_on_card ?? '',
      isPrimary: c.is_primary,
    })),
  };
}

/**
 * The caller's cart.
 *
 * `supported` is false when the profiles.cart column is not there yet
 * (migration 0005 not run). The provider then keeps using localStorage
 * instead of silently dropping the member's cart on every page load.
 */
export async function loadCart(): Promise<{ items: CartItem[]; supported: boolean }> {
  if (!supabaseConfigured) return { items: [], supported: false };
  const user = await getSession();
  if (!user) return { items: [], supported: false };
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from('profiles')
    .select('cart')
    .eq('id', user.id)
    .maybeSingle();
  if (error) {
    console.warn('[profile-db] cart column unavailable:', error.message);
    return { items: [], supported: false };
  }
  const cart = data?.cart;
  return {
    items: Array.isArray(cart) ? (cart as unknown as CartItem[]) : [],
    supported: true,
  };
}

/* -------------------------------------------------------------------------- */
/*  Writes                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Replace the cart wholesale. The provider already computes the next cart
 * locally, so sending the whole array avoids a read-modify-write race between
 * two tabs.
 */
export async function saveCartAction(items: CartItem[]): Promise<Result> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'not_authenticated' };
  const db = await createSupabaseServerClient();
  const { error } = await db
    .from('profiles')
    .update({ cart: items as unknown as Json })
    .eq('id', user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Patch the scalar profile fields. */
export async function patchProfileAction(
  patch: Partial<Omit<MemberProfile, 'addresses' | 'cards'>>,
): Promise<Result> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'not_authenticated' };

  const row: ProfileUpdate = {};
  if (patch.fullName !== undefined) row.full_name = patch.fullName;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.dateOfBirth !== undefined) row.date_of_birth = patch.dateOfBirth || null;
  if (patch.twoFactorEnabled !== undefined) row.two_factor_enabled = patch.twoFactorEnabled;
  if (patch.notifications !== undefined)
    row.notification_prefs = patch.notifications as unknown as Json;
  if (!Object.keys(row).length) return { ok: true };

  const db = await createSupabaseServerClient();
  const { error } = await db.from('profiles').update(row).eq('id', user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/portal/account');
  return { ok: true };
}

/** Clear is_primary on every other row of a table for this user. */
async function demoteOthers(
  table: 'addresses' | 'payment_methods',
  userId: string,
  keepId: string,
) {
  const db = await createSupabaseServerClient();
  await db
    .from(table)
    .update({ is_primary: false })
    .eq('user_id', userId)
    .neq('id', keepId);
}

export async function addAddressAction(
  a: Omit<SavedAddress, 'id'>,
): Promise<Result & { id?: string }> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'not_authenticated' };
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from('addresses')
    .insert({
      user_id: user.id,
      label: a.label,
      full_name: a.fullName,
      line1: a.line1,
      line2: a.line2 ?? null,
      city: a.city,
      state: a.state,
      zip: a.zip,
      phone: a.phone ?? null,
      is_primary: a.isPrimary ?? false,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.message };
  if (a.isPrimary) await demoteOthers('addresses', user.id, data.id);
  revalidatePath('/portal/account');
  return { ok: true, id: data.id };
}

export async function updateAddressAction(
  id: string,
  patch: Partial<SavedAddress>,
): Promise<Result> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'not_authenticated' };
  const row: AddressUpdate = {};
  if (patch.label !== undefined) row.label = patch.label;
  if (patch.fullName !== undefined) row.full_name = patch.fullName;
  if (patch.line1 !== undefined) row.line1 = patch.line1;
  if (patch.line2 !== undefined) row.line2 = patch.line2 ?? null;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.state !== undefined) row.state = patch.state;
  if (patch.zip !== undefined) row.zip = patch.zip;
  if (patch.phone !== undefined) row.phone = patch.phone ?? null;
  if (patch.isPrimary !== undefined) row.is_primary = patch.isPrimary;
  if (!Object.keys(row).length) return { ok: true };

  const db = await createSupabaseServerClient();
  const { error } = await db.from('addresses').update(row).eq('id', id);
  if (error) return { ok: false, error: error.message };
  if (patch.isPrimary) await demoteOthers('addresses', user.id, id);
  revalidatePath('/portal/account');
  return { ok: true };
}

export async function removeAddressAction(id: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'not_authenticated' };
  const db = await createSupabaseServerClient();
  const { error } = await db.from('addresses').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/portal/account');
  return { ok: true };
}

export async function setPrimaryAddressAction(id: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'not_authenticated' };
  const db = await createSupabaseServerClient();
  const { error } = await db.from('addresses').update({ is_primary: true }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  await demoteOthers('addresses', user.id, id);
  revalidatePath('/portal/account');
  return { ok: true };
}

export async function addCardAction(
  c: Omit<SavedCard, 'id'>,
): Promise<Result & { id?: string }> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'not_authenticated' };
  const db = await createSupabaseServerClient();
  // Only the display fields are stored — never a full card number. Real
  // charges run on a Stripe payment-method token.
  const { data, error } = await db
    .from('payment_methods')
    .insert({
      user_id: user.id,
      brand: c.brand,
      last4: c.last4,
      exp_month: c.expMonth,
      exp_year: c.expYear,
      name_on_card: c.nameOnCard,
      is_primary: c.isPrimary ?? false,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.message };
  if (c.isPrimary) await demoteOthers('payment_methods', user.id, data.id);
  revalidatePath('/portal/account');
  return { ok: true, id: data.id };
}

export async function removeCardAction(id: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'not_authenticated' };
  const db = await createSupabaseServerClient();
  const { error } = await db.from('payment_methods').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/portal/account');
  return { ok: true };
}

export async function setPrimaryCardAction(id: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'not_authenticated' };
  const db = await createSupabaseServerClient();
  const { error } = await db.from('payment_methods').update({ is_primary: true }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  await demoteOthers('payment_methods', user.id, id);
  revalidatePath('/portal/account');
  return { ok: true };
}
