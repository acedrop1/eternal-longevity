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
import { getShippingSettings, saveShippingSettings, type ShippingSettings } from './shipping-settings';
import type { SettingsResult } from './admin-settings-actions';
import { getMarketingSettings, saveMarketingSettings, type MarketingSettings } from './marketing-settings';

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
