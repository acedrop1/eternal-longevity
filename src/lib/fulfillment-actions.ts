'use server';

/**
 * Pharmacy fulfillment actions.
 *
 * Flow: a physician signs a prescription -> the admin submits it to the
 * pharmacy -> the pharmacy accepts it and adds tracking -> the patient is
 * notified. The pharmacy drop-ships straight to the patient; the clinic never
 * touches product.
 *
 * Dual-mode: every action returns a friendly message in demo mode (no Supabase)
 * and does the real work once the service role is configured.
 */
import { getSession } from './auth-server';
import type { Json } from './database.types';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from './supabase/admin';
import { sendEmail } from './email';
import { sendSms } from './sms';

export interface FulfillmentResult {
  ok: boolean;
  message: string;
}

async function requireRole(
  role: 'admin' | 'pharmacy',
): Promise<FulfillmentResult | null> {
  if (!supabaseAdminConfigured()) {
    return { ok: false, message: 'Connect Supabase to enable fulfillment.' };
  }
  const session = await getSession();
  if (!session || session.role !== role) {
    return { ok: false, message: `${role} access is required.` };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Admin: submit a signed prescription to the pharmacy                       */
/* -------------------------------------------------------------------------- */

export async function submitToPharmacy(
  prescriptionId: string,
): Promise<FulfillmentResult> {
  const blocked = await requireRole('admin');
  if (blocked) return blocked;

  const db = createSupabaseAdminClient();
  try {
    const { data: rx } = await db
      .from('prescriptions')
      .select('id, user_id, doctor_id, items')
      .eq('id', prescriptionId)
      .maybeSingle();
    if (!rx) return { ok: false, message: 'Prescription not found.' };

    const { data: patient } = await db
      .from('profiles')
      .select('full_name, date_of_birth')
      .eq('id', rx.user_id)
      .maybeSingle();

    const { data: address } = await db
      .from('addresses')
      .select('line1, line2, city, state, zip')
      .eq('user_id', rx.user_id)
      .eq('is_primary', true)
      .maybeSingle();

    let prescriberName: string | null = null;
    let prescriberNpi: string | null = null;
    if (rx.doctor_id) {
      const { data: doctor } = await db
        .from('profiles')
        .select('full_name, npi')
        .eq('id', rx.doctor_id)
        .maybeSingle();
      prescriberName = doctor?.full_name ?? null;
      prescriberNpi = doctor?.npi ?? null;
    }

    const orderRef = `FUL-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await db.from('fulfillment_orders').insert({
      order_ref: orderRef,
      user_id: rx.user_id,
      prescription_id: rx.id,
      status: 'submitted',
      patient_name: patient?.full_name ?? 'Patient',
      patient_dob: patient?.date_of_birth ?? null,
      shipping_address: (address ?? null) as Json | null,
      prescriber_name: prescriberName,
      prescriber_npi: prescriberNpi,
      items: rx.items,
      submitted_at: new Date().toISOString(),
    });
    if (error) {
      return { ok: false, message: `Could not submit: ${error.message}` };
    }

    // Notify the pharmacy — a log-in prompt only, no PHI in the email body.
    if (process.env.PHARMACY_EMAIL) {
      await sendEmail({
        to: process.env.PHARMACY_EMAIL,
        subject: `New fulfillment order ${orderRef}`,
        html: `<p>A new order is waiting in your Eternal Longevity pharmacy portal.</p>
               <p>Reference <strong>${orderRef}</strong>. Log in to view the
               patient, shipping address, and prescription, then add tracking
               when you ship.</p>`,
      });
    }

    return {
      ok: true,
      message: `Order ${orderRef} submitted to the pharmacy.`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Submission failed.',
    };
  }
}

/* -------------------------------------------------------------------------- */
/*  Pharmacy: accept an order                                                 */
/* -------------------------------------------------------------------------- */

export async function pharmacyAcceptOrder(
  fulfillmentId: string,
): Promise<FulfillmentResult> {
  const blocked = await requireRole('pharmacy');
  if (blocked) return blocked;

  const db = createSupabaseAdminClient();
  const { error } = await db
    .from('fulfillment_orders')
    .update({ status: 'accepted' })
    .eq('id', fulfillmentId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Order accepted.' };
}

/* -------------------------------------------------------------------------- */
/*  Pharmacy: add tracking + notify the patient                               */
/* -------------------------------------------------------------------------- */

export async function pharmacyAddTracking(input: {
  fulfillmentId: string;
  carrier: string;
  trackingNumber: string;
}): Promise<FulfillmentResult> {
  const blocked = await requireRole('pharmacy');
  if (blocked) return blocked;

  if (!input.trackingNumber.trim()) {
    return { ok: false, message: 'Enter a tracking number.' };
  }

  const db = createSupabaseAdminClient();
  const { data: order, error } = await db
    .from('fulfillment_orders')
    .update({
      status: 'shipped',
      tracking_carrier: input.carrier,
      tracking_number: input.trackingNumber.trim(),
      shipped_at: new Date().toISOString(),
    })
    .eq('id', input.fulfillmentId)
    .select('user_id, order_ref')
    .single();
  if (error) return { ok: false, message: error.message };

  // Notify the patient by email + SMS (best-effort).
  if (order?.user_id) {
    const { data: patient } = await db
      .from('profiles')
      .select('email, phone, full_name')
      .eq('id', order.user_id)
      .maybeSingle();
    const firstName = patient?.full_name?.split(/\s+/)[0] ?? 'there';
    if (patient?.email) {
      await sendEmail({
        to: patient.email,
        subject: `Your order ${order.order_ref} has shipped`,
        html: `<p>Good news, ${firstName} — your order is on the way.</p>
               <p><strong>${input.carrier}</strong> tracking:
               ${input.trackingNumber.trim()}</p>
               <p>Compounded peptides ship cold-chain. Refrigerate on arrival.</p>`,
      });
    }
    if (patient?.phone) {
      await sendSms(
        patient.phone,
        `Your Eternal Longevity order ${order.order_ref} has shipped. ${input.carrier} tracking: ${input.trackingNumber.trim()}`,
      );
    }
  }

  return { ok: true, message: 'Tracking added — the patient was notified.' };
}
