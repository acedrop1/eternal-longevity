/**
 * Transactional email via Resend.
 *
 * Server-only. Every send is a no-op (logged, not thrown) when RESEND_API_KEY
 * is missing, so the demo and the build are never blocked by email config.
 *
 * NOTE: order confirmations and clinical messages contain PHI. Before sending
 * real patient email, sign a BAA with Resend and confirm your plan covers it.
 */
import 'server-only';
import { Resend } from 'resend';
import { BUSINESS_ADDRESS, BUSINESS_LEGAL_NAME, SITE_URL } from '@/lib/site';
import { orderRef } from '@/lib/format';
import type { Stage } from '@/lib/followups';

let cached: Resend | null = null;

/** True when RESEND_API_KEY is present. */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function getResend(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Resend is not configured. Set RESEND_API_KEY.');
  cached = new Resend(key);
  return cached;
}

/** Every outbound message sends from — and replies to — the support inbox. */
export const SUPPORT_EMAIL = process.env.CARE_TEAM_EMAIL || 'support@etlongevity.com';

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || `Eternal Longevity <${SUPPORT_EMAIL}>`;

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  /** Extra headers, e.g. List-Unsubscribe on reminder email. */
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/** Send one email. Resolves with { ok: false } instead of throwing on failure. */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  if (!emailConfigured()) {
    console.warn(`[email] Resend not configured — skipped: "${input.subject}"`);
    return { ok: false, error: 'not_configured' };
  }
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      html: input.html,
      replyTo: input.replyTo ?? SUPPORT_EMAIL,
      headers: input.headers,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown error',
    };
  }
}

/* -------------------------------------------------------------------------- */
/*  Templates                                                                 */
/* -------------------------------------------------------------------------- */

/* Brand tokens. Hex, not rgba: Outlook's Word engine drops rgba borders.
   HAIRLINE is rgba(17,17,17,0.08) flattened over the milk panel. */
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const INK = '#111111';
const MUTED = '#55565A';
const MILK = '#F4F4F2';
const BUTTER = '#FFEC9F';
const HAIRLINE = '#E3E3E1';
const H1 = `margin:0 0 14px;color:${INK};font-family:${FONT};font-size:27px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;`;
const EYEBROW = `margin:0 0 10px;color:${MUTED};font-size:12px;letter-spacing:0.12em;font-weight:600;`;
const PANEL = `background:${MILK};border-radius:18px;`;

/**
 * Wrap body content in a minimal branded shell. Reminder and marketing email
 * passes `unsubscribeUrl`, which adds the opt-out line to the footer.
 */
export function shell(body: string, opts?: { unsubscribeUrl?: string }): string {
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body style="margin:0;background:${MILK};padding:0;font-family:${FONT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${MILK};"><tr><td align="center" style="padding:40px 16px;">
    <!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:28px;">
      <tr><td style="padding:36px 36px 8px;font-family:${FONT};color:${INK};">
        <!-- The real logo; its alt text reads as the wordmark when images are blocked. -->
        <img src="${SITE_URL}/brand/email-logo.png" width="160" height="53" alt="eternal longevity" style="display:block;border:0;outline:none;width:160px;height:auto;font-size:24px;font-weight:600;color:#111111;" />
      </td></tr>
      <tr><td style="padding:24px 36px 36px;font-family:${FONT};color:${INK};font-size:15px;line-height:1.6;">
        ${body}
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:20px 36px 0;font-family:${FONT};color:${MUTED};font-size:12px;line-height:1.5;">
        Prescribed by a licensed physician. Dispensed by a licensed U.S. pharmacy.<br />
        This message may contain confidential information intended only for the
        named recipient.<br />
        ${BUSINESS_LEGAL_NAME} · ${BUSINESS_ADDRESS}${
          opts?.unsubscribeUrl
            ? `<br /><br />Don&rsquo;t want these reminders? <a href="${escapeHtml(
                opts.unsubscribeUrl,
              )}" style="color:${MUTED};text-decoration:underline;">Unsubscribe</a>.`
            : ''
        }
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr></table>
</body></html>`;
}

/**
 * Plain text into email HTML: escaped, with line breaks kept.
 *
 * Everything a caller hands to dataRows or noticeEmail goes through this, so a
 * member's name, a user agent or a contact-form message can never become
 * markup. Callers pass plain text — never pre-escaped, never HTML.
 */
function text(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, '<br/>');
}

/** A label/value block — the shape every operational email needs. Values are plain text. */
export function dataRows(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${PANEL}margin:18px 0;">
    ${rows
      .map(([k, v], i) => {
        const line = i < rows.length - 1 ? `border-bottom:1px solid ${HAIRLINE};` : '';
        return `<tr><td style="padding:12px 20px;${line}color:${MUTED};font-size:12px;letter-spacing:0.08em;width:40%;vertical-align:top;">${escapeHtml(
          k,
        ).toUpperCase()}</td><td style="padding:12px 20px;${line}color:${INK};font-size:14px;">${text(v)}</td></tr>`;
      })
      .join('')}
  </table>`;
}

/**
 * Everything the team gets told about, in the same frame as everything else.
 *
 * Half the operational mail was bare <p> tags — it arrived looking like a
 * script had written it, which is a poor look in a shared support inbox and a
 * worse one when the recipient is a pharmacy deciding whether to work with you.
 */
export function noticeEmail(input: {
  eyebrow: string;
  heading: string;
  /** Plain text, like every other field here. */
  body?: string;
  rows?: [string, string][];
  cta?: { label: string; href: string };
  footnote?: string;
  unsubscribeUrl?: string;
}): string {
  return shell(
    `<div style="${EYEBROW}">${escapeHtml(
      input.eyebrow,
    ).toUpperCase()}</div>
     <h1 style="${H1}">${escapeHtml(
       input.heading,
     )}</h1>
     ${input.body ? `<p style="margin:0 0 16px;">${text(input.body)}</p>` : ''}
     ${input.rows?.length ? dataRows(input.rows) : ''}
     ${input.cta ? `<div style="margin:24px 0 0;">${button(input.cta.label, input.cta.href)}</div>` : ''}
     ${
       input.footnote
         ? `<p style="margin:18px 0 0;color:${MUTED};font-size:13px;">${text(input.footnote)}</p>`
         : ''
     }`,
    { unsubscribeUrl: input.unsubscribeUrl },
  );
}

/** Their order has left the pharmacy. */
export function shippedEmail(input: {
  firstName: string;
  orderRef: string;
  carrier: string;
  tracking: string;
}): { subject: string; html: string } {
  return {
    subject: `Your ${orderRef(input.orderRef)} has shipped`,
    html: noticeEmail({
      eyebrow: 'On its way',
      heading: `Good news, ${input.firstName} — your order has shipped.`,
      rows: [
        ['Order', input.orderRef],
        ['Carrier', input.carrier],
        ['Tracking', input.tracking],
      ],
      footnote:
        'Store it as the label directs. Temperature-sensitive medications ship cold-chain — if yours says to refrigerate, do so on arrival.',
    }),
  };
}

/** Their order has arrived. */
export function deliveredEmail(input: {
  firstName: string;
  orderRef: string;
}): { subject: string; html: string } {
  return {
    subject: `Your ${orderRef(input.orderRef)} has been delivered`,
    html: noticeEmail({
      eyebrow: 'Delivered',
      heading: `${input.firstName}, your order has arrived.`,
      rows: [['Order', input.orderRef]],
      body: 'Store it as the label directs — refrigerate on arrival if it says to. Questions about dosing go to your prescriber through the portal.',
      cta: { label: 'Open your portal', href: `${SITE_URL}/portal/orders` },
    }),
  };
}

/**
 * To admin and the prescriber: a paid order is waiting to be placed on the
 * pharmacy's platform. Names and products only; the address, date of birth
 * and prescriber details sit behind the sign-in, not in an inbox.
 */
export function readyToPlaceEmail(input: {
  orderRef: string;
  patientName: string;
  items: string;
  refill: boolean;
  portalUrl: string;
}): { subject: string; html: string } {
  return {
    // Names and items stay in the body, behind the recipient's inbox — not in
    // a subject line that shows on lock screens and notification previews.
    subject: `Ready to place: ${input.orderRef}${input.refill ? ' (refill)' : ''}`,
    html: noticeEmail({
      eyebrow: input.refill ? 'Refill to place' : 'New order to place',
      heading: 'A paid order is waiting to be placed with the pharmacy',
      body: 'Place it in the MedShiftRx portal, then mark it placed so nobody places it twice. Everything you need to enter is on the order.',
      rows: [
        ['Order', input.orderRef],
        ['Patient', input.patientName],
        ['Items', input.items],
      ],
      cta: { label: 'Open the orders board', href: input.portalUrl },
      footnote: 'Admin and the prescriber both get this. Whoever places it marks it placed.',
    }),
  };
}

/** To the member: their refill payment didn't go through. */
export function renewalFailedMemberEmail(input: {
  firstName: string;
  productName: string;
}): { subject: string; html: string } {
  return {
    // No drug name: a member's inbox is not always only theirs to read.
    subject: 'Action needed: your refill payment didn’t go through',
    html: noticeEmail({
      eyebrow: 'Payment issue',
      heading: `${input.firstName}, we couldn’t charge your card for your refill.`,
      body: 'Your plan is paused, so nothing will ship until the card is updated. Add or update your card and we’ll pick it straight back up.',
      cta: { label: 'Update your card', href: `${SITE_URL}/portal/account` },
      footnote: 'If you meant to stop, you don’t need to do anything.',
    }),
  };
}

/** To admin and the prescriber: a refill didn't charge, or couldn't. */
export function renewalFailedTeamEmail(input: {
  patientName: string;
  patientEmail: string;
  productName: string;
  amountCents: number;
  reason: string;
}): { subject: string; html: string } {
  return {
    subject: `Refill not charged · $${(input.amountCents / 100).toFixed(2)}`,
    html: noticeEmail({
      eyebrow: 'Refill failed',
      heading: 'A refill was not charged and will not ship',
      body: 'The plan is paused and the patient has been emailed a link to update their card. Nothing needs placing with the pharmacy.',
      rows: [
        ['Patient', `${input.patientName} · ${input.patientEmail}`],
        ['Plan', input.productName],
        ['Amount', `$${(input.amountCents / 100).toFixed(2)}`],
        ['Reason', input.reason],
      ],
      cta: { label: 'Open the orders board', href: `${SITE_URL}/portal/admin/fulfillment` },
    }),
  };
}

/**
 * A log-in prompt for the pharmacy. Deliberately carries no patient detail —
 * the record lives behind their sign-in, not in an inbox.
 */
export function pharmacyQueueEmail(orderRef: string, portalUrl: string): {
  subject: string;
  html: string;
} {
  return {
    subject: `New fulfillment order — ${orderRef}`,
    html: noticeEmail({
      eyebrow: 'Pharmacy queue',
      heading: 'A new order is waiting for you',
      body: 'Sign in to see the patient, the shipping address and the prescription, then add tracking when it ships.',
      rows: [['Reference', orderRef]],
      cta: { label: 'Open the pharmacy portal', href: portalUrl },
    }),
  };
}

/** Sent to the patient right after they finish intake. */
export function intakeConfirmationEmail(firstName: string): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Your account is ready — Eternal Longevity',
    html: shell(
      `<div style="${EYEBROW}">WELCOME</div>
       <h1 style="${H1}">Hi ${escapeHtml(
         firstName,
       )}, your account is ready.</h1>
       <p>Welcome to Eternal Longevity. Your portal is where everything lives:
       messages with your care team, your treatment details, refills and order
       tracking.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${PANEL}margin:18px 0;">
         <tr><td style="padding:18px 20px;color:${INK};font-size:14px;line-height:1.6;">
           <div style="${EYEBROW}">WHAT HAPPENS NEXT</div>
           <p style="margin:0 0 10px;"><strong style="color:${INK};">1. Finish checkout.</strong><br/>
           Your card is saved, not charged. You're only charged if a licensed physician approves your treatment.</p>
           <p style="margin:0 0 10px;"><strong style="color:${INK};">2. Add anything your physician needs.</strong><br/>
           Some treatments need a couple of photos. If yours does, your portal will show it.</p>
           <p style="margin:0;"><strong style="color:${INK};">3. Your treatment ships discreetly.</strong><br/>
           Tracking is added to your order the moment it leaves the pharmacy.</p>
         </td></tr>
       </table>
       <div style="margin:18px 0 6px;">
         ${button('Go to my portal', `${SITE_URL}/portal`)}
       </div>`,
    ),
  };
}

/** Branded password-reset email — replaces Supabase's default sender. */
export function passwordResetEmail(link: string): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Reset your password — Eternal Longevity',
    html: shell(
      `<h1 style="${H1}">Reset your password.</h1>
       <p>We received a request to reset the password on your Eternal Longevity
       account. The link below is valid for one hour and can be used once.</p>
       <div style="margin:20px 0;">
         ${button('Choose a new password', link)}
       </div>
       <p style="color:${MUTED};font-size:13px;">If you didn't request this, you
       can safely ignore this email — your password won't change.</p>`,
    ),
  };
}

/** Internal notification to the care team that a new intake landed. */
export function intakeReceivedTeamEmail(
  caseId: string,
  patientEmail: string,
  patientName?: string,
): { subject: string; html: string } {
  const who = (patientName ?? '').trim() || patientEmail;
  return {
    subject: 'New intake to review',
    html: noticeEmail({
      eyebrow: 'New intake',
      heading: `${who} submitted an intake`,
      body: 'Open the clinical queue to review and assign it.',
      rows: [
        ['Patient', who],
        ['Email', patientEmail],
        ['Case', caseId],
      ],
    }),
  };
}

/** Sent when an order ships. */
export function shipmentEmail(
  firstName: string,
  orderNumber: string,
  carrier: string,
  tracking: string,
): { subject: string; html: string } {
  return {
    subject: `Your ${orderRef(orderNumber)} has shipped`,
    html: shell(
      `<h1 style="${H1}">On its way, ${escapeHtml(
        firstName,
      )}.</h1>
       <p>Order <strong style="color:${INK};">${escapeHtml(
         orderNumber,
       )}</strong> shipped via ${escapeHtml(carrier)}.</p>
       <p><strong style="color:${INK};">Tracking:</strong> ${escapeHtml(tracking)}</p>
       <p>Store it as the label directs — refrigerate on arrival if it says to.</p>`,
    ),
  };
}

/**
 * Sent when an admin creates an account for someone — member, doctor,
 * pharmacy, or admin. Carries a one-time link to set a password, never the
 * password itself: a password in an inbox stays readable for as long as the
 * mailbox does.
 */
export function welcomeEmail(input: {
  fullName: string;
  email: string;
  setPasswordUrl: string;
  role: 'member' | 'doctor' | 'pharmacy' | 'admin';
}): { subject: string; html: string } {
  const firstName = input.fullName.trim().split(/\s+/)[0] || 'there';
  const intro: Record<string, string> = {
    member:
      'Your account is ready. Sign in any time to view your protocol, track orders, and manage your subscription.',
    doctor:
      'Your clinical account is ready. Sign in to review approved intakes and sign or decline prescriptions.',
    pharmacy:
      'Your fulfillment account is ready. Sign in to accept released orders and add shipment tracking.',
    admin:
      'Your admin account is ready. Sign in to manage intakes, billing, orders, and users.',
  };
  return {
    subject: 'Your Eternal Longevity account is ready',
    html: shell(
      `<h1 style="${H1}">Welcome, ${escapeHtml(
        firstName,
      )}.</h1>
       <p>${intro[input.role] ?? intro.member}</p>
       ${dataRows([['Sign-in email', input.email]])}
       <div style="margin:18px 0;">
         ${button('Set your password', input.setPasswordUrl)}
       </div>
       <p style="color:${MUTED};font-size:13px;">The link works once and expires soon. If it has, use &ldquo;Forgot password&rdquo; on the sign-in page to get a fresh one.</p>`,
    ),
  };
}

/** Sent to the customer once payment succeeds. */
export function orderConfirmationEmail(input: {
  firstName: string;
  orderNumber: string;
  items: { name: string; qty: number; amount: number }[];
  total: number;
}): { subject: string; html: string } {
  const rows = input.items
    .map(
      // No drug names in member email; the portal has the detail.
      (i, n) => `<tr>
        <td style="padding:12px 20px;border-bottom:1px solid ${HAIRLINE};color:${INK};font-size:14px;">Treatment${
          input.items.length > 1 ? ` ${n + 1}` : ''
        }${i.qty > 1 ? ` &times;${i.qty}` : ''}</td>
        <td style="padding:12px 20px;border-bottom:1px solid ${HAIRLINE};color:${INK};font-size:14px;" align="right">$${(
          i.amount / 100
        ).toFixed(2)}</td>
      </tr>`,
    )
    .join('');
  return {
    subject: `Order confirmed — ${orderRef(input.orderNumber)}`,
    html: shell(
      `<h1 style="${H1}">Your order is confirmed.</h1>
       <p style="margin:0 0 18px;">Thanks ${escapeHtml(
         input.firstName,
       )} — we've received your order. It goes to our partner 503A pharmacy for compounding, and you'll get tracking as soon as it ships.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${PANEL}margin:8px 0 18px;">
         ${rows}
         <tr>
           <td style="padding:14px 20px;color:${MUTED};font-size:13px;">Total</td>
           <td style="padding:14px 20px;color:${INK};font-size:18px;font-weight:600;" align="right">$${(
             input.total / 100
           ).toFixed(2)}</td>
         </tr>
       </table>
       <p style="color:${MUTED};font-size:13px;">Order reference <strong style="color:${INK};">${escapeHtml(
         input.orderNumber,
       )}</strong>. See the details in <a href="${SITE_URL}/portal/orders" style="color:${INK};">your portal</a>, or just reply to this email.</p>`,
    ),
  };
}

/** Order received — nothing charged yet, prescriber is reviewing. */
/**
 * Sent when a prescriber declines. The whole promise of this service is that
 * nothing happens without a decision — so the member has to be told when the
 * decision is no, and told that they were not charged.
 */
/**
 * The one call-to-action button. A table cell carries the butter fill and padding so Outlook
 * (which ignores padding and radius on links) still shows a solid button; everywhere else it's a pill.
 */
function button(label: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;"><tr><td align="center" bgcolor="${BUTTER}" style="background:${BUTTER};border-radius:999px;padding:14px 26px;"><a href="${escapeHtml(
    href,
  )}" style="color:${INK};text-decoration:none;font-family:${FONT};font-weight:600;font-size:15px;line-height:1;display:inline-block;">${escapeHtml(
    label,
  )}</a></td></tr></table>`;
}

/** Sent when an order is refunded, in full or in part. */
export function refundedEmail(input: {
  firstName: string;
  orderNumber: string;
  amount: number;
  full: boolean;
  reason?: string;
}): { subject: string; html: string } {
  const amt = `$${(input.amount / 100).toFixed(2)}`;
  return {
    subject: `Refund issued — ${orderRef(input.orderNumber)}`,
    html: shell(
      `<h1 style="${H1}">We have refunded ${escapeHtml(
        amt,
      )}.</h1>
       <p style="margin:0 0 18px;">Hi ${escapeHtml(
         input.firstName,
       )} — we have issued ${
         input.full ? 'a full refund' : `a partial refund of ${escapeHtml(amt)}`
       } on order ${escapeHtml(input.orderNumber)}.</p>
       ${
         input.reason
           ? `<p style="margin:0 0 18px;padding:16px 18px;${PANEL}">${escapeHtml(
               input.reason,
             )}</p>`
           : ''
       }
       <p style="margin:0 0 18px;">It goes back to the card you paid with. Banks usually post it within 5–10 business days — it is out of our hands once Stripe sends it.</p>
       <p style="margin:0;">Questions? Just reply to this email.</p>`,
    ),
  };
}

/** A visit cleared automated screening and is waiting on the prescriber. */
export function newVisitForDoctorEmail(input: {
  firstName: string;
  memberName: string;
  orderNumber: string;
  queueUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Visit ready for review — ${orderRef(input.orderNumber)}`,
    html: shell(
      `<div style="${EYEBROW}">CLINICAL QUEUE</div>
       <h1 style="${H1}">A visit is waiting for you.</h1>
       <p style="margin:0 0 18px;">Dr. ${escapeHtml(
         input.firstName,
       )} — <strong style="color:${INK};">${escapeHtml(
         input.memberName,
       )}</strong> has completed their intake and their order cleared automated screening. Order ${escapeHtml(
         input.orderNumber,
       )}.</p>
       <p style="margin:0 0 18px;">The screening checks addresses, duplicates and payment risk only. Every clinical decision is yours.</p>
       ${button('Open the clinical queue', input.queueUrl)}
       <p style="margin:22px 0 0;color:${MUTED};font-size:12px;">The member is not charged until you sign.</p>`,
    ),
  };
}

/** A signed prescription whose charge failed. Goes to the team, not the doctor. */
export function chargeFailedInternalEmail(input: {
  orderNumber: string;
  memberName: string;
  memberEmail: string;
  amount: number;
  reason: string;
}): { subject: string; html: string } {
  return {
    subject: `Charge failed on a SIGNED order — ${orderRef(input.orderNumber)}`,
    html: shell(
      `<h1 style="${H1}">A signed prescription did not get paid.</h1>
       <p style="margin:0 0 18px;">The prescriber approved <strong style="color:${INK};">${escapeHtml(
         input.orderNumber,
       )}</strong> and the saved card was declined. The member has been emailed a payment link; the prescriber has not been told and does not need to be.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${PANEL}margin:0 0 18px;">
         <tr><td style="padding:16px 20px;color:${INK};font-size:14px;">
           <strong style="color:${INK};">${escapeHtml(input.memberName)}</strong><br/>
           <span style="color:${MUTED};">${escapeHtml(input.memberEmail)}</span><br/>
           <span style="color:${MUTED};">Amount:</span> $${(input.amount / 100).toFixed(2)}<br/>
           <span style="color:${MUTED};">Stripe said:</span> ${escapeHtml(input.reason)}
         </td></tr>
       </table>
       <p style="margin:0;color:${MUTED};font-size:13px;"><strong style="color:${INK};">This order will not ship.</strong> Submitting to the pharmacy is blocked until it is paid.</p>`,
    ),
  };
}

/* ------------------------- funnel recovery ------------------------------- */

/**
 * One nudge for a member who left a full cart.
 *
 * Deliberately restrained: no item names, the honest reassurance that ordering
 * costs nothing until a prescriber approves, one link, and a real way to stop
 * hearing from us. It is sent once per abandonment and never again for the
 * same cart.
 */
export function abandonedCartEmail(input: {
  firstName: string;
  items: { name: string; cadence: string }[];
  cartUrl: string;
  unsubscribeUrl?: string;
}): { subject: string; html: string } {
  // No item names: the cart is in the portal, and this lands unannounced.
  const count = input.items.length;
  return {
    subject: 'Still thinking it over?',
    html: shell(
      `<h1 style="${H1}">You left something in your cart.</h1>
       <p style="margin:0 0 18px;">Hi ${escapeHtml(
         input.firstName,
       )} — your cart${count > 1 ? ` (${count} items)` : ''} is still saved in your portal.</p>
       <p style="margin:0 0 22px;">Placing the order does not charge you. A licensed prescriber reviews it first, and only if they approve do we send a secure link to pay.</p>
       ${button('Pick up where you left off', input.cartUrl)}
       <p style="margin:22px 0 0;color:${MUTED};font-size:12px;">Do not want reminders like this? Turn them off under Notifications in your account.</p>`,
      { unsubscribeUrl: input.unsubscribeUrl },
    ),
  };
}

/**
 * One nudge for someone whose visit is unfinished.
 *
 * Worth more than the cart nudge: they already gave us an email, a history and
 * an intent, and are blocked on a step they may not realise is outstanding.
 */
export function unfinishedVisitEmail(input: {
  firstName: string;
  visitUrl: string;
}): { subject: string; html: string } {
  return {
    subject: 'Your visit is one step from a prescriber',
    html: shell(
      `<h1 style="${H1}">Your visit is not finished yet.</h1>
       <p style="margin:0 0 18px;">Hi ${escapeHtml(
         input.firstName,
       )} — your account is set up, but a prescriber cannot review anything until the medical questions are answered. It is four short screens and takes about a minute.</p>
       <p style="margin:0 0 22px;">Nothing is charged for completing it, and nothing is charged unless a prescriber approves your treatment.</p>
       ${button('Finish your visit', input.visitUrl)}
       <p style="margin:22px 0 0;color:${MUTED};font-size:12px;">If you have changed your mind, you can ignore this — we will not send another.</p>`,
    ),
  };
}

/**
 * Admin needs something more from the member before the prescriber sees it.
 *
 * The "Request info" button used to write a status and a note to the database
 * and stop there — the member was never told anything was wanted, so the case
 * simply sat.
 */
export function intakeNeedsInfoEmail(input: {
  firstName: string;
  note: string;
  portalUrl: string;
}): { subject: string; html: string } {
  return {
    subject: 'One more thing before your review',
    html: shell(
      `<h1 style="${H1}">We need a little more from you.</h1>
       <p style="margin:0 0 18px;">Hi ${escapeHtml(input.firstName)} — before a prescriber can review your visit, our team needs one more detail:</p>
       <p style="margin:0 0 18px;padding:16px 18px;${PANEL}">${escapeHtml(input.note)}</p>
       <p style="margin:0 0 18px;">Reply to this email, or message us from your portal. Nothing has been charged and nothing is waiting on you other than this.</p>
       ${button('Open your portal', input.portalUrl)}`,
    ),
  };
}

/** A standalone assessment has cleared admin triage and needs a signature. */
export function newIntakeForDoctorEmail(input: {
  firstName: string;
  memberName: string;
  caseId: string;
  queueUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Assessment ready to sign — case ${input.caseId}`,
    html: shell(
      `<h1 style="${H1}">An assessment is ready for you.</h1>
       <p style="margin:0 0 18px;">Hi Dr. ${escapeHtml(input.firstName)} — ${escapeHtml(input.memberName)} has cleared triage and is waiting on your review. Case ${escapeHtml(input.caseId)}.</p>
       <p style="margin:0 0 18px;">This one has no order attached, so nothing is charged either way. Sign to issue a prescription, or decline with a clinical note.</p>
       ${button('Open the queue', input.queueUrl)}`,
    ),
  };
}

/**
 * Admin closes a visit for a non-clinical reason.
 *
 * This exists because the admin decline used to send `declinedEmail`, which
 * tells the member "a licensed prescriber reviewed your visit and decided this
 * treatment is not appropriate" — untrue when nobody clinical has looked at it,
 * and it attributes a clinical decision to a prescriber who never made one.
 */
export function intakeClosedByTeamEmail(input: {
  firstName: string;
  reason: string;
}): { subject: string; html: string } {
  return {
    subject: 'About your Eternal Longevity visit',
    html: shell(
      `<h1 style="${H1}">We can&rsquo;t take this visit forward.</h1>
       <p style="margin:0 0 18px;">Hi ${escapeHtml(input.firstName)} — our team has closed your visit before it reached a prescriber. This is not a medical decision and no prescriber has reviewed your information.</p>
       <p style="margin:0 0 18px;padding:16px 18px;${PANEL}">${escapeHtml(input.reason)}</p>
       <p style="margin:0 0 18px;"><strong style="color:${INK};">You have not been charged anything.</strong> If you think this is a mistake, reply to this email and we will take another look.</p>`,
    ),
  };
}

/** A plan has run out of prescription and needs the prescriber again. */
export function planNeedsReviewEmail(input: {
  firstName: string;
  productName: string;
  portalUrl: string;
}): { subject: string; html: string } {
  return {
    subject: 'Your plan needs a quick review',
    html: shell(
      `<h1 style="${H1}">Time for a check-in.</h1>
       <p style="margin:0 0 18px;">Hi ${escapeHtml(input.firstName)} — your prescription has reached the end of its term, so your plan is paused until your prescriber reviews it again.</p>
       <p style="margin:0 0 18px;"><strong style="color:${INK};">You have not been charged</strong> and nothing has shipped. Open your portal and confirm nothing has changed in your health, and it goes straight back to him.</p>
       ${button('Review and restart', input.portalUrl)}`,
    ),
  };
}

/**
 * A message an admin writes by hand, in the brand's own frame.
 *
 * Support answering from a personal mailbox arrives looking like nothing to do
 * with us, which is exactly what a patient is told to be suspicious of. Line
 * breaks become paragraphs so nobody has to write HTML, and the body is escaped
 * because an admin typing an ampersand should not break the email.
 */
export function adminComposedEmail(input: {
  firstName: string;
  subject: string;
  body: string;
}): { subject: string; html: string } {
  const paragraphs = input.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`,
    )
    .join('');

  return {
    subject: input.subject,
    html: shell(
      `<p style="margin:0 0 16px;">Hi ${escapeHtml(input.firstName)},</p>
       ${paragraphs}
       <p style="margin:24px 0 0;color:${MUTED};font-size:13px;">— The Eternal Longevity team</p>`,
    ),
  };
}

/** The prescriber needs an answer before he can decide. */
export function prescriberQuestionEmail(input: {
  firstName: string;
  question: string;
  portalUrl: string;
}): { subject: string; html: string } {
  return {
    subject: 'Your prescriber has a question',
    html: shell(
      `<h1 style="${H1}">One question before your review.</h1>
       <p style="margin:0 0 18px;">Hi ${escapeHtml(input.firstName)} — your prescriber has read your visit and needs one more thing from you before deciding.</p>
       <p style="margin:0 0 18px;padding:16px 18px;${PANEL}">${escapeHtml(input.question)}</p>
       <p style="margin:0 0 18px;"><strong style="color:${INK};">Nothing has been charged</strong> and your order is still open. Reply in your portal and it goes straight back to him.</p>
       ${button('Answer in your portal', input.portalUrl)}`,
    ),
  };
}

export function declinedEmail(input: {
  firstName: string;
  reason?: string;
}): { subject: string; html: string } {
  return {
    subject: 'About your Eternal Longevity visit',
    html: shell(
      `<h1 style="${H1}">Your prescriber could not approve this treatment.</h1>
       <p style="margin:0 0 18px;">Thanks ${escapeHtml(input.firstName)}. A licensed prescriber reviewed your visit and decided this treatment is not appropriate for you right now. That is a clinical decision, and it is made to keep you safe.</p>
       <p style="margin:0 0 18px;"><strong style="color:${INK};">You have not been charged anything.</strong> There is no payment link and no order to cancel.</p>
       ${
         input.reason
           ? `<p style="margin:0 0 18px;padding:16px 18px;${PANEL}">${escapeHtml(input.reason)}</p>`
           : ''
       }
       <p style="margin:0 0 18px;">If you would like to talk it through, reply to this email or message us from your portal. We would also encourage you to raise it with your own physician.</p>`,
    ),
  };
}

/**
 * The team cancels an order before a prescriber has decided anything.
 *
 * Deliberately not `declinedEmail`: that one tells the member a licensed
 * prescriber reviewed their visit and judged the treatment inappropriate. When
 * the cancellation is operational — an address the pharmacy cannot ship to, a
 * duplicate, a member who asked — saying so would attribute a clinical decision
 * to a prescriber who never made one.
 */
export function orderCancelledByTeamEmail(input: {
  firstName: string;
  orderNumber: string;
  reason: string;
  refunded: boolean;
}): { subject: string; html: string } {
  return {
    subject: `We cancelled ${orderRef(input.orderNumber)}`,
    html: shell(
      `<h1 style="${H1}">We&rsquo;ve cancelled this order.</h1>
       <p style="margin:0 0 18px;">Hi ${escapeHtml(
         input.firstName,
       )} — our team cancelled ${escapeHtml(
         orderRef(input.orderNumber),
       )}. This is not a medical decision and no prescriber has reviewed it.</p>
       <p style="margin:0 0 18px;padding:16px 18px;${PANEL}">${escapeHtml(
         input.reason,
       )}</p>
       <p style="margin:0 0 18px;"><strong style="color:${INK};">${
         input.refunded
           ? 'Anything you were charged has been refunded in full.'
           : 'You have not been charged anything.'
       }</strong> If you think this is a mistake, reply to this email and we will take another look.</p>`,
    ),
  };
}

export function orderReceivedEmail(input: {
  firstName: string;
  orderNumber: string;
  items: { name: string; qty: number; amount: number }[];
  total: number;
}): { subject: string; html: string } {
  const rows = input.items
    .map(
      // No drug names in member email; the portal has the detail.
      (i, n) => `<tr>
        <td style="padding:12px 20px;border-bottom:1px solid ${HAIRLINE};color:${INK};font-size:14px;">Treatment${
          input.items.length > 1 ? ` ${n + 1}` : ''
        }${i.qty > 1 ? ` &times;${i.qty}` : ''}</td>
        <td style="padding:12px 20px;border-bottom:1px solid ${HAIRLINE};color:${INK};font-size:14px;" align="right">$${(
          i.amount / 100
        ).toFixed(2)}</td>
      </tr>`,
    )
    .join('');
  return {
    subject: `We received your order — ${orderRef(input.orderNumber)}`,
    html: shell(
      `<h1 style="${H1}">Your order is in. Nothing charged yet.</h1>
       <p style="margin:0 0 18px;">Thanks ${escapeHtml(
         input.firstName,
       )}. Your prescriber is reviewing your visit now. <strong style="color:${INK};">You have not been charged</strong> — if your treatment is approved we'll email you a receipt, and if it isn't, you pay nothing.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${PANEL}margin:8px 0 18px;">
         ${rows}
         <tr>
           <td style="padding:14px 20px;color:${MUTED};font-size:13px;">Total if approved</td>
           <td style="padding:14px 20px;color:${INK};font-size:18px;font-weight:600;" align="right">$${(
             input.total / 100
           ).toFixed(2)}</td>
         </tr>
       </table>
       <p style="color:${MUTED};font-size:13px;">Order reference <strong style="color:${INK};">${escapeHtml(
         input.orderNumber,
       )}</strong>. See the details in <a href="${SITE_URL}/portal/orders" style="color:${INK};">your portal</a>, or just reply to this email.</p>`,
    ),
  };
}

/**
 * Fallback only. The card saved at checkout is charged automatically on
 * approval; this goes out when that charge fails — expired card, insufficient
 * funds, a bank that wants the cardholder present. It has to explain why they
 * are being asked to pay when they already gave us a card, or it reads like a
 * mistake.
 */
export function approvedPayNowEmail(input: {
  firstName: string;
  orderNumber: string;
  total: number;
  payUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Approved — your card needs a second look · ${orderRef(input.orderNumber)}`,
    html: shell(
      `<div style="${EYEBROW}">PRESCRIBER APPROVED</div>
       <h1 style="${H1}">Hi ${escapeHtml(
         input.firstName,
       )}, your treatment was approved.</h1>
       <p style="margin:0 0 18px;">Your prescriber reviewed your visit and approved your treatment. We tried the card you saved at checkout and it didn&rsquo;t go through &mdash; often an expiry date or a bank hold, rather than anything wrong on your end.</p>
       <p style="margin:0 0 18px;">Pay below and your prescription goes straight to the pharmacy for compounding.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${PANEL}margin:0 0 18px;">
         <tr><td style="padding:18px 20px;color:${INK};font-size:14px;">
           <span style="color:${MUTED};font-size:13px;">Amount due</span><br/>
           <span style="color:${INK};font-size:26px;font-weight:600;letter-spacing:-0.02em;">$${(
             input.total / 100
           ).toFixed(2)}</span>
         </td></tr>
       </table>
       <div style="margin:0 0 18px;">
         ${button('Complete payment', input.payUrl)}
       </div>
       <p style="color:${MUTED};font-size:13px;">This link is unique to order <strong style="color:${INK};">${escapeHtml(
         input.orderNumber,
       )}</strong> and expires in 7 days. Don't forward it.</p>`,
    ),
  };
}

/**
 * The prescriber's own receipt.
 *
 * He signed, the card cleared and the order left for the pharmacy — three
 * things that happen in the seconds after he clicks and none of which he can
 * see once the card leaves his queue. This is the record that they happened.
 */
export function signedAndPaidPrescriberEmail(input: {
  prescriberName: string;
  orderNumber: string;
  memberName: string;
  items: string;
  amountCents: number;
  portalUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Signed and paid — ${orderRef(input.orderNumber)}`,
    html: noticeEmail({
      eyebrow: 'Prescription signed',
      heading: `${input.memberName}'s order is with the pharmacy`,
      body: `You signed this prescription and the card on file cleared, so it has been released for compounding. Nothing further is needed from you.`,
      rows: [
        ['Order', orderRef(input.orderNumber)],
        ['Patient', input.memberName],
        ['Prescribed', input.items],
        ['Charged', `$${(input.amountCents / 100).toFixed(2)}`],
      ],
      cta: { label: 'Open your signed prescriptions', href: input.portalUrl },
      footnote:
        'If you did not sign this, reply to this email immediately — the order can be recalled before it ships.',
    }),
  };
}

/** The team's version of the same event: money in, order moving. */
export function paymentClearedTeamEmail(input: {
  orderNumber: string;
  memberName: string;
  memberEmail: string;
  items: string;
  amountCents: number;
  signedBy: string;
  portalUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Payment cleared — $${(
      input.amountCents / 100
    ).toFixed(2)} · ${orderRef(input.orderNumber)}`,
    html: noticeEmail({
      eyebrow: 'Payment cleared',
      heading: `$${(input.amountCents / 100).toFixed(2)} charged on ${input.orderNumber}`,
      body: 'The prescriber signed, the card on file cleared and the order has gone to the pharmacy. It is now waiting on compounding and a tracking number.',
      rows: [
        ['Order', orderRef(input.orderNumber)],
        ['Member', `${input.memberName} · ${input.memberEmail}`],
        ['Prescribed', input.items],
        ['Charged', `$${(input.amountCents / 100).toFixed(2)}`],
        ['Signed by', input.signedBy],
      ],
      cta: { label: 'Open the order board', href: input.portalUrl },
    }),
  };
}

export interface DailyReportStats {
  /** Human date the report covers, e.g. "Tuesday, 4 August 2026". */
  dateLabel: string;
  signups: number;
  intakes: number;
  orders: number;
  revenueCents: number;
  prescriptionsSigned: number;
  shipmentsSent: number;
  pendingIntakes: number;
  /** Paid orders waiting to be placed with the pharmacy. */
  pendingFulfillment: number;
  awaitingTracking: number;
  /** Placed three or more days ago and still no tracking. */
  trackingLate: number;
  refillsTomorrow: number;
  pausedPlans: number;
}

/** Branded end-of-day summary for the support inbox. */
export function dailyReportEmail(s: DailyReportStats): {
  subject: string;
  html: string;
} {
  const tile = (label: string, value: string, accent = false) => `
    <td width="50%" style="padding:6px;">
      <div style="background:${accent ? BUTTER : MILK};border-radius:18px;padding:18px;">
        <div style="color:${accent ? INK : MUTED};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${label}</div>
        <div style="color:${INK};font-size:26px;font-weight:600;letter-spacing:-0.02em;margin-top:6px;">${value}</div>
      </div>
    </td>`;

  const row = (a: string, b: string) =>
    `<tr>${a}${b}</tr>`;

  return {
    subject: `Daily report — ${s.dateLabel} · ${s.orders} orders, ${s.signups} signups`,
    html: shell(
      `<h1 style="${H1}">Daily report</h1>
       <p style="margin:0 0 18px;color:${MUTED};font-size:13px;">${escapeHtml(
         s.dateLabel,
       )}</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 -6px 8px;">
         ${row(
           tile('Orders', String(s.orders), true),
           tile('Revenue', `$${(s.revenueCents / 100).toFixed(2)}`, true),
         )}
         ${row(tile('New signups', String(s.signups)), tile('Intakes', String(s.intakes)))}
         ${row(
           tile('Rx signed', String(s.prescriptionsSigned)),
           tile('Shipments', String(s.shipmentsSent)),
         )}
       </table>
       <div style="margin-top:18px;padding:18px 20px;${PANEL}">
         <div style="color:${MUTED};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px;">Needs attention</div>
         <div style="color:${INK};font-size:14px;line-height:1.9;">
           Intakes awaiting review: <strong style="${
             s.pendingIntakes > 0 ? `background:${BUTTER};padding:1px 7px;border-radius:999px;` : ''
           }">${s.pendingIntakes}</strong><br />
           Orders to place: <strong style="${
             s.pendingFulfillment > 0 ? `background:${BUTTER};padding:1px 7px;border-radius:999px;` : ''
           }">${s.pendingFulfillment}</strong><br />
           Placed, waiting for tracking: <strong>${s.awaitingTracking}</strong>${
             s.trackingLate > 0
               ? ` <span style="color:#B42318;">(${s.trackingLate} for 3+ days)</span>`
               : ''
           }<br />
           Refills charging by tomorrow: <strong>${s.refillsTomorrow}</strong><br />
           Plans paused (card failed or no card): <strong style="color:${
             s.pausedPlans > 0 ? '#B42318' : INK
           };">${s.pausedPlans}</strong>
         </div>
       </div>`,
    ),
  };
}

/* ------------------------------ check-ins -------------------------------- */

/**
 * Thirty days after a delivery: one question, five buttons. Each button opens
 * the check-in page with that score already picked. No drug name, like the
 * shipped and delivered emails: this one lands unannounced.
 */
export function checkinEmail(input: {
  firstName: string;
  checkinUrl: string;
}): { subject: string; html: string } {
  const cells = [1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<td style="padding:0 6px 0 0;">${button(String(n), `${input.checkinUrl}?r=${n}`)}</td>`,
    )
    .join('');
  return {
    subject: 'How’s it going?',
    html: shell(
      `<h1 style="${H1}">How’s it going, ${escapeHtml(input.firstName)}?</h1>
       <p style="margin:0 0 20px;">It’s been about a month with your treatment. On a scale of 1 to 5, how are you finding it?</p>
       <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>${cells}</tr></table>
       <p style="margin:10px 0 0;color:${MUTED};font-size:12px;">1 = not well &nbsp;·&nbsp; 5 = very well</p>
       <p style="margin:22px 0 0;">Anything on your mind about dosing or side effects? Message your prescriber through the portal, any time.</p>
       <p style="margin:22px 0 0;color:${MUTED};font-size:12px;">Don’t want check-ins? Turn them off under Notifications in your account, or reply to this email and we’ll stop.</p>`,
    ),
  };
}

/** To the care team: a check-in came back low, or with a comment. */
export function checkinFollowUpInternalEmail(input: {
  memberName: string;
  memberEmail: string;
  productName: string;
  kind: 'first' | 'refill';
  rating: number;
  comment: string | null;
  adminUrl: string;
}): { subject: string; html: string } {
  const low = input.rating <= 3;
  return {
    subject: `Check-in ${input.rating}/5${low ? ' — follow up' : ''}`,
    html: noticeEmail({
      eyebrow: low ? 'Check-in: follow up' : 'Check-in comment',
      heading: low
        ? `${input.memberName} rated their treatment ${input.rating} out of 5.`
        : `${input.memberName} left a comment on their check-in.`,
      rows: [
        ['Member', `${input.memberName}\n${input.memberEmail}`],
        ['Treatment', input.productName],
        ['Check-in', input.kind === 'first' ? '30 days after first delivery' : '30 days after first refill'],
        ['Rating', `${input.rating} / 5`],
        ['Comment', input.comment || '—'],
      ],
      cta: { label: 'Open check-ins', href: input.adminUrl },
      footnote: 'Reach out through the member’s message thread. The member saw the same thank-you as everyone else.',
    }),
  };
}

/* -------------------------------------------------------------------------- */
/*  Follow-up sequences (sent by the recovery cron — see lib/followups.ts)    */
/* -------------------------------------------------------------------------- */

const NOTHING_CHARGED = 'Nothing is charged unless your physician approves.';

/**
 * Every follow-up step, one template. Subjects and bodies never name a
 * product or a condition — an inbox is not always only its owner's to read —
 * and make no claim about results. `lead` and `plan` are reminders and carry
 * the unsubscribe link; `photos` and `pay` are about an order already placed.
 */
export function followupEmail(input: {
  stage: Stage;
  step: number;
  firstName?: string;
  url: string;
  unsubscribeUrl?: string;
  /** Pay stage only. */
  order?: { number: string; totalCents: number; expires: string };
}): { subject: string; html: string } {
  const hi = input.firstName ? `Hi ${input.firstName}` : 'Hi there';
  const help = `Questions? Reply to this email or write to ${SUPPORT_EMAIL}.`;
  const step = Math.max(0, input.step);
  const u = input.unsubscribeUrl;

  if (input.stage === 'lead') {
    const cta = { label: 'Continue your assessment', href: input.url };
    const steps = [
      {
        subject: 'Finish your assessment',
        html: noticeEmail({
          eyebrow: 'Your assessment',
          heading: 'Pick up where you left off.',
          body: `${hi} — you started your assessment with us. It takes a few minutes to finish, and a licensed physician reviews it once you do.\n\n${NOTHING_CHARGED}`,
          cta,
          unsubscribeUrl: u,
        }),
      },
      {
        subject: 'How it works',
        html: noticeEmail({
          eyebrow: 'How it works',
          heading: 'Three steps, all online.',
          rows: [
            ['1 · Assessment', 'A few minutes of questions about your health and goals.'],
            ['2 · Physician review', 'A licensed physician reviews it and decides whether treatment is right for you.'],
            ['3 · Delivery', 'If approved, your treatment ships free from a licensed U.S. pharmacy.'],
          ],
          body: `${hi} — here is what happens after you finish your assessment. ${NOTHING_CHARGED}`,
          cta,
          unsubscribeUrl: u,
        }),
      },
      {
        subject: 'Still want to finish your assessment?',
        html: noticeEmail({
          eyebrow: 'Last reminder',
          heading: 'Your assessment is still waiting.',
          body: `${hi} — whenever you are ready, you can finish in a few minutes. This is the last reminder we will send about it.\n\n${NOTHING_CHARGED}`,
          cta,
          unsubscribeUrl: u,
        }),
      },
    ];
    return steps[Math.min(step, steps.length - 1)];
  }

  if (input.stage === 'plan') {
    const cta = { label: 'Review your plan', href: input.url };
    const steps = [
      {
        subject: 'Your plan is ready',
        html: noticeEmail({
          eyebrow: 'Your plan',
          heading: 'Your plan is ready.',
          body: `${hi} — your assessment is complete and your plan is waiting in your cart. Place your order and a licensed physician will review it.\n\n${NOTHING_CHARGED}`,
          cta,
          unsubscribeUrl: u,
        }),
      },
      {
        subject: 'One step from your physician review',
        html: noticeEmail({
          eyebrow: 'Your plan',
          heading: 'One step from your physician review.',
          body: `${hi} — once you place your order, a licensed physician reviews your assessment and decides whether treatment is right for you. If approved, it ships free.\n\n${NOTHING_CHARGED}`,
          cta,
          unsubscribeUrl: u,
        }),
      },
      {
        subject: 'Your plan is still waiting',
        html: noticeEmail({
          eyebrow: 'Last reminder',
          heading: 'Your plan is still in your cart.',
          body: `${hi} — your plan is saved whenever you are ready. This is the last reminder we will send about it.\n\n${NOTHING_CHARGED}`,
          cta,
          unsubscribeUrl: u,
        }),
      },
    ];
    return steps[Math.min(step, steps.length - 1)];
  }

  if (input.stage === 'photos') {
    const cta = { label: 'Add your photos', href: input.url };
    const steps = [
      {
        subject: 'Add your photos so your physician can review',
        heading: 'One step left: your photos.',
        lead: `${hi} — thanks for your order. Your physician needs a few photos before they can review your treatment. It takes about two minutes from your phone.`,
      },
      {
        subject: 'Your physician is waiting on your photos',
        heading: 'Your review is waiting on your photos.',
        lead: `${hi} — your order is in, but your physician cannot start the review until your photos are added.`,
      },
      {
        subject: 'Reminder: add your photos to finish your review',
        heading: 'Your photos are still needed.',
        lead: `${hi} — your order is on hold until your photos are added. Once they are in, your physician can review it.`,
      },
    ];
    const s = steps[Math.min(step, steps.length - 1)];
    return {
      subject: s.subject,
      html: noticeEmail({
        eyebrow: 'Your order',
        heading: s.heading,
        body: `${s.lead}\n\n${NOTHING_CHARGED}`,
        cta,
        footnote: help,
      }),
    };
  }

  // pay
  const o = input.order;
  const expires = o
    ? new Date(o.expires).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/New_York',
      })
    : 'soon';
  const last = step >= 1;
  return {
    subject: last
      ? 'Reminder: your payment link expires soon'
      : 'Reminder: complete payment for your approved treatment',
    html: noticeEmail({
      eyebrow: 'Physician approved',
      heading: last ? 'Your payment link expires soon.' : 'Your treatment is approved.',
      body: `${hi} — your physician approved your treatment, but payment has not gone through yet. Complete it below and your prescription goes straight to the pharmacy. This secure link expires ${expires}.`,
      rows: o
        ? [
            ['Order', orderRef(o.number)],
            ['Amount due', `$${(o.totalCents / 100).toFixed(2)}`],
          ]
        : undefined,
      cta: { label: 'Complete payment', href: input.url },
      footnote: `This link is unique to your order — please don’t forward it. ${help}`,
    }),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
