import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { contactByPrefToken, maskEmail, maskPhone } from '@/lib/marketing';
import { optOutAction, sendPreferencesLinkAction } from '@/lib/marketing-actions';
import type { MarketingStatus } from '@/lib/database.types';

export const metadata: Metadata = {
  title: 'Marketing preferences',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const button = 'inline-flex rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-ink/85';
const STATUS: Record<MarketingStatus, string> = {
  subscribed: 'On',
  pending: 'Waiting for your confirmation',
  unsubscribed: 'Off',
  none: 'Off',
};

/**
 * Marketing email and SMS, each its own switch, plus unsubscribe from all.
 * Opened from a signed link (?t=), so it works without signing in and shows
 * only masked contact details. Channels can be turned off here; turning one
 * back on is a fresh request at /subscribe, never a silent re-enrolment.
 */
export default async function MarketingPreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; confirmed?: string; sent?: string; error?: string }>;
}) {
  const { t = '', confirmed, sent, error } = await searchParams;
  const contact = t && supabaseAdminConfigured() ? await contactByPrefToken(createSupabaseAdminClient(), t) : null;

  async function optOut(form: FormData) {
    'use server';
    const channel = String(form.get('channel'));
    if (channel === 'email' || channel === 'sms' || channel === 'all') await optOutAction(t, channel);
    redirect(`/marketing-preferences?t=${t}`);
  }

  async function emailLink(form: FormData) {
    'use server';
    const res = await sendPreferencesLinkAction(String(form.get('email') ?? ''));
    redirect(res.ok ? '/marketing-preferences?sent=1' : '/marketing-preferences?error=1');
  }

  const channels = contact
    ? ([
        { key: 'email', label: 'Email marketing', who: contact.email ? maskEmail(contact.email) : null, status: contact.email_status },
        ...(contact.sms_status !== 'none'
          ? [{ key: 'sms', label: 'SMS marketing', who: contact.phone ? maskPhone(contact.phone) : null, status: contact.sms_status }]
          : []),
      ] as const)
    : [];
  const anyOn = channels.some((c) => c.status === 'pending' || c.status === 'subscribed');

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white px-5 pb-16 pt-32 text-ink md:px-10 md:pb-24 md:pt-36">
        <div className="mx-auto max-w-lg rounded-shell bg-milk p-6 md:p-8">
          <h1 className="mb-3 text-[32px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[40px]">
            Marketing preferences
          </h1>

          {contact ? (
            <>
              {confirmed && (
                <p role="status" className="mb-5 rounded-inner bg-butter-soft px-4 py-3 text-[14px] text-ink">
                  You’re subscribed. Bookmark this page to change your choices later.
                </p>
              )}
              <p className="mb-6 text-[15px] leading-relaxed text-ink-soft">
                Changes apply straight away. Emails and texts about your care, orders and account are separate and
                aren’t affected.
              </p>
              <ul className="mb-6 divide-y divide-ink/10 rounded-inner bg-white">
                {channels.map((c) => {
                  const on = c.status === 'pending' || c.status === 'subscribed';
                  return (
                    <li key={c.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                      <div>
                        <div className="text-[15px] font-semibold text-ink">{c.label}</div>
                        <div className="text-[13px] text-ink/65">
                          {STATUS[c.status]}
                          {c.who ? ` · ${c.who}` : ''}
                        </div>
                      </div>
                      {on ? (
                        <form action={optOut}>
                          <input type="hidden" name="channel" value={c.key} />
                          <button type="submit" aria-label={`${c.label}: turn off`} className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-ink/85">
                            Turn off
                          </button>
                        </form>
                      ) : (
                        <Link href="/subscribe" className="text-[13px] font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink">
                          Turn on at Subscribe
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
              {anyOn && (
                <form action={optOut}>
                  <input type="hidden" name="channel" value="all" />
                  <button type="submit" className={button}>
                    Unsubscribe from all marketing
                  </button>
                </form>
              )}
            </>
          ) : sent ? (
            <p role="status" className="text-[15px] leading-relaxed text-ink-soft">
              If that address is on our marketing list, we’ve emailed it a link to your preferences. For assessment
              reminders, use the Unsubscribe link in the reminder itself.
            </p>
          ) : (
            <>
              <p className="mb-6 text-[15px] leading-relaxed text-ink-soft">
                {t ? 'This link has expired or isn’t valid. ' : ''}Enter your email and we’ll send you a link to your
                preferences. No account needed.
              </p>
              <form action={emailLink} className="space-y-4">
                <label htmlFor="prefs-email" className="mb-2 block text-[13px] font-medium text-ink/70">
                  Email
                </label>
                <input
                  id="prefs-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-inner bg-white px-4 py-3.5 text-[16px] text-ink ring-1 ring-ink/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/60"
                />
                {error && (
                  <p role="alert" className="rounded-inner bg-red-50 px-4 py-3 text-[14px] text-red-700">
                    Check the address, or wait a few minutes and try again.
                  </p>
                )}
                <button type="submit" className={button}>
                  Email me my link
                </button>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
