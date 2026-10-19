'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { submitPrivacyRequestAction } from '@/lib/privacy-actions';
import { PRIVACY_REQUEST_TYPES, SERVICE_STATES } from '@/lib/marketing-consent';
import { SUPPORT_EMAIL } from '@/lib/site';

const fieldClass =
  'w-full rounded-inner bg-white px-4 py-3.5 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/55 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/60';
const labelClass = 'mb-2 block text-[13px] font-medium text-ink/70';
const hint = 'mt-2 text-[13px] leading-relaxed text-ink/65';

/** /privacy-request. Agent and appeal fields appear only for those request types. */
export function PrivacyRequestForm() {
  const [type, setType] = useState('');
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      const res = await submitPrivacyRequestAction({
        type,
        name: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        state: String(data.get('state') ?? ''),
        details: String(data.get('details') ?? ''),
        agentName: String(data.get('agentName') ?? ''),
        agentStatement: data.get('agentStatement') === 'on',
        appealOf: String(data.get('appealOf') ?? ''),
        website: String(data.get('website') ?? ''),
      });
      if (res.ok) setRef(res.ref ?? '');
      else setError(res.error ?? 'Something went wrong.');
    } catch {
      setError('Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (ref !== null) {
    return (
      <div className="rounded-inner bg-butter-soft p-6 md:p-8" role="status">
        <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">Request received{ref ? `: ${ref}` : ''}.</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          We’ve emailed you a receipt. We respond within 45 days, and the receipt explains how to appeal.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-5">
      <div>
        <label htmlFor="pr-type" className={labelClass}>
          What would you like us to do?
        </label>
        <div className="relative">
          <select id="pr-type" required value={type} onChange={(e) => setType(e.target.value)} className={`${fieldClass} appearance-none pr-11`}>
            <option value="" disabled>
              Choose…
            </option>
            {PRIVACY_REQUEST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/65" strokeWidth={1.75} />
        </div>
        {type === 'ad_opt_out' && <p className={hint}>No account, login or identity verification needed for an advertising opt-out.</p>}
      </div>

      {type === 'appeal' && (
        <div>
          <label htmlFor="pr-appeal" className={labelClass}>
            Reference of the request you’re appealing
          </label>
          <input id="pr-appeal" name="appealOf" required placeholder="PR-1A2B3C" maxLength={9} className={fieldClass} />
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="pr-name" className={labelClass}>
            {type === 'agent' ? 'Name of the person you represent' : 'Full name'}
          </label>
          <input id="pr-name" name="name" required maxLength={120} autoComplete={type === 'agent' ? 'off' : 'name'} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="pr-email" className={labelClass}>
            {type === 'agent' ? 'Your email' : 'Email'}
          </label>
          <input id="pr-email" name="email" type="email" required autoComplete="email" className={fieldClass} />
        </div>
      </div>

      <div>
        <label htmlFor="pr-state" className={labelClass}>
          State of residence
        </label>
        <div className="relative">
          <select id="pr-state" name="state" required defaultValue="" className={`${fieldClass} appearance-none pr-11`}>
            <option value="" disabled>
              Choose…
            </option>
            {SERVICE_STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
            <option value="Other">Another state</option>
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/65" strokeWidth={1.75} />
        </div>
      </div>

      {type === 'agent' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="pr-agent" className={labelClass}>
              Your name (authorized agent)
            </label>
            <input id="pr-agent" name="agentName" required maxLength={120} autoComplete="name" className={fieldClass} />
          </div>
          <label className="flex gap-3 text-[14px] leading-relaxed text-ink-soft">
            <input type="checkbox" name="agentStatement" required className="mt-0.5 h-5 w-5 flex-none rounded accent-ink" />
            <span>
              I am authorized to make this request on this person’s behalf, and can provide proof of that authority if
              asked. (Not needed for an advertising opt-out.)
            </span>
          </label>
        </div>
      )}

      <div>
        <label htmlFor="pr-details" className={labelClass}>
          Details <span className="font-normal text-ink/55">(optional)</span>
        </label>
        <textarea id="pr-details" name="details" rows={5} maxLength={2000} className={`${fieldClass} resize-none`} />
        <p className={hint}>
          {type === 'agent' ? 'Tell us what you’re requesting for them. ' : ''}Please don’t include health details.
        </p>
      </div>

      {/* Honeypot. Off-screen rather than display:none so a bot still fills it. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-0 w-0 opacity-0" />

      {error && (
        <p role="alert" className="rounded-inner bg-red-50 px-4 py-3 text-[14px] leading-relaxed text-red-700">
          {error} You can also email {SUPPORT_EMAIL}.
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-ink px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {busy ? 'Sending…' : 'Send request'}
      </button>
    </form>
  );
}
