'use client';

/**
 * Admin support inbox, Shopify Inbox style: thread list and conversation side
 * by side from md up, one pane at a time on phones. Same data and the same
 * `replyMessageAction` as the shared StaffInbox (which the doctor portal keeps).
 */

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { replyMessageAction, type MessageThread, type PortalMessage } from '@/lib/messages-db';
import { cn } from '@/lib/utils';
import { IndexTabs, indexCard } from '@/components/admin/IndexTable';

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

type Tab = 'all' | 'awaiting';

export function AdminInbox({
  threads,
  messagesByUser,
}: {
  threads: MessageThread[];
  messagesByUser: Record<string, PortalMessage[]>;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(threads[0]?.userId ?? null);
  /** Phones show one pane: the list until a thread is picked. */
  const [pane, setPane] = useState<'list' | 'thread'>('list');
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const active = threads.find((t) => t.userId === activeId) ?? null;
  const messages = activeId ? (messagesByUser[activeId] ?? []) : [];
  const awaiting = threads.filter((t) => t.awaitingReply).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter(
      (t) =>
        (tab === 'all' || t.awaitingReply) &&
        (!q || t.memberName.toLowerCase().includes(q) || t.memberEmail.toLowerCase().includes(q)),
    );
  }, [threads, tab, query]);

  function send() {
    const text = draft.trim();
    if (!text || !activeId || isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await replyMessageAction(activeId, 'support', text);
        if (!res.ok) {
          setError(res.error ?? 'Could not send.');
        } else {
          setDraft('');
          router.refresh();
        }
      } catch {
        // A thrown action (e.g. no database) keeps the draft instead of taking the page down.
        setError('Could not send. Try again.');
      }
    });
  }

  if (threads.length === 0) {
    return (
      <div className={cn(indexCard, 'px-6 py-10 text-center text-[13px] text-ink/65')}>
        No messages yet. Member conversations will appear here.
      </div>
    );
  }

  return (
    <div
      className={cn(
        indexCard,
        'grid h-[calc(100dvh-15rem)] min-h-[28rem] grid-cols-1 grid-rows-[minmax(0,1fr)] md:h-[calc(100vh-14rem)] md:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)]',
      )}
    >
      {/* ---------- Thread list ---------- */}
      <div className={cn('min-h-0 flex-col border-ink/10 md:flex md:border-r', pane === 'list' ? 'flex' : 'hidden')}>
        <IndexTabs
          label="Inbox filter"
          tabs={[
            { key: 'all', label: 'All', count: threads.length },
            { key: 'awaiting', label: 'Awaiting reply', count: awaiting },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="border-b border-ink/10 px-3 py-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="h-10 w-full rounded-thumb bg-white px-3 text-[16px] text-ink ring-1 ring-ink/15 placeholder:text-ink/55 focus:outline-none focus:ring-2 focus:ring-ink/30 md:h-9 md:text-[13px]"
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {visible.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-ink/60">No conversations match.</li>}
          {visible.map((t) => {
            const on = t.userId === activeId;
            return (
              <li key={t.userId}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(t.userId);
                    setPane('thread');
                    setError(null);
                  }}
                  aria-current={on ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-start gap-3 border-b border-ink/10 px-3 py-3 text-left transition-colors',
                    on ? 'md:bg-ink/[0.06]' : 'hover:bg-milk/70',
                  )}
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 flex-none place-items-center rounded-full bg-milk text-[12px] font-semibold text-ink/70 ring-1 ring-ink/10"
                  >
                    {initials(t.memberName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn('truncate text-[13px] text-ink', t.awaitingReply ? 'font-semibold' : 'font-medium')}>
                        {t.memberName}
                      </span>
                      <span className="flex-none text-[12px] tabular-nums text-ink/55">{fmtTime(t.lastAt)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={cn('min-w-0 flex-1 truncate text-[12px]', t.awaitingReply ? 'text-ink/85' : 'text-ink/60')}>
                        {t.lastBody}
                      </span>
                      {t.awaitingReply && (
                        <span aria-label="Awaiting reply" title="Awaiting reply" className="h-2 w-2 flex-none rounded-full bg-amber-500" />
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ---------- Conversation ---------- */}
      <div className={cn('min-h-0 flex-col md:flex', pane === 'thread' ? 'flex' : 'hidden')}>
        {active && (
          <div className="flex items-center gap-2 border-b border-ink/10 px-3 py-2.5 md:px-4">
            <button
              type="button"
              onClick={() => setPane('list')}
              aria-label="Back to conversations"
              className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-thumb text-ink/65 hover:bg-ink/[0.06] hover:text-ink md:hidden"
            >
              <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 5 7 10l5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-ink">{active.memberName}</p>
              <p className="truncate text-[12px] text-ink/60">{active.memberEmail}</p>
            </div>
            {active.awaitingReply && (
              <span className="ml-auto inline-flex flex-none items-center gap-1.5 rounded-full bg-butter px-2 py-0.5 text-[12px] font-medium text-ink">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Awaiting reply
              </span>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-milk/40 p-3 md:p-4">
          {messages.map((m) => {
            const mine = m.senderRole !== 'member';
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-inner px-3.5 py-2 text-[13px] leading-relaxed md:max-w-[70%]',
                    mine ? 'bg-ink text-white' : 'bg-white text-ink/90 ring-1 ring-ink/10',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <span className={cn('mt-1 block text-[11px] tabular-nums', mine ? 'text-white/65' : 'text-ink/55')}>
                    {fmtTime(m.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-ink/10 p-3">
          {error && <p className="mb-2 px-1 text-[12px] text-red-700">{error}</p>}
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
              aria-label="Reply"
              placeholder="Reply…"
              className="min-w-0 flex-1 resize-none rounded-thumb bg-white px-3 py-2 text-[16px] text-ink ring-1 ring-ink/15 placeholder:text-ink/55 focus:outline-none focus:ring-2 focus:ring-ink/30 md:text-[13px]"
            />
            <button
              type="button"
              onClick={send}
              disabled={isPending || !draft.trim() || !activeId}
              className="inline-flex min-h-[40px] flex-none items-center rounded-full bg-ink px-4 text-[13px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-40"
            >
              {isPending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
