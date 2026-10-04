'use client';

/**
 * Member chat: the doctor and support threads as tabs, bubbles (member on the
 * right in ink, care team on the left in milk with a name and avatar), and a
 * composer that sticks to the bottom of the screen, above the phone tab bar.
 * Optimistic append, then router.refresh() for the server's truth.
 */

import { useEffect, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { sendMessageAction, type MessageChannel, type PortalMessage } from '@/lib/messages-db';
import { cn } from '@/lib/utils';

const CHANNELS: { key: MessageChannel; label: string; hint: string; who: string }[] = [
  { key: 'doctor', label: 'Dr. Elder', hint: 'Your treatment and dosing', who: 'Dr. Elder' },
  { key: 'support', label: 'Care team', hint: 'Orders, billing, shipping', who: 'Care team' },
];

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function Avatar({ channel }: { channel: MessageChannel }) {
  return channel === 'doctor' ? (
    <span className="relative block h-9 w-9 flex-none overflow-hidden rounded-full bg-butter-soft ring-1 ring-ink/10">
      {/* The cutout is a half-length portrait: zoom to the face. */}
      <Image
        src="/brand/dr-elder-cutout.webp"
        alt=""
        fill
        sizes="72px"
        priority
        className="origin-[50%_20%] scale-[2.3] object-cover object-top"
      />
    </span>
  ) : (
    <span
      aria-hidden
      className="grid h-9 w-9 flex-none place-items-center rounded-full bg-butter text-[13px] font-semibold text-ink ring-1 ring-ink/10"
    >
      EL
    </span>
  );
}

export function MemberChat({
  threads,
  initialChannel = 'support',
  waiting = [],
}: {
  threads: Record<MessageChannel, PortalMessage[]>;
  initialChannel?: MessageChannel;
  /** Threads where the care team spoke last: a dot on the tab. */
  waiting?: MessageChannel[];
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<MessageChannel>(initialChannel);
  const messages = threads[channel];
  const [draft, setDraft] = useState('');
  const [pendingMsgs, setPendingMsgs] = useState<PortalMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const meta = CHANNELS.find((c) => c.key === channel)!;

  const all = [...messages, ...pendingMsgs];

  // Open on the newest message, like any chat. Not on first paint of a short
  // thread, where it would only scroll the page header away.
  useEffect(() => {
    if (first.current && all.length < 4) {
      first.current = false;
      return;
    }
    first.current = false;
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [all.length, channel]);

  // Server refresh delivered the real rows: drop the optimistic copies.
  useEffect(() => {
    setPendingMsgs([]);
  }, [messages]);

  function pick(c: MessageChannel) {
    setChannel(c);
    setError(null);
    // Keep ?thread= in step, so a reload or a shared link opens the same tab.
    window.history.replaceState(null, '', `/portal/messages?thread=${c}`);
  }

  function send() {
    const text = draft.trim();
    if (!text || isPending) return;
    setError(null);
    setDraft('');
    setPendingMsgs((p) => [
      ...p,
      { id: `pending-${Date.now()}`, senderRole: 'member', body: text, createdAt: new Date().toISOString() },
    ]);
    startTransition(async () => {
      let res: { ok: boolean; error?: string };
      try {
        res = await sendMessageAction(channel, text);
      } catch {
        res = { ok: false };
      }
      if (!res.ok) {
        setError(res.error ?? 'Could not send. Try again.');
        setDraft(text);
        setPendingMsgs([]);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-3xl">
      {/* Thread tabs */}
      <div role="tablist" aria-label="Conversation" className="grid grid-cols-2 gap-1 rounded-full bg-milk p-1">
        {CHANNELS.map((c) => {
          const on = channel === c.key;
          return (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="chat-thread"
              onClick={() => pick(c.key)}
              className={cn(
                'relative flex min-h-[48px] items-center justify-center gap-2 rounded-full px-3 text-[16px] font-semibold transition-colors',
                on ? 'bg-white text-ink shadow-sm ring-1 ring-ink/5' : 'text-ink/65 hover:text-ink',
              )}
            >
              {c.label}
              {waiting.includes(c.key) && (
                <>
                  <span aria-hidden className="h-2 w-2 rounded-full bg-red-600" />
                  <span className="sr-only">(reply waiting)</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-[15px] text-ink/70">{meta.hint}. Replies within one business day.</p>

      {/* Thread */}
      <div id="chat-thread" role="tabpanel" aria-label={meta.label} className="mt-5 space-y-4">
        {all.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <Avatar channel={channel} />
            <p className="max-w-sm text-[16px] leading-relaxed text-ink/75">
              {channel === 'doctor'
                ? 'Message Dr. Elder about your treatment. Replies usually come within one business day.'
                : 'Ask us anything about your order, billing or shipping.'}
            </p>
          </div>
        )}
        {all.map((m, i) => {
          const mine = m.senderRole === 'member';
          // Name and avatar once per run of messages from the same side.
          const head = i === 0 || all[i - 1].senderRole !== m.senderRole;
          return (
            <div key={m.id} className={cn('flex items-start gap-2', mine ? 'justify-end' : 'justify-start')}>
              {!mine &&
                (head ? (
                  <span className="mt-6 block flex-none">
                    <Avatar channel={channel} />
                  </span>
                ) : (
                  <span className="w-9 flex-none" />
                ))}
              <div className={cn('flex max-w-[82%] flex-col md:max-w-[70%]', mine ? 'items-end' : 'items-start')}>
                {head && (
                  <span className="mb-1 px-1 text-[13px] font-semibold text-ink/75">{mine ? 'You' : meta.who}</span>
                )}
                <div
                  className={cn(
                    'rounded-[20px] px-4 py-2.5 text-[16px] leading-relaxed',
                    mine ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md bg-milk text-ink',
                    m.id.startsWith('pending-') && 'opacity-70',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
                <span className="mt-1 px-1 text-[12px] font-medium tabular-nums text-ink/60">
                  {m.id.startsWith('pending-') ? 'Sending…' : fmtTime(m.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} className="scroll-mb-40" />
      </div>

      {/* Composer: sticks to the bottom, above the phone tab bar (4rem + safe area). */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mt-6 md:bottom-4">
        {error && (
          <p role="alert" className="mb-2 rounded-inner bg-red-50 px-4 py-2.5 text-[15px] text-red-800 ring-1 ring-red-600/15">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2 rounded-[26px] bg-white/90 p-1.5 shadow-[0_12px_40px_-16px_rgba(17,17,17,0.35)] ring-1 ring-ink/10 backdrop-blur-xl">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            enterKeyHint="send"
            placeholder={channel === 'doctor' ? 'Message Dr. Elder…' : 'Message your care team…'}
            aria-label={channel === 'doctor' ? 'Message Dr. Elder' : 'Message your care team'}
            className="max-h-40 min-h-[44px] min-w-0 flex-1 resize-none bg-transparent px-3.5 py-2.5 text-[16px] leading-snug text-ink [field-sizing:content] placeholder:text-ink/55 focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            disabled={isPending || !draft.trim()}
            aria-label="Send"
            className="grid h-11 w-11 flex-none place-items-center rounded-full bg-ink text-white transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
