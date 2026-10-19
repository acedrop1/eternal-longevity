'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { subscribeAction } from '@/lib/marketing-actions';
import { EMAIL_DISCLOSURE, SERVICE_STATES, SMS_DISCLOSURE } from '@/lib/marketing-consent';

const fieldClass =
  'w-full rounded-inner bg-white px-4 py-3.5 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/55 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/60';
const labelClass = 'mb-2 block text-[13px] font-medium text-ink/70';
const linkClass = 'underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink';

/** The disclosure as stored, minus its closing "See …" sentence, which renders as links. */
const lead = (s: string) => s.slice(0, s.lastIndexOf(' See '));

/**
 * /subscribe. Two separate, unticked boxes; each channel's field appears only
 * once its box is ticked. Contact details only — no health questions.
 */
export function SubscribeForm({ smsEnabled }: { smsEnabled: boolean }) {
  const [emailOn, setEmailOn] = useState(false);
  const [smsOn, setSmsOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { email: boolean; sms: boolean }>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (!emailOn && !smsOn) return setError('Choose at least one way to hear from us.');
    setBusy(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      const res = await subscribeAction({
        email: String(data.get('email') ?? ''),
        phone: String(data.get('phone') ?? ''),
        firstName: String(data.get('firstName') ?? ''),
        state: String(data.get('state') ?? ''),
        emailOptIn: emailOn,
        smsOptIn: smsOn,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        website: String(data.get('website') ?? ''),
      });
      if (res.ok) setDone({ email: emailOn, sms: smsOn });
      else setError(res.error ?? 'Something went wrong.');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-inner bg-butter-soft p-6 md:p-8" role="status">
        <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">Thanks.</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          {done.email ? 'Check your inbox to confirm.' : ''}
          {done.email && done.sms ? ' ' : ''}
          {done.sms ? 'Reply YES to the text we sent to confirm.' : ''} Nothing is sent until you do.
        </p>
      </div>
    );
  }

  const box = 'mt-0.5 h-5 w-5 flex-none rounded accent-ink';
  return (
    <form onSubmit={onSubmit} className="relative space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="sub-name" className={labelClass}>
            First name <span className="font-normal text-ink/55">(optional)</span>
          </label>
          <input id="sub-name" name="firstName" type="text" maxLength={60} autoComplete="given-name" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="sub-state" className={labelClass}>
            State
          </label>
          <div className="relative">
            <select id="sub-state" name="state" required defaultValue="" className={`${fieldClass} appearance-none pr-11`}>
              <option value="" disabled>
                Choose…
              </option>
              {SERVICE_STATES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/65" strokeWidth={1.75} />
          </div>
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className={labelClass}>How should we reach you?</legend>

        <label className="flex gap-3 text-[14px] leading-relaxed text-ink-soft">
          <input type="checkbox" checked={emailOn} onChange={(e) => setEmailOn(e.target.checked)} className={box} />
          <span>
            {lead(EMAIL_DISCLOSURE)} See{' '}
            <Link href="/legal/privacy" className={linkClass}>
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {emailOn && (
          <div className="pl-8">
            <label htmlFor="sub-email" className={labelClass}>
              Email
            </label>
            <input id="sub-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={fieldClass} />
          </div>
        )}

        {smsEnabled && (
          <>
            <label className="flex gap-3 text-[14px] leading-relaxed text-ink-soft">
              <input type="checkbox" checked={smsOn} onChange={(e) => setSmsOn(e.target.checked)} className={box} />
              <span>
                {lead(SMS_DISCLOSURE)} See{' '}
                <Link href="/legal/text-messages" className={linkClass}>
                  SMS Terms
                </Link>{' '}
                and{' '}
                <Link href="/legal/privacy" className={linkClass}>
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {smsOn && (
              <div className="pl-8">
                <label htmlFor="sub-phone" className={labelClass}>
                  Mobile number
                </label>
                <input id="sub-phone" name="phone" type="tel" required autoComplete="tel-national" placeholder="(555) 555-1234" className={fieldClass} />
              </div>
            )}
          </>
        )}
      </fieldset>

      {/* Honeypot. Off-screen rather than display:none so a bot still fills it. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-0 w-0 opacity-0" />

      {error && (
        <p role="alert" className="rounded-inner bg-red-50 px-4 py-3 text-[14px] leading-relaxed text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-ink px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {busy ? 'Subscribing…' : 'Subscribe'}
      </button>
    </form>
  );
}
