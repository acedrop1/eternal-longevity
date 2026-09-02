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
    <div className="flex h-[calc(100vh-16rem)] min-h-[28rem] flex-col rounded-3xl border border-line bg-surface">
      {/* channel toggle */}
      <div className="flex gap-2 border-b border-line p-3">
        {CHANNELS.map((c) => (
          <button
            key={c.key}
            onClick={() => setChannel(c.key)}
            className={`flex-1 rounded-2xl px-4 py-2.5 text-left transition ${
              channel === c.key
                ? 'bg-accent/15 text-foreground'
                : 'text-foreground/60 hover:text-foreground hover:bg-foreground/[0.04]'
            }`}
          >
            <span className="block text-sm font-semibold">{c.label}</span>
            <span className="block text-[11px] text-foreground/45">{c.hint}</span>
          </button>
        ))}
      </div>

      {/* thread */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {all.length === 0 && (
          <p className="pt-10 text-center text-sm text-foreground/45">
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
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  mine
                    ? 'bg-accent text-black'
                    : 'border border-line bg-background text-foreground/90'
                }`}
              >
                {!mine && (
                  <span className="mb-0.5 block text-[10px] tracking-widest text-foreground/45">
                    {channel === 'doctor' ? 'DOCTOR' : 'SUPPORT'}
                  </span>
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <span
                  className={`mt-1 block text-[10px] ${mine ? 'text-black/50' : 'text-foreground/40'}`}
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
      <div className="border-t border-line p-3">
        {error && <p className="mb-2 px-1 text-xs text-red-400">{error}</p>}
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
            className="flex-1 resize-none rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder:text-foreground/35 focus:border-accent/60 focus:outline-none"
          />
          <button
            onClick={send}
            disabled={isPending || !draft.trim()}
            className="pill bg-accent px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
