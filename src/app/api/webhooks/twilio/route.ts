/**
 * Twilio inbound SMS: marketing confirmations and opt-outs.
 *
 * Production: Twilio console → the sending number → Messaging → "A message
 * comes in" → Webhook, POST, https://www.etlongevity.com/api/webhooks/twilio.
 *
 *   YES                                         pending SMS marketing → subscribed
 *   STOP STOPALL UNSUBSCRIBE CANCEL END QUIT    SMS marketing → unsubscribed, on every row with the number
 *   HELP / anything else                        nothing (Twilio sends the STOP and HELP replies itself)
 *
 * Every change is logged in the consent ledger. Always answers empty TwiML.
 */
import { NextResponse, type NextRequest } from 'next/server';
import twilio from 'twilio';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { CONSENT_VERSION } from '@/lib/marketing-consent';
import { logConsent, normalizePhone } from '@/lib/marketing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The URL Twilio signs: fixed, not read from the request, which a proxy may rewrite. */
const WEBHOOK_URL = 'https://www.etlongevity.com/api/webhooks/twilio';
const STOP = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);

const twiml = () =>
  new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  });

export async function POST(req: NextRequest) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get('x-twilio-signature');
  const params = Object.fromEntries(new URLSearchParams(await req.text()));
  if (!token || !signature || !twilio.validateRequest(token, signature, WEBHOOK_URL, params)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const word = String(params.Body ?? '').trim().toUpperCase();
  const phone = normalizePhone(String(params.From ?? ''));
  const stop = STOP.has(word);
  if (!phone || (!stop && word !== 'YES') || !supabaseAdminConfigured()) return twiml();

  const db = createSupabaseAdminClient();
  // STOP suppresses even a number that never opted in here; YES only confirms one that asked.
  const { data } = stop
    ? await db.from('marketing_contacts').update({ sms_status: 'unsubscribed' }).eq('phone', phone).neq('sms_status', 'unsubscribed').select('id')
    : await db.from('marketing_contacts').update({ sms_status: 'subscribed' }).eq('phone', phone).eq('sms_status', 'pending').select('id');

  await logConsent(
    db,
    (data ?? []).map((c) => ({
      contact_id: c.id,
      channel: 'sms' as const,
      action: stop ? ('opt_out' as const) : ('confirm' as const),
      disclosure_text: `SMS reply "${word}" from ${phone} (Twilio ${String(params.MessageSid ?? '').slice(0, 64)})`,
      disclosure_version: stop ? null : CONSENT_VERSION,
    })),
  );
  return twiml();
}
