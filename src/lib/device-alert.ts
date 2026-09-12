import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies, headers } from 'next/headers';
import { noticeEmail, sendEmail } from '@/lib/email';
import { recordAudit } from '@/lib/prescriber';
import { SITE_URL } from '@/lib/site';
import { mfaRequiredFor } from '@/lib/mfa';
import type { Role } from '@/lib/auth';

/**
 * "New sign-in from a device you haven't used before."
 *
 * Staff accounts reach every chart in the system, so a sign-in from an unknown
 * browser is worth telling the account holder about — the same alert Google or
 * Instagram sends. Recognition is a signed cookie rather than a device table:
 * the browser that has already been greeted carries the proof itself, so there
 * is nothing to migrate and nothing to prune. Clearing cookies costs one extra
 * email, which is the correct side to err on.
 */

export const DEVICE_COOKIE = 'el_dev';
/** Browsers cap persistent cookies here anyway; asking for more is ignored. */
const DEVICE_DAYS = 400;

function secret(): string | null {
  return process.env.MFA_SECRET || process.env.CRON_SECRET || null;
}

/**
 * Bound to the browser as well as the account: a cookie lifted onto another
 * machine no longer matches, so the theft still raises the alert.
 */
function deviceToken(userId: string, userAgent: string): string {
  return createHmac('sha256', secret() ?? '')
    .update(`${userId}|${userAgent}`)
    .digest('hex');
}

function sameToken(a: string | undefined, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Browser and platform, from the only thing the request tells us. */
function describeDevice(ua: string): string {
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Unknown browser';
  const os =
    /iPhone/.test(ua) ? 'iPhone'
    : /iPad/.test(ua) ? 'iPad'
    : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'Mac'
    : /Windows/.test(ua) ? 'Windows'
    : /Linux/.test(ua) ? 'Linux'
    : 'Unknown device';
  return `${browser} on ${os}`;
}

/** Vercel resolves the IP to a city at the edge; no lookup of our own. */
function describeLocation(h: Headers): string {
  const city = h.get('x-vercel-ip-city');
  const region = h.get('x-vercel-ip-country-region');
  const country = h.get('x-vercel-ip-country');
  const parts = [city ? decodeURIComponent(city) : null, region, country].filter(
    Boolean,
  );
  return parts.length ? parts.join(', ') : 'Location unavailable';
}

function clientIp(h: Headers): string {
  return (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'Unknown';
}

/**
 * Call once a staff sign-in is actually complete — after the second factor
 * where there is one, so a password guess alone cannot fill the mailbox.
 * Members are not alerted: a single chart is a different blast radius.
 */
export async function noteStaffSignIn(user: {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}): Promise<void> {
  if (!mfaRequiredFor(user.role) || !secret()) return;

  try {
    const h = await headers();
    const ua = h.get('user-agent') ?? '';
    const token = deviceToken(user.id, ua);
    const store = await cookies();

    if (sameToken(store.get(DEVICE_COOKIE)?.value, token)) return;

    store.set(DEVICE_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: DEVICE_DAYS * 86_400,
    });

    const device = describeDevice(ua);
    const where = describeLocation(h);
    const when = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    await sendEmail({
      to: user.email,
      subject: 'New sign-in to your Eternal Longevity account',
      html: noticeEmail({
        eyebrow: 'Security',
        heading: 'A new device signed in',
        body: `Someone signed in to your ${user.role} account from a device we have not seen before.`,
        rows: [
          ['Device', device],
          ['Location', where],
          ['IP address', clientIp(h)],
          ['When', `${when} ET`],
        ],
        cta: { label: 'Change your password', href: `${SITE_URL}/forgot-password` },
        footnote:
          'If this was you, nothing to do. If it was not, change your password now — this device already has access.',
      }),
    });

    await recordAudit([
      {
        actorId: user.id,
        actorName: user.name ?? user.email,
        actorRole: user.role,
        entity: 'session',
        entityId: user.id,
        field: 'new device sign-in',
        oldValue: null,
        newValue: `${device} · ${where} · ${clientIp(h)}`,
      },
    ]);
  } catch {
    // An alert that fails must never cost someone their sign-in.
  }
}
