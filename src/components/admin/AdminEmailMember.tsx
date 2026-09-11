'use client';

import { useState } from 'react';
import { adminSendMemberEmail } from '@/lib/admin-users-actions';
import { cn } from '@/lib/utils';

type Template = 'welcome' | 'custom';

/**
 * Send a member a branded email without leaving the portal.
 *
 * Deliberately two choices and no editor: resend the welcome, or write
 * something. A rich composer here would only produce mail that looks less like
 * the rest of ours, which is the problem it is meant to solve.
 */
export function AdminEmailMember({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const [template, setTemplate] = useState<Template>('custom');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  const ready =
    template === 'welcome' || (subject.trim() !== '' && body.trim() !== '');

  async function send() {
    if (!ready || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await adminSendMemberEmail({ userId, template, subject, body });
      setResult({ ok: res.ok, message: res.message ?? '' });
      if (res.ok && template === 'custom') {
        setSubject('');
        setBody('');
      }
    } catch {
      setResult({ ok: false, message: 'Could not send that. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  const field =
    'w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['custom', 'Write a message'],
            ['welcome', 'Resend the welcome'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTemplate(key);
              setResult(null);
            }}
            className={cn(
              'rounded-full border px-4 py-2 text-xs font-medium tracking-wider transition-colors',
              template === key
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-line bg-surface text-foreground/65 hover:border-foreground/30 hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {template === 'welcome' ? (
        <p className="mb-4 rounded-2xl border border-line bg-background px-4 py-3 text-sm leading-relaxed text-foreground/60">
          Sends the standard welcome — what happens next, and a link to complete
          their visit. Useful when the first one bounced or went to spam.
        </p>
      ) : (
        <div className="mb-4 space-y-3">
          <div>
            <label
              htmlFor="admin-email-subject"
              className="mb-1.5 block text-[11px] tracking-wider text-foreground/60"
            >
              SUBJECT
            </label>
            <input
              id="admin-email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="About your recent order"
              className={field}
            />
          </div>
          <div>
            <label
              htmlFor="admin-email-body"
              className="mb-1.5 block text-[11px] tracking-wider text-foreground/60"
            >
              MESSAGE
            </label>
            <textarea
              id="admin-email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              maxLength={5000}
              placeholder={
                'Write normally. A blank line starts a new paragraph.\n\nIt goes out in the Eternal Longevity template, addressed to them by first name and signed off by the team.'
              }
              className={cn(field, 'resize-none')}
            />
          </div>
          <p className="text-xs leading-relaxed text-foreground/45">
            Don&apos;t put clinical advice in here — that is the prescriber&apos;s
            to give, and it belongs in their portal thread.
          </p>
        </div>
      )}

      {result && (
        <p
          className={cn(
            'mb-4 rounded-2xl border px-4 py-3 text-sm',
            result.ok
              ? 'border-accent/40 bg-accent/5 text-accent'
              : 'border-red-500/30 bg-red-500/5 text-red-300',
          )}
        >
          {result.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!ready || busy}
          onClick={send}
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-soft disabled:opacity-40"
        >
          {busy ? 'Sending…' : 'Send'}
        </button>
        <span className="text-xs text-foreground/45">to {email}</span>
      </div>
    </div>
  );
}
