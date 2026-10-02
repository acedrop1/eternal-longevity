import 'server-only';
import { timingSafeEqual } from 'node:crypto';

/**
 * Vercel signs cron requests with `Authorization: Bearer $CRON_SECRET`; the
 * same header fires a job by hand. No secret means nobody gets in, not
 * everybody: these jobs charge cards and send email. Constant-time, so the
 * secret cannot be guessed a byte at a time from response timing.
 */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
