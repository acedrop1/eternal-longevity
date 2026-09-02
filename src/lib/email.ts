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

/** Every outbound message sends from — and replies to — the support inbox. */
export const SUPPORT_EMAIL = process.env.CARE_TEAM_EMAIL || 'support@etlongevity.com';

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || `Eternal Longevity <${SUPPORT_EMAIL}>`;

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
      replyTo: input.replyTo ?? SUPPORT_EMAIL,
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
        Premium peptide protocols. Compounded by a licensed 503A pharmacy.<br />
        This message may contain confidential information intended only for the
        named recipient.
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
    subject: 'Your account is ready — Eternal Longevity',
    html: shell(
      `<div style="color:#a3a3a3;font-size:11px;letter-spacing:2px;font-weight:700;margin-top:8px;">WELCOME</div>
       <h1 style="color:#fff;font-size:22px;margin:10px 0 14px;">Hi ${escapeHtml(
         firstName,
       )}, your account is ready.</h1>
       <p>Welcome to Eternal Longevity. Your portal is where everything lives —
       messages with your care team, your protocol details, refills and order
       tracking.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border:1px solid #262626;border-radius:14px;margin:18px 0;">
         <tr><td style="padding:18px 20px;color:#e5e5e5;font-size:14px;line-height:1.6;">
           <div style="color:#a3a3a3;font-size:11px;letter-spacing:2px;font-weight:700;margin-bottom:10px;">WHAT HAPPENS NEXT</div>
           <p style="margin:0 0 10px;"><strong style="color:#fff;">1. Place your order.</strong><br/>
           You're only charged if a licensed prescriber approves your treatment.</p>
           <p style="margin:0 0 10px;"><strong style="color:#fff;">2. Complete your clinical visit.</strong><br/>
           A short set of health questions in your portal — your prescriber reviews it.</p>
           <p style="margin:0;"><strong style="color:#fff;">3. Your treatment ships discreetly.</strong><br/>
           Tracking is added to your order the moment it leaves the pharmacy.</p>
         </td></tr>
       </table>
       <p style="margin:18px 0 6px;">
         <a href="https://etlongevity.com/login" style="display:inline-block;background:#d5a850;color:#000;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:999px;">Go to my portal</a>
       </p>`,
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

/** Sent to the customer once payment succeeds. */
export function orderConfirmationEmail(input: {
  firstName: string;
  orderNumber: string;
  items: { name: string; qty: number; amount: number }[];
  total: number;
}): { subject: string; html: string } {
  const rows = input.items
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #262626;color:#e5e5e5;font-size:14px;">${escapeHtml(
          i.name,
        )}${i.qty > 1 ? ` &times;${i.qty}` : ''}</td>
        <td style="padding:10px 0;border-bottom:1px solid #262626;color:#fff;font-size:14px;" align="right">$${(
          i.amount / 100
        ).toFixed(2)}</td>
      </tr>`,
    )
    .join('');
  return {
    subject: `Order confirmed — ${input.orderNumber}`,
    html: shell(
      `<h1 style="margin:0 0 12px;color:#fff;font-size:22px;">Your order is confirmed.</h1>
       <p style="margin:0 0 18px;">Thanks ${escapeHtml(
         input.firstName,
       )} — we've received your order. It goes to our partner 503A pharmacy for compounding, and you'll get tracking as soon as it ships.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;">
         ${rows}
         <tr>
           <td style="padding:12px 0;color:#737373;font-size:13px;">Total</td>
           <td style="padding:12px 0;color:#d5a850;font-size:18px;font-weight:700;" align="right">$${(
             input.total / 100
           ).toFixed(2)}</td>
         </tr>
       </table>
       <p style="color:#a3a3a3;font-size:13px;">Order reference <strong style="color:#e5e5e5;">${escapeHtml(
         input.orderNumber,
       )}</strong>. Questions? Just reply to this email.</p>`,
    ),
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
  pendingFulfillment: number;
}

/** Branded end-of-day summary for the support inbox. */
export function dailyReportEmail(s: DailyReportStats): {
  subject: string;
  html: string;
} {
  const tile = (label: string, value: string, accent = false) => `
    <td width="50%" style="padding:6px;">
      <div style="background:#0a0a0a;border:1px solid #262626;border-radius:14px;padding:16px;">
        <div style="color:#737373;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;">${label}</div>
        <div style="color:${accent ? '#d5a850' : '#ffffff'};font-size:26px;font-weight:700;margin-top:6px;">${value}</div>
      </div>
    </td>`;

  const row = (a: string, b: string) =>
    `<tr>${a}${b}</tr>`;

  return {
    subject: `Daily report — ${s.dateLabel} · ${s.orders} orders, ${s.signups} signups`,
    html: shell(
      `<h1 style="margin:0 0 4px;color:#fff;font-size:22px;">Daily report</h1>
       <p style="margin:0 0 18px;color:#a3a3a3;font-size:13px;">${escapeHtml(
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
       <div style="margin-top:18px;padding:16px;background:#0a0a0a;border:1px solid #262626;border-radius:14px;">
         <div style="color:#737373;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:10px;">Needs attention</div>
         <div style="color:#e5e5e5;font-size:14px;line-height:1.9;">
           Intakes awaiting review: <strong style="color:${
             s.pendingIntakes > 0 ? '#d5a850' : '#e5e5e5'
           };">${s.pendingIntakes}</strong><br />
           Orders awaiting fulfillment: <strong style="color:${
             s.pendingFulfillment > 0 ? '#d5a850' : '#e5e5e5'
           };">${s.pendingFulfillment}</strong>
         </div>
       </div>`,
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
