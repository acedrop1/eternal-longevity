'use client';

import { useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
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
  'w-full rounded-inner bg-milk px-4 py-3.5 text-[16px] text-ink ring-1 ring-transparent placeholder:text-ink/40 transition-shadow focus:bg-white focus:outline-none focus:ring-ink/20';
const labelClass = 'mb-2 block text-[13px] font-medium text-ink/70';

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
      <div className="rounded-inner bg-butter-soft p-6 md:p-10" role="status">
        <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-ink md:text-[26px]">Message sent.</h2>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
          Someone reads every one of these. You&apos;ll hear back at the address you gave, usually within one business
          day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
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
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/55"
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
        <p role="alert" className="rounded-inner bg-red-50 px-4 py-3 text-[14px] leading-relaxed text-red-700">
          {error} You can always reach us at {SUPPORT_EMAIL}.
        </p>
      )}

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-[13px] leading-relaxed text-ink/55">
          Please don&apos;t share urgent medical concerns here. Call 911 or go to the nearest ER first.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="group flex items-center gap-2 self-start whitespace-nowrap rounded-full bg-butter py-2 pl-6 pr-2 text-[15px] font-semibold text-ink transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60 sm:self-auto"
        >
          {busy ? 'Sending…' : 'Send message'}
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-white transition-transform duration-300 group-hover:rotate-45">
            <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
        </button>
      </div>
    </form>
  );
}
