'use server';

/**
 * Automated commercial screening — the admin step, done by machine.
 *
 * This replaces a human checking whether an order looks legitimate before it
 * reaches the prescriber. It is explicitly *not* a clinical decision: nothing
 * here decides whether someone should receive medicine. That is Dr. Elder's
 * job and the screen never touches it.
 *
 * Two layers, in this order:
 *
 *   1. Deterministic gates. Duplicates, PO boxes, freight forwarders,
 *      implausible values. These are queries and regexes, not judgement, and
 *      running them first means the model is never asked something a database
 *      already knows.
 *
 *   2. Claude, for the ambiguous remainder — a name that does not match the
 *      account, an address that parses but reads wrong, intake answers that
 *      contradict each other.
 *
 * The asymmetry is deliberate: releasing a bad order costs a refund, holding a
 * good one costs a few hours. So the model may HOLD on its own judgement but
 * may only RELEASE when nothing tripped. Every decision is written to the
 * order timeline, so a human can always see what was decided and why.
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { sendEmail, newVisitForDoctorEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';
import { SITE_URL } from '@/lib/site';
import { formatPhone } from '@/lib/format';

export async function autoScreenConfigured(): Promise<boolean> {
  return Boolean(process.env.ANTHROPIC_API_KEY) && supabaseAdminConfigured();
}

/** Mailbox stores and freight forwarders — not a residence, not shippable. */
const PO_BOX = /\b(p\.?\s*o\.?\s*box|post\s*office\s*box|postal\s*box)\b/i;
const FORWARDER =
  /\b(mailbox|mail\s*box|pmb|shipito|myus|stackry|reship|forward(ing)?\s*(service|agent)|freight\s*forward)/i;

const ScreenDecision = z.object({
  decision: z
    .enum(['release', 'hold'])
    .describe('release to the prescriber, or hold for a human to look at'),
  reason: z
    .string()
    .describe(
      'One sentence a non-technical operator can act on. Name the specific thing you saw.',
    ),
  concerns: z
    .array(z.string())
    .describe('Each distinct concern, empty when there are none'),
});

interface Gate {
  held: boolean;
  reasons: string[];
}

/** Everything a database can answer without asking a model. */
async function deterministicGates(
  db: ReturnType<typeof createSupabaseAdminClient>,
  order: {
    id: string;
    user_id: string | null;
    member_name: string | null;
    total_cents: number | null;
    shipping_address: unknown;
  },
): Promise<Gate> {
  const reasons: string[] = [];
  const a = (order.shipping_address ?? {}) as Record<string, string>;
  const line = `${a.line1 ?? ''} ${a.line2 ?? ''}`.trim();

  if (!line) reasons.push('No street address on the order.');
  if (PO_BOX.test(line)) {
    reasons.push('Ships to a PO box — a prescription cannot be delivered there.');
  }
  if (FORWARDER.test(line)) {
    reasons.push('Address looks like a mail forwarder or freight forwarder.');
  }
  if (!a.zip || !/^\d{5}(-\d{4})?$/.test(a.zip)) {
    reasons.push('ZIP code is missing or malformed.');
  }

  // A second order from the same member within a day is far more often a
  // double submit or a stolen account than genuine demand.
  if (order.user_id) {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count } = await db
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', order.user_id)
      .neq('id', order.id)
      .gte('created_at', since);
    if ((count ?? 0) > 0) {
      reasons.push(`Member placed ${count} other order(s) in the last 24 hours.`);
    }
  }

  // An unusually large first order is the classic stolen-card pattern.
  if ((order.total_cents ?? 0) > 150000) {
    reasons.push('Order value is over $1,500.');
  }

  return { held: reasons.length > 0, reasons };
}

/**
 * Screen one order. Releases it to the prescriber or leaves it for a human,
 * and notifies the doctor by email and SMS on release.
 */
export async function autoScreenOrder(orderNumber: string): Promise<{
  ok: boolean;
  decision?: 'release' | 'hold';
  reason?: string;
  error?: string;
}> {
  if (!supabaseAdminConfigured()) return { ok: false, error: 'not_configured' };

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select(
      'id, order_number, user_id, member_name, member_email, status, total_cents, shipping_address, promo_code',
    )
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (!order) return { ok: false, error: 'not_found' };
  // Only screen what is actually waiting on the admin step.
  if (order.status !== 'pending-admin') return { ok: true, decision: 'hold' };

  const gates = await deterministicGates(db, order);

  let decision: 'release' | 'hold' = gates.held ? 'hold' : 'release';
  let reason = gates.held
    ? gates.reasons.join(' ')
    : 'Nothing flagged on the automated checks.';

  // Only ask the model about orders the cheap checks did not already settle.
  if (!gates.held && process.env.ANTHROPIC_API_KEY) {
    try {
      const { data: profile } = order.user_id
        ? await db
            .from('profiles')
            .select('full_name, email, phone, created_at')
            .eq('id', order.user_id)
            .maybeSingle()
        : { data: null };

      const { data: intake } = order.user_id
        ? await db
            .from('intake_submissions')
            .select('answers')
            .eq('user_id', order.user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null };

      const a = (order.shipping_address ?? {}) as Record<string, string>;
      const ans = (intake?.answers ?? {}) as Record<string, unknown>;

      const client = new Anthropic();
      const res = await client.messages.parse({
        model: 'claude-opus-5',
        max_tokens: 2000,
        thinking: { type: 'adaptive' },
        output_config: { format: zodOutputFormat(ScreenDecision) },
        system: [
          'You screen orders for a New Jersey telehealth pharmacy for COMMERCIAL risk only.',
          '',
          'You are NOT making a medical decision. Never consider whether the person should receive treatment, whether a peptide suits them, or anything about their health beyond obvious internal contradictions. A licensed physician reviews the clinical side after you and that is not your job.',
          '',
          'You are looking for: a name that does not match the account holder, an address that parses but is implausible or commercial, contradictory or nonsense intake answers, or anything that reads like account takeover or card testing.',
          '',
          'Bias: releasing a fraudulent order costs a chargeback; holding a legitimate one costs a few hours. When genuinely uncertain, hold. But do not hold for ordinary things — a nickname, a flat or unit number, a work address, or an unusual but real name are all normal.',
        ].join('\n'),
        messages: [
          {
            role: 'user',
            content: [
              `Order ${order.order_number} — $${((order.total_cents ?? 0) / 100).toFixed(2)}`,
              order.promo_code ? `Promo code used: ${order.promo_code}` : '',
              '',
              'ACCOUNT',
              `Name: ${profile?.full_name ?? '—'}`,
              `Email: ${profile?.email ?? '—'}`,
              `Phone: ${formatPhone(profile?.phone) || '—'}`,
              `Registered: ${profile?.created_at ?? '—'}`,
              '',
              'SHIPPING TO',
              `Name: ${a.fullName ?? '—'}`,
              `${a.line1 ?? ''} ${a.line2 ?? ''}`.trim(),
              `${a.city ?? ''}, ${a.state ?? ''} ${a.zip ?? ''}`,
              '',
              'INTAKE (non-clinical fields only)',
              `First name: ${String(ans.first_name ?? '—')}`,
              `Last name: ${String(ans.last_name ?? '—')}`,
              `Date of birth: ${String(ans.dob ?? '—')}`,
              `ZIP given at intake: ${String(ans.zip ?? '—')}`,
              `Phone given at intake: ${formatPhone(String(ans.phone ?? '')) || '—'}`,
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
      });

      const parsed = res.parsed_output;
      if (parsed) {
        decision = parsed.decision;
        reason = parsed.reason;
      }
    } catch (err) {
      // A model outage must not stop orders moving, but it must not
      // rubber-stamp them either — a human picks these up.
      decision = 'hold';
      reason = `Automated review unavailable (${
        err instanceof Error ? err.message : 'unknown error'
      }). Held for manual screening.`;
    }
  }

  await db.from('order_updates').insert({
    order_id: order.id,
    label: decision === 'release' ? 'Auto-screened — released' : 'Auto-screened — held',
    body: reason,
    author: 'Automated screening',
    author_role: 'system',
  });

  if (decision === 'release') {
    await db
      .from('orders')
      .update({ status: 'assigned', admin_note: `Auto-released: ${reason}` })
      .eq('id', order.id);
    await notifyDoctor(db, order.order_number, order.member_name ?? 'A member');
  } else {
    await db
      .from('orders')
      .update({ admin_note: `Held by automated screening: ${reason}` })
      .eq('id', order.id);
  }

  revalidatePath('/portal/admin/queue');
  revalidatePath('/portal/doctor');
  return { ok: true, decision, reason };
}

/** Email and text every doctor that something is waiting. */
async function notifyDoctor(
  db: ReturnType<typeof createSupabaseAdminClient>,
  orderNumber: string,
  memberName: string,
): Promise<void> {
  const { data: doctors } = await db
    .from('profiles')
    .select('full_name, email, phone')
    .eq('role', 'doctor')
    .eq('account_status', 'active');

  for (const doc of doctors ?? []) {
    const firstName = (doc.full_name ?? '').trim().split(/\s+/)[0] || 'Doctor';
    if (doc.email) {
      const msg = newVisitForDoctorEmail({
        firstName,
        memberName,
        orderNumber,
        queueUrl: `${SITE_URL}/portal/doctor`,
      });
      try {
        await sendEmail({ to: doc.email, subject: msg.subject, html: msg.html });
      } catch {
        // A failed notification must not roll back the release.
      }
    }
    if (doc.phone) {
      try {
        await sendSms(
          doc.phone,
          `Eternal Longevity: a visit is ready for review — ${memberName}, order ${orderNumber}. ${SITE_URL}/portal/doctor`,
        );
      } catch {
        // Same: best effort.
      }
    }
  }
}
