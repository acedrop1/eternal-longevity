'use client';

import { useState, useTransition } from 'react';
import { markEmailSubscribedAction, stopMarketingAction } from '@/lib/admin-marketing-actions';
import { useConfirm } from '@/components/ui/useConfirm';

const btn =
  'inline-flex min-h-[36px] items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-50';

/** Under Consents & marketing: invite to email, or turn a channel off. Texts can only be turned on by the member. */
export function MemberMarketingControls({
  memberId,
  emailStatus,
  smsStatus,
}: {
  memberId: string;
  emailStatus: string;
  smsStatus: string;
}) {
  const [note, setNote] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const [confirm, confirmDialog] = useConfirm();
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      try {
        setNote(await fn());
      } catch {
        setNote({ ok: false, message: 'Request failed. Try again.' });
      }
    });
  const live = (s: string) => s === 'pending' || s === 'subscribed';

  return (
    <div className="space-y-2 border-t border-ink/10 px-4 py-3">
      {confirmDialog}
      <div className="flex flex-wrap gap-2">
        {emailStatus !== 'subscribed' && (
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              const ok = await confirm({
                title: 'They agreed on a call?',
                body: 'They said yes to marketing emails from Eternal Longevity. This is recorded as their consent.',
                confirmLabel: 'Subscribe',
              });
              if (ok) run(() => markEmailSubscribedAction(memberId));
            }}
            className={`${btn} bg-ink text-white hover:bg-ink/85`}
          >
            Subscribe to marketing email (agreed by phone)
          </button>
        )}
        {live(emailStatus) && (
          <button type="button" disabled={pending} onClick={() => run(() => stopMarketingAction(memberId, 'email'))} className={`${btn} bg-milk text-ink hover:bg-milk-deep`}>
            Turn off marketing email
          </button>
        )}
        {live(smsStatus) && (
          <button type="button" disabled={pending} onClick={() => run(() => stopMarketingAction(memberId, 'sms'))} className={`${btn} bg-milk text-ink hover:bg-milk-deep`}>
            Turn off marketing texts
          </button>
        )}
      </div>
      <p className="text-[12.5px] leading-snug text-ink/60">
        Use the subscribe button only when they told you yes. It’s logged as consent given by phone, with your name and the date.
        Marketing texts can only be turned on by the customer (Account → Offers and updates): the law needs their written consent.
      </p>
      {note && (
        <p role={note.ok ? 'status' : 'alert'} className={`text-[13px] ${note.ok ? 'text-emerald-800' : 'text-red-700'}`}>
          {note.message}
        </p>
      )}
    </div>
  );
}
