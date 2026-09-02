'use client';

/**
 * Staff inbox for one channel: thread list on the left, active conversation
 * on the right. Used by the doctor ('doctor' channel) and admin ('support').
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  replyMessageAction,
  type MessageChannel,
  type MessageThread,
  type PortalMessage,
} from '@/lib/messages-db';

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

export function StaffInbox({
  channel,
  threads,
  messagesByUser,
}: {
  channel: MessageChannel;
  threads: MessageThread[];
  messagesByUser: Record<string, PortalMessage[]>;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(threads[0]?.userId ?? null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const active = threads.find((t) => t.userId === activeId) ?? null;
  const messages = activeId ? (messagesByUser[activeId] ?? []) : [];

  function send() {
    const text = draft.trim();
    if (!text || !activeId || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await replyMessageAction(activeId, channel, text);
      if (!res.ok) {
        setError(res.error ?? 'Could not send.');
      } else {
        setDraft('');
        router.refresh();
      }
    });
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-10 text-center">
        <p className="text-sm text-foreground/50">
          No messages yet. Member conversations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-16rem)] min-h-[28rem] grid-cols-1 overflow-hidden rounded-3xl border border-line bg-surface md:grid-cols-[minmax(14rem,1fr)_2fr]">
      {/* thread list */}
      <div className="overflow-y-auto border-b border-line md:border-b-0 md:border-r">
        {threads.map((t) => (
          <button
            key={t.userId}
            onClick={() => setActiveId(t.userId)}
            className={`block w-full border-b border-line px-4 py-3 text-left transition ${
              t.userId === activeId
                ? 'bg-accent/10'
                : 'hover:bg-foreground/[0.03]'
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {t.memberName}
              </span>
              {t.awaitingReply && (
                <span className="h-2 w-2 flex-none rounded-full bg-accent" />
              )}
            </span>
            <span className="block truncate text-xs text-foreground/50">{t.lastBody}</span>
            <span className="block text-[10px] text-foreground/35">{fmtTime(t.lastAt)}</span>
          </button>
        ))}
      </div>

      {/* conversation */}
      <div className="flex min-h-0 flex-col">
        {active && (
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{active.memberName}</p>
            <p className="text-xs text-foreground/45">{active.memberEmail}</p>
          </div>
        )}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => {
            const mine = m.senderRole !== 'member';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    mine
                      ? 'bg-accent text-black'
                      : 'border border-line bg-background text-foreground/90'
                  }`}
                >
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
        </div>
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
              placeholder="Reply…"
              className="flex-1 resize-none rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder:text-foreground/35 focus:border-accent/60 focus:outline-none"
            />
            <button
              onClick={send}
              disabled={isPending || !draft.trim() || !activeId}
              className="pill bg-accent px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
