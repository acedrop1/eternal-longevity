'use client';

import { useState } from 'react';
import { sendContactMessage } from '@/lib/contact-actions';
import { SUPPORT_EMAIL } from '@/lib/site';

const TOPICS = [
  { value: 'clinical', label: 'Support question (existing member)' },
  { value: 'product', label: 'Question about a protocol' },
  { value: 'eligibility', label: 'Eligibility / state availability' },
  { value: 'billing', label: 'Billing or order issue' },
  { value: 'press', label: 'Press / partnerships' },
  { value: 'other', label: 'Something else' },
];

const fieldClass =
  'w-full rounded-2xl border border-line bg-background px-4 py-3.5 text-base text-foreground placeholder-foreground/30 transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';
const labelClass =
  'mb-1.5 block text-[11px] tracking-wider text-foreground/60';

export function ContactForm() {
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
      <div className="rounded-3xl border border-line bg-surface p-7 md:p-10">
        <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
          Message sent.
        </h2>
        <p className="text-sm leading-relaxed text-foreground/65">
          Someone reads every one of these. You&apos;ll hear back at the address
          you gave, usually within one business day.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-3xl border border-line bg-surface p-7 md:p-10"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            FULL NAME
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
            EMAIL
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
          TOPIC
        </label>
        <select
          id="topic"
          name="topic"
          defaultValue=""
          required
          className={`${fieldClass} appearance-none`}
        >
          <option value="" disabled>
            Pick what fits best…
          </option>
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className={labelClass}>
          MESSAGE
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
        <p className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          {error} You can always reach us at {SUPPORT_EMAIL}.
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-relaxed text-foreground/45">
          Please don&apos;t share urgent medical concerns here. Call 911 or go to
          the nearest ER first.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="whitespace-nowrap rounded-full bg-accent px-7 py-3 text-base font-semibold text-black transition-colors hover:bg-accent-soft disabled:opacity-60"
        >
          {busy ? 'Sending…' : 'Send message →'}
        </button>
      </div>
    </form>
  );
}
