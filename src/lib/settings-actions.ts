'use server';

/**
 * Admin → Settings → Shipping: what customers pay per box and whether a
 * member's first order ships free. Admin only, validated here, audited field
 * by field. Every page that shows or charges shipping reads the new values.
 */
import { revalidatePath } from 'next/cache';
import { getSession } from './auth-server';
import { getPrescriber, recordAudit } from './prescriber';
import { pharmacyEntryFor } from './catalog';
import { buildPrescriptionPayload } from './rxhere-rules';
import { postPrescription, rxhereSandbox } from './rxhere';
import { getShippingCost, getShippingSettings, saveShippingCost, saveShippingSettings, type ShippingSettings } from './shipping-settings';
import type { ShippingCost } from './shipping';
import type { SettingsResult } from './admin-settings-actions';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient, supabaseAdminConfigured } from './supabase/admin';
import { getMarketingSettings, saveMarketingSettings, type MarketingSettings } from './marketing-settings';

/** Admin → Settings → Shipping: what the pharmacy charges us per box. Feeds the profit numbers only. */
export async function saveShippingCostAction(input: ShippingCost): Promise<SettingsResult & { value?: ShippingCost }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return { ok: false, message: 'Admin access is required.' };
  const cold = Number(input?.cold);
  const room = Number(input?.room);
  if (![cold, room].every((n) => Number.isInteger(n) && n >= 0 && n <= 500)) {
    return { ok: false, message: 'Pharmacy shipping is whole dollars from $0 to $500.' };
  }
  const before = await getShippingCost();
  let value: ShippingCost;
  try {
    value = await saveShippingCost({ cold, room });
  } catch (err) {
    return { ok: false, message: (err instanceof Error && err.message) || 'Could not save.' };
  }
  await recordAudit(
    (
      [
        ['Pharmacy shipping · cold box', `$${before.cold}`, `$${value.cold}`],
        ['Pharmacy shipping · everything else', `$${before.room}`, `$${value.room}`],
      ] as const
    ).map(([field, oldValue, newValue]) => ({
      actorId: session.id,
      actorName: session.name,
      actorRole: 'admin',
      entity: 'settings',
      entityId: null,
      field,
      oldValue,
      newValue,
    })),
  );
  revalidatePath('/portal/admin', 'layout');
  return { ok: true, message: 'Saved. Profit numbers use the new rates from now on; paid orders keep what they cost.', value };
}

/**
 * Order page → Profit: correct what the pharmacy charged us to ship one paid
 * order (its frozen snapshot in order_costs). Admin only, audited.
 */
export async function setOrderShippingCostAction(orderNumber: string, dollars: number): Promise<SettingsResult> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return { ok: false, message: 'Admin access is required.' };
  if (!Number.isInteger(dollars) || dollars < 0 || dollars > 500) return { ok: false, message: 'Whole dollars from $0 to $500.' };
  if (!supabaseAdminConfigured()) return { ok: false, message: 'Connect Supabase to save.' };
  // The generated types predate order_costs.
  const db = createSupabaseAdminClient() as unknown as SupabaseClient;
  const { data: order } = await db
    .from('orders')
    .select('id, order_costs(shipping_cost_cents)')
    .eq('order_number', String(orderNumber ?? '').trim())
    .maybeSingle();
  if (!order) return { ok: false, message: 'Order not found.' };
  const snap = (Array.isArray(order.order_costs) ? order.order_costs[0] : order.order_costs) as { shipping_cost_cents?: number | null } | null;
  const before = snap?.shipping_cost_cents;
  const { error } = await db
    .from('order_costs')
    .upsert({ order_id: order.id, shipping_cost_cents: dollars * 100 }, { onConflict: 'order_id' });
  if (error) return { ok: false, message: error.message };
  await recordAudit([
    {
      actorId: session.id,
      actorName: session.name,
      actorRole: 'admin',
      entity: 'order',
      entityId: orderNumber,
      field: 'Pharmacy shipping cost',
      oldValue: before === null || before === undefined ? 'not recorded' : `$${before / 100}`,
      newValue: `$${dollars}`,
    },
  ]);
  revalidatePath('/portal/admin', 'layout');
  return { ok: true, message: 'Saved.' };
}

export async function saveShippingSettingsAction(input: ShippingSettings): Promise<SettingsResult & { value?: ShippingSettings }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return { ok: false, message: 'Admin access is required.' };

  const price = Number(input?.pricePerShipment);
  if (!Number.isInteger(price) || price < 0 || price > 200) {
    return { ok: false, message: 'Shipping per box is whole dollars from $0 to $200.' };
  }
  if (typeof input?.firstOrderFree !== 'boolean') return { ok: false, message: 'Choose whether the first order ships free.' };

  const before = await getShippingSettings();
  let value: ShippingSettings;
  try {
    value = await saveShippingSettings({ pricePerShipment: price, firstOrderFree: input.firstOrderFree });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    // Postgres "relation does not exist" / PostgREST "not in the schema cache".
    if (/site_settings/.test(msg) && /(does not exist|schema cache|could not find)/i.test(msg)) {
      return { ok: false, message: 'The settings table is missing: run supabase/migrations/0027_site_settings.sql in Supabase, then save again.' };
    }
    return { ok: false, message: msg || 'Could not save.' };
  }

  await recordAudit(
    (
      [
        ['Shipping · price per box', `$${before.pricePerShipment}`, `$${value.pricePerShipment}`],
        ['Shipping · first order ships free', before.firstOrderFree ? 'On' : 'Off', value.firstOrderFree ? 'On' : 'Off'],
      ] as const
    ).map(([field, oldValue, newValue]) => ({
      actorId: session.id,
      actorName: session.name,
      actorRole: 'admin',
      entity: 'settings',
      entityId: null,
      field,
      oldValue,
      newValue,
    })),
  );

  // Home, shop, product pages, checkout and admin all show or charge shipping.
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Saved.', value };
}

/** Admin → Settings → Marketing sign-up: offer the email and text opt-ins to customers, or not. */
export async function saveMarketingSettingsAction(input: MarketingSettings): Promise<SettingsResult & { value?: MarketingSettings }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return { ok: false, message: 'Admin access is required.' };
  if (typeof input?.email !== 'boolean' || typeof input?.sms !== 'boolean') return { ok: false, message: 'Choose on or off.' };

  const before = await getMarketingSettings();
  let value: MarketingSettings;
  try {
    value = await saveMarketingSettings({ email: input.email, sms: input.sms });
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not save.' };
  }
  const onOff = (b: boolean) => (b ? 'On' : 'Off');
  await recordAudit(
    (
      [
        ['Marketing · email sign-up offered', onOff(before.email), onOff(value.email)],
        ['Marketing · text sign-up offered', onOff(before.sms), onOff(value.sms)],
      ] as const
    ).map(([field, oldValue, newValue]) => ({
      actorId: session.id,
      actorName: session.name,
      actorRole: 'admin',
      entity: 'settings',
      entityId: null,
      field,
      oldValue,
      newValue,
    })),
  );
  // Sign-up, the assessment, /subscribe and the text-messaging terms all read it.
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Saved.', value };
}

/**
 * Admin → Settings → Pharmacy: post one made-up prescription with the sandbox
 * key (vr_test_), so RxHere checks every field we send and creates nothing.
 * Refuses with a live key: that would place a real order.
 */
export async function rxhereSandboxTestAction(): Promise<SettingsResult> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return { ok: false, message: 'Admin access is required.' };
  if (!rxhereSandbox()) return { ok: false, message: 'Only with the sandbox key (vr_test_). With the live key this would place a real order.' };

  const prescriber = await getPrescriber();
  const built = buildPrescriptionPayload({
    orderNumber: `SANDBOX-${Date.now()}`,
    patientId: 'sandbox-test-patient',
    item: await pharmacyEntryFor('enclomiphene'),
    cadence: 'monthly',
    lineQty: 1,
    sig: 'Take 1 capsule by mouth daily.',
    patient: { firstName: 'Test', lastName: 'Patient', dob: '1980-01-01', answers: { allergies_any: 'no' }, phone: null, email: null },
    // Our office: a real NJ address for RxHere's checks, never shipped to in sandbox.
    address: { line1: '825 Riverview Dr', line2: 'Floor 2', city: 'Totowa', state: 'NJ', zip: '07512' },
    prescriber: {
      name: prescriber.display || prescriber.name,
      npi: prescriber.npi,
      dea: prescriber.dea,
      licenses: { ...prescriber.otherLicenses, ...(prescriber.licenseState ? { [prescriber.licenseState]: prescriber.licenseNumber } : {}) },
    },
  });
  if (!built.ok) return { ok: false, message: `Not sent: ${built.error.replace(/_/g, ' ')}. Fix it here, then try again.` };
  const res = await postPrescription(built.payload);
  if (!res.ok) return { ok: false, message: `RxHere rejected the test (${res.code}, HTTP ${res.status}).` };
  return {
    ok: true,
    message: `RxHere accepted every field${res.data.sandbox ? ' (sandbox: nothing was created)' : ''}. Status ${res.data.status ?? '—'}, payment ${res.data.payment_status ?? '—'}${typeof res.data.total_cents === 'number' ? `, total $${(res.data.total_cents / 100).toFixed(2)}` : ''}.`,
  };
}
