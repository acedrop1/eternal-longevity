'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { sendContactMessage } from '@/lib/contact-actions';
import { SUPPORT_EMAIL } from '@/lib/site';

/**
 * Contact form in the homepage's light style. Same fields, validation and
 * submission as the previous ContactForm (sendContactMessage server action,
 * honeypot); only the styling changed.
 */
const TOPICS = [
  { value: 'clinical', label: 'Support question (existing member)' },
  { value: 'product', label: 'Question about a protocol' },
  { value: 'eligibility', label: 'Eligibility / state availability' },
  { value: 'billing', label: 'Billing or order issue' },
  { value: 'press', label: 'Press / partnerships' },
  { value: 'other', label: 'Something else' },
];

const fieldClass =
  'w-full rounded-[2px] bg-black/[0.04] px-4 py-3 text-[16px] text-black ring-1 ring-black/10 placeholder:text-black/35 transition-shadow focus:outline-none focus:ring-2 focus:ring-black';
const labelClass = 'mb-2 block font-mono text-[13px] text-black/70';

export function MessageForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      const res = await sendContactMessage({
        name: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        topic: String(data.get('topic') ?? 'other'),
        message: String(data.get('message') ?? ''),
        website: String(data.get('website') ?? ''),
      });
      if (res.ok) setSent(true);
      else setError(res.error ?? 'Something went wrong.');
    } catch {
      setError('Something went wrong. Please email us directly.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-[4px] bg-[#F2F2F0] p-6 md:p-10" role="status">
        <h2
          className="font-display font-normal"
          style={{ fontSize: 'clamp(1.6rem, 1.4vw + 1rem, 2.4rem)', fontStretch: '75%', lineHeight: 1.05 }}
        >
          Message sent.
        </h2>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-black/70">
          Someone reads every one of these. You&apos;ll hear back at the address you gave, usually within one business
          day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Jane Doe"
            autoComplete="name"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClass}>
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            autoComplete="email"
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="topic" className={labelClass}>
          Topic
        </label>
        <div className="relative">
          <select id="topic" name="topic" defaultValue="" required className={`${fieldClass} appearance-none pr-11`}>
            <option value="" disabled>
              Pick what fits best…
            </option>
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/55"
            strokeWidth={1.75}
          />
        </div>
      </div>

      <div>
        <label htmlFor="message" className={labelClass}>
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          maxLength={5000}
          placeholder="Tell us what's on your mind…"
          className={`${fieldClass} resize-none`}
        />
      </div>

      {/* Honeypot. Off-screen rather than display:none so a bot still fills it. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {error && (
        <p role="alert" className="rounded-[2px] bg-red-50 px-4 py-3 text-[15px] leading-relaxed text-red-800 ring-1 ring-red-700/20">
          {error} You can always reach us at {SUPPORT_EMAIL}.
        </p>
      )}

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-[13px] leading-relaxed text-black/55">
          Please don&apos;t share urgent medical concerns here. Call 911 or go to the nearest ER first.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="self-start whitespace-nowrap rounded-full bg-black px-4 py-2.5 font-mono text-[13px] text-white transition-colors hover:bg-black/85 disabled:opacity-60 sm:self-auto"
        >
          {busy ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </form>
  );
}
