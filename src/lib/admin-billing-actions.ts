'use server';

/**
 * Admin billing actions. Called from the admin billing panel.
 *
 * Every action verifies the caller is an admin and that billing is configured.
 * No raw card data is ever accepted — members add cards in their own account
 * (lib/cards); these actions work purely with the processor's ids.
 */
import { revalidatePath } from 'next/cache';
import { getSession } from './auth-server';
import { billingConfigured, chargeOnce } from './billing';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from './supabase/admin';
import { noticeEmail, refundedEmail, sendEmail } from './email';
import { createRefund, getTransfer } from './frame';
import { ORDER_FROM, intentBelongsTo } from './order-rules';
import { denyOrderAction } from './orders-db';
import { syncProcessorAmounts } from './profit-data';
import { SITE_URL } from './site';

export interface AdminBillingResult {
  ok: boolean;
  message: string;
  /** Set by adminSendCardLink — where the member adds their card. */
  url?: string;
}

/** Verify the processor and Supabase are connected and the caller is an admin. */
async function guard(): Promise<AdminBillingResult | null> {
  if (!billingConfigured()) {
    return {
      ok: false,
      message: 'Connect the card processor and Supabase to enable billing.',
    };
  }
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { ok: false, message: 'Admin access is required.' };
  }
  return null;
}

async function memberContact(
  userId: string,
): Promise<{ email: string; name: string } | null> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .maybeSingle();
  if (!data?.email) return null;
  return { email: data.email, name: data.full_name ?? 'Member' };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.';
}


/* -------------------------------------------------------------------------- */

/**
 * Email the member a link to add a card. Cards are saved in their own
 * account (signed in), not on a page the processor hosts.
 */
export async function adminSendCardLink(
  userId: string,
): Promise<AdminBillingResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const contact = await memberContact(userId);
  if (!contact) return { ok: false, message: 'Member not found.' };

  const url = `${SITE_URL}/portal/account`;
  try {
    await sendEmail({
      to: contact.email,
      subject: 'Add a card to your Eternal Longevity account',
      html: noticeEmail({
        eyebrow: 'Payment method',
        heading: 'Add a card to your account',
        body: 'Your care team has asked you to add a payment method so your treatment can be dispatched once it is approved.',
        cta: { label: 'Add your card securely', href: url },
        footnote:
          'Sign in and add it under Account. Your card details go straight to our payment processor and are never seen by our team.',
      }),
    });
    return {
      ok: true,
      message: `Card link emailed to ${contact.email}.`,
      url,
    };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}

/** Charge a customer's saved card a one-off amount. */
export async function adminChargeOnce(input: {
  userId: string;
  amountDollars: number;
  description: string;
}): Promise<AdminBillingResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const contact = await memberContact(input.userId);
  if (!contact) return { ok: false, message: 'Member not found.' };

  const amountCents = Math.round(input.amountDollars * 100);
  if (amountCents < 50) {
    return { ok: false, message: 'Amount must be at least $0.50.' };
  }

  try {
    const res = await chargeOnce({
      userId: input.userId,
      amountCents,
      description: input.description.trim() || 'Eternal Longevity charge',
    });
    if (!res.ok) return { ok: false, message: res.message };
    const dollars = input.amountDollars.toFixed(2);
    if (res.status === 'succeeded') return { ok: true, message: `Charged ${contact.email} $${dollars}.` };
    if (res.status === 'requires_3d_secure') {
      return { ok: false, message: 'The bank wants the member to approve this charge, so nothing was charged. Send them a pay link instead.' };
    }
    return {
      ok: false,
      message: `Charge did not complete (status: ${res.status}). Check transfer ${res.transferId} in the Frame dashboard.`,
    };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}

const TRANSFER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Refund a payment in full, or partially when an amount is given. Takes a
 * Frame transfer id (a UUID) for a charge with no order; anything else is an
 * order number and goes through adminRefundOrder. (`paymentIntentId` is the
 * panel's old field name.)
 */
export async function adminRefund(input: {
  paymentIntentId: string;
  amountDollars?: number;
}): Promise<AdminBillingResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const id = input.paymentIntentId.trim();
  if (!TRANSFER_ID.test(id)) {
    return adminRefundOrder({ orderNumber: id, amountDollars: input.amountDollars });
  }
  const cents = input.amountDollars ? Math.round(input.amountDollars * 100) : undefined;
  if (cents !== undefined && cents <= 0) {
    return { ok: false, message: 'Refund amount must be more than $0.' };
  }

  const refund = await createRefund({ transferId: id, amountCents: cents });
  if (!refund.ok) {
    return { ok: false, message: `Refund failed (${refund.code}). Check the transfer in the Frame dashboard.` };
  }
  // Profit: if this payment belongs to an order, record what is now refunded.
  if (supabaseAdminConfigured()) await syncProcessorAmounts(createSupabaseAdminClient(), id);
  return { ok: true, message: `Refund ${refund.data.status}.` };
}

/**
 * Refund an order by its order number.
 *
 * A raw transfer id is fine for a one-off, but it makes the operator go to
 * the processor's dashboard, find the payment, copy the id and come back —
 * which is most of the work they were trying to avoid. The order already
 * carries its charge, so refunding from the order is one click.
 *
 * The refund is recorded on the order timeline and the paid flag is cleared on
 * a full refund, so the member's own order page tells the same story as the
 * processor.
 */
export async function adminRefundOrder(input: {
  orderNumber: string;
  amountDollars?: number;
  reason?: string;
}): Promise<AdminBillingResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  if (!supabaseAdminConfigured()) {
    return { ok: false, message: 'Database is not configured.' };
  }

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select(
      'id, order_number, status, total_cents, member_email, member_name, frame_transfer_id, paid_confirmed_at',
    )
    .eq('order_number', input.orderNumber.trim())
    .maybeSingle();

  if (!order) return { ok: false, message: 'No order with that number.' };
  if (!order.frame_transfer_id) {
    return {
      ok: false,
      message: 'That order has no payment to refund — nothing was ever charged.',
    };
  }
  if (!order.paid_confirmed_at) {
    return {
      ok: false,
      message: 'That order is not marked paid. Check the Frame dashboard before refunding.',
    };
  }

  const cents = input.amountDollars
    ? Math.round(input.amountDollars * 100)
    : undefined;
  if (cents !== undefined && (cents <= 0 || cents > (order.total_cents ?? 0))) {
    return { ok: false, message: 'Refund amount must be between $0 and the order total.' };
  }

  try {
    // The id on the row is only trusted as far as the charge's own metadata
    // agrees.
    const t = await getTransfer(order.frame_transfer_id);
    if (!t.ok) return { ok: false, message: `Could not read the payment (${t.code}). Try again.` };
    if (!intentBelongsTo(t.data, order)) {
      return {
        ok: false,
        message: 'The payment on file does not belong to this order. Refund it from the Frame dashboard directly.',
      };
    }
    const full = cents === undefined || cents === order.total_cents;

    /*
     * A full refund of an order that has not shipped is a cancellation. Left
     * as a refund alone, the order stayed live: the board still offered it to
     * place, the plan kept renewing, and the pharmacy could still ship it. The
     * cancel path does all of it in one go (and refunds, so it is not done
     * twice here). A partial refund leaves the order as it is.
     */
    if (full && ORDER_FROM.deny.includes(order.status)) {
      const cancelled = await denyOrderAction(
        order.order_number,
        input.reason?.trim() || 'Refunded in full.',
      );
      if (cancelled.ok) {
        revalidatePath('/portal/admin/fulfillment');
        revalidatePath('/portal/orders');
        if (cancelled.refundError) {
          return {
            ok: false,
            message: `Cancelled ${order.order_number}, but the refund failed (${cancelled.refundError}). Refund it from the Frame dashboard.`,
          };
        }
        return {
          ok: true,
          message: `Refunded in full and cancelled ${order.order_number}.${
            cancelled.cancelByHand ? ' It was placed by hand: cancel it in the pharmacy portal too.' : ''
          }`,
        };
      }
      // It moved on (shipped meanwhile): refund it as a plain refund below.
    }

    const refund = await createRefund({ transferId: order.frame_transfer_id, amountCents: cents });
    if (!refund.ok) {
      return {
        ok: false,
        message:
          refund.code === 'bad_request'
            ? 'The refund was refused: more than is left to refund on this payment, or already refunded.'
            : `Refund failed (${refund.code}). Try again.`,
      };
    }
    const status = refund.data.status;
    await syncProcessorAmounts(db, order.frame_transfer_id); // profit: refunded_cents

    await db.from('order_updates').insert({
      order_id: order.id,
      label: full ? 'Refunded in full' : `Refunded $${(cents! / 100).toFixed(2)}`,
      body: input.reason?.trim() || null,
      author: 'Admin',
      author_role: 'admin',
    });

    // Only a full refund un-pays the order; a partial one leaves it paid.
    if (full) {
      await db
        .from('orders')
        .update({ paid_confirmed_at: null })
        .eq('id', order.id);
    }

    if (order.member_email) {
      const msg = refundedEmail({
        firstName: (order.member_name ?? '').trim().split(/\s+/)[0] || 'there',
        orderNumber: order.order_number,
        amount: cents ?? order.total_cents ?? 0,
        full,
        reason: input.reason?.trim() || undefined,
      });
      try {
        await sendEmail({ to: order.member_email, subject: msg.subject, html: msg.html });
      } catch {
        // The money has already moved — a failed receipt must not look like a
        // failed refund.
      }
    }

    revalidatePath('/portal/admin/fulfillment');
    revalidatePath('/portal/orders');
    return {
      ok: true,
      message: `Refund ${status} for ${order.order_number}.`,
    };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}
