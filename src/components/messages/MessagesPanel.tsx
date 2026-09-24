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
}: {
  threads: Record<MessageChannel, PortalMessage[]>;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<MessageChannel>('support');
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
    <div className="flex h-[calc(100dvh-18rem)] min-h-[28rem] flex-col overflow-hidden rounded-[4px] bg-[#F2F2F0] md:h-[calc(100vh-16rem)]">
      {/* channel toggle */}
      <div role="tablist" aria-label="Conversation" className="grid grid-cols-2 gap-1.5 border-b border-black/10 p-2">
        {CHANNELS.map((c) => {
          const on = channel === c.key;
          return (
            <button
              key={c.key}
              role="tab"
              aria-selected={on}
              onClick={() => setChannel(c.key)}
              className={`relative min-h-[44px] rounded-[2px] px-3 py-2.5 text-left transition-colors ${
                on
                  ? 'bg-white text-black ring-1 ring-black/10'
                  : 'text-black/60 hover:bg-black/[0.03] hover:text-black'
              }`}
            >
              <span className="flex items-center gap-2 text-[15px] font-medium">
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-[#D5A850]' : 'bg-black/20'}`}
                />
                {c.label}
              </span>
              <span className="mt-0.5 block truncate font-mono text-[12px] text-black/50">{c.hint}</span>
            </button>
          );
        })}
      </div>

      {/* thread */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {all.length === 0 && (
          <p className="mx-auto max-w-sm pt-10 text-center text-[15px] leading-relaxed text-black/55">
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
                className={`max-w-[85%] rounded-[4px] px-4 py-2.5 text-[15px] leading-relaxed md:max-w-[75%] ${
                  mine
                    ? 'bg-black text-white'
                    : 'bg-white text-black ring-1 ring-black/10'
                }`}
              >
                {!mine && (
                  <span className="mb-0.5 block font-mono text-[12px] text-black/55">
                    {channel === 'doctor' ? 'Doctor' : 'Support'}
                  </span>
                )}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <span
                  className={`mt-1 block font-mono text-[11px] tabular-nums ${mine ? 'text-white/60' : 'text-black/45'}`}
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
      <div className="border-t border-black/10 bg-[#F2F2F0] p-2 md:p-3">
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
            placeholder={
              channel === 'doctor' ? 'Message your doctor…' : 'Message support…'
            }
            aria-label={
              channel === 'doctor' ? 'Message your doctor' : 'Message support'
            }
            className="min-w-0 flex-1 resize-none rounded-[2px] bg-white px-4 py-3 text-[16px] text-black ring-1 ring-black/15 placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={send}
            disabled={isPending || !draft.trim()}
            className="min-h-[44px] flex-none rounded-full bg-black px-5 py-2.5 font-mono text-[13px] text-white transition-colors hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
