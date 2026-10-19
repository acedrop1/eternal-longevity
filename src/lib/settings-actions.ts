'use server';

/**
 * Admin → Settings → Shipping: what customers pay per box and whether a
 * member's first order ships free. Admin only, validated here, audited field
 * by field. Every page that shows or charges shipping reads the new values.
 */
import { revalidatePath } from 'next/cache';
import { getSession } from './auth-server';
import { recordAudit } from './prescriber';
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
