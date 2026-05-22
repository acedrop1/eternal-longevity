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

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  'Eternal Longevity <hello@eternallongevity.com>';

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
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
      replyTo: input.replyTo,
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

/** Wrap body content in a minimal branded shell. */
function shell(body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0a0a0a;padding:32px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#141414;border:1px solid #262626;border-radius:20px;overflow:hidden;">
      <tr><td style="padding:28px 32px 8px;">
        <div style="color:#d5a850;font-size:12px;letter-spacing:2px;font-weight:700;">ETERNAL LONGEVITY</div>
      </td></tr>
      <tr><td style="padding:8px 32px 32px;color:#e5e5e5;font-size:15px;line-height:1.6;">
        ${body}
      </td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #262626;color:#737373;font-size:12px;line-height:1.5;">
        Physician-supervised longevity protocols. This message may contain
        confidential health information intended only for the named recipient.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

/** Sent to the patient right after they finish intake. */
export function intakeConfirmationEmail(firstName: string): {
  subject: string;
  html: string;
} {
  return {
    subject: 'We received your intake — Eternal Longevity',
    html: shell(
      `<h1 style="color:#fff;font-size:20px;margin:12px 0;">Thanks, ${escapeHtml(
        firstName,
      )}.</h1>
       <p>Your intake is in. A licensed physician will review it and either
       approve a protocol or follow up with a few questions, usually within one
       business day.</p>
       <p>You'll get an email the moment there's an update. Nothing is charged
       until a physician signs off and you check out.</p>`,
    ),
  };
}

/** Internal notification to the care team that a new intake landed. */
export function intakeReceivedTeamEmail(
  caseId: string,
  patientEmail: string,
): { subject: string; html: string } {
  return {
    subject: `New intake to review — ${caseId}`,
    html: shell(
      `<h1 style="color:#fff;font-size:20px;margin:12px 0;">New intake submitted</h1>
       <p><strong style="color:#fff;">Case:</strong> ${escapeHtml(caseId)}<br/>
       <strong style="color:#fff;">Patient:</strong> ${escapeHtml(patientEmail)}</p>
       <p>Open the clinical queue in the portal to review and assign.</p>`,
    ),
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
    subject: `Your order ${orderNumber} has shipped`,
    html: shell(
      `<h1 style="color:#fff;font-size:20px;margin:12px 0;">On its way, ${escapeHtml(
        firstName,
      )}.</h1>
       <p>Order <strong style="color:#fff;">${escapeHtml(
         orderNumber,
       )}</strong> shipped via ${escapeHtml(carrier)}.</p>
       <p><strong style="color:#fff;">Tracking:</strong> ${escapeHtml(tracking)}</p>
       <p>Compounded peptides ship cold-chain. Refrigerate on arrival.</p>`,
    ),
  };
}

/**
 * Sent when an admin creates an account for someone — member, doctor,
 * pharmacy, or admin. Carries a one-time temporary password.
 */
export function welcomeEmail(input: {
  fullName: string;
  email: string;
  tempPassword: string;
  role: 'member' | 'doctor' | 'pharmacy' | 'admin';
  loginUrl: string;
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
      `<h1 style="color:#fff;font-size:20px;margin:12px 0;">Welcome, ${escapeHtml(
        firstName,
      )}.</h1>
       <p>${intro[input.role] ?? intro.member}</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-collapse:collapse;">
         <tr>
           <td style="padding:11px 14px;background:#0a0a0a;border:1px solid #262626;border-radius:10px 10px 0 0;color:#737373;font-size:12px;">Email</td>
           <td style="padding:11px 14px;background:#0a0a0a;border:1px solid #262626;border-left:0;border-radius:0 10px 0 0;color:#fff;font-size:14px;" align="right">${escapeHtml(
             input.email,
           )}</td>
         </tr>
         <tr>
           <td style="padding:11px 14px;background:#0a0a0a;border:1px solid #262626;border-top:0;border-radius:0 0 0 10px;color:#737373;font-size:12px;">Temporary password</td>
           <td style="padding:11px 14px;background:#0a0a0a;border:1px solid #262626;border-top:0;border-left:0;border-radius:0 0 10px 0;color:#d5a850;font-size:15px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;" align="right">${escapeHtml(
             input.tempPassword,
           )}</td>
         </tr>
       </table>
       <p style="margin:18px 0;">
         <a href="${escapeHtml(
           input.loginUrl,
         )}" style="display:inline-block;background:#d5a850;color:#000;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:999px;">Sign in</a>
       </p>
       <p style="color:#a3a3a3;font-size:13px;">For your security, please change this password after your first sign-in. You can do that any time from Account settings.</p>`,
    ),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
