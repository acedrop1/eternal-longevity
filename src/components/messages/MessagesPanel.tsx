'use client';

/**
 * Member chat panel — one thread per channel ('support' | 'doctor'), toggle
 * on top, composer at the bottom. Optimistic append, then router.refresh()
 * to pick up the server truth.
 */

import { useRef, useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  sendMessageAction,
  type MessageChannel,
  type PortalMessage,
} from '@/lib/messages-db';

const CHANNELS: { key: MessageChannel; label: string; hint: string }[] = [
  { key: 'support', label: 'Support', hint: 'Orders, billing, shipping' },
  { key: 'doctor', label: 'Doctor', hint: 'Your treatment and dosing' },
];

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function MessagesPanel({
  threads,
  initialChannel = 'support',
}: {
  threads: Record<MessageChannel, PortalMessage[]>;
  initialChannel?: MessageChannel;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<MessageChannel>(initialChannel);
  const messages = threads[channel];
  const [draft, setDraft] = useState('');
  const [pendingMsgs, setPendingMsgs] = useState<PortalMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const all = [...messages, ...pendingMsgs];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [all.length, channel]);

  // Server refresh delivered the real rows — drop the optimistic copies.
  useEffect(() => {
    setPendingMsgs([]);
  }, [messages]);

  function send() {
    const text = draft.trim();
    if (!text || isPending) return;
    setError(null);
    setDraft('');
    setPendingMsgs((p) => [
      ...p,
      {
        id: `pending-${Date.now()}`,
        senderRole: 'member',
        body: text,
        createdAt: new Date().toISOString(),
      },
    ]);
    startTransition(async () => {
      const res = await sendMessageAction(channel, text);
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
    <div className="flex h-[calc(100dvh-18rem)] min-h-[28rem] flex-col overflow-hidden rounded-shell bg-milk md:h-[calc(100vh-16rem)]">
      {/* channel toggle */}
      <div role="tablist" aria-label="Conversation" className="grid grid-cols-2 gap-1.5 border-b border-ink/10 p-2">
        {CHANNELS.map((c) => {
          const on = channel === c.key;
          return (
            <button
              key={c.key}
              role="tab"
              aria-selected={on}
              onClick={() => setChannel(c.key)}
              className={`relative min-h-[44px] rounded-inner px-3 py-2.5 text-left transition-colors ${
                on
                  ? 'bg-white text-ink shadow-sm ring-1 ring-ink/5'
                  : 'text-ink/60 hover:bg-white/60 hover:text-ink'
              }`}
            >
              <span className="flex items-center gap-2 text-[15px] font-medium">
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-butter-deep' : 'bg-ink/20'}`}
                />
                {c.label}
              </span>
              <span className="mt-0.5 block truncate font-medium text-[12px] text-ink/50">{c.hint}</span>
            </button>
          );
        })}
      </div>

      {/* thread */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {all.length === 0 && (
          <p className="mx-auto max-w-sm pt-10 text-center text-[15px] leading-relaxed text-ink/55">
            {channel === 'doctor'
              ? 'Message your prescriber about your treatment. Replies usually come within one business day.'
              : 'Ask us anything about your order, billing or shipping.'}
          </p>
        )}
        {all.map((m) => {
          const mine = m.senderRole === 'member';
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-inner px-4 py-2.5 text-[15px] leading-relaxed md:max-w-[75%] ${
                  mine
                    ? 'bg-ink text-white'
                    : 'bg-white text-ink ring-1 ring-ink/5'
                }`}
              >
                {!mine && (
                  <span className="mb-0.5 block font-medium text-[12px] text-ink/55">
                    {channel === 'doctor' ? 'Doctor' : 'Support'}
                  </span>
                )}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <span
                  className={`mt-1 block font-medium text-[11px] tabular-nums ${mine ? 'text-white/60' : 'text-ink/45'}`}
                >
                  {fmtTime(m.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <div className="border-t border-ink/10 bg-milk p-2 md:p-3">
        {error && (
          <p role="alert" className="mb-2 px-1 text-[14px] text-red-800">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            enterKeyHint="send"
            placeholder={
              channel === 'doctor' ? 'Message your doctor…' : 'Message support…'
            }
            aria-label={
              channel === 'doctor' ? 'Message your doctor' : 'Message support'
            }
            className="min-w-0 flex-1 resize-none rounded-inner bg-white px-4 py-3 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink/30"
          />
          <button
            onClick={send}
            disabled={isPending || !draft.trim()}
            className="min-h-[44px] flex-none rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
