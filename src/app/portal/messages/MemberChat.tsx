'use client';

/**
 * Member messages: an inbox of conversations (Dr. Elder, Care team) and the
 * open conversation. Phone: the list, then the chat full width with a back
 * arrow. Desktop: the list on the left, the chat on the right.
 *
 * A thread is per person, not per order, so the doctor sees the member's
 * whole history in one place. His messages about an order start with
 * "About order #N (products):" (lib/orders-db orderLabel); that line becomes
 * an order tag on the bubble and in the list, so a member with several
 * orders can tell which one each message is about.
 *
 * Optimistic append, then router.refresh() for the server's truth.
 */

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendMessageAction, type MessageChannel, type PortalMessage } from '@/lib/messages-db';
import { cn } from '@/lib/utils';

const CHANNELS: { key: MessageChannel; label: string; hint: string; initials: string }[] = [
  { key: 'doctor', label: 'Dr. Elder', hint: 'Your treatment and dosing', initials: 'BE' },
  { key: 'support', label: 'Care team', hint: 'Orders, billing, shipping', initials: 'EL' },
];

const ORDER_PREFIX = /^About order #(\d+)(?: \(([^)]*)\))?:\s*/;

/** Split the "About order #N (products):" lead-in off a message. */
function splitOrder(body: string): { order: { ref: string; products?: string } | null; text: string } {
  const m = body.match(ORDER_PREFIX);
  return m ? { order: { ref: m[1], products: m[2] }, text: body.slice(m[0].length) } : { order: null, text: body };
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Short time for the list: today shows the time, otherwise the date. */
function fmtShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Avatar({ channel, size = 'md' }: { channel: MessageChannel; size?: 'md' | 'lg' }) {
  const c = CHANNELS.find((x) => x.key === channel)!;
  return (
    <span
      aria-hidden
      className={cn(
        'grid flex-none place-items-center rounded-full font-semibold ring-1 ring-ink/10',
        size === 'lg' ? 'h-11 w-11 text-[14px]' : 'h-9 w-9 text-[13px]',
        channel === 'doctor' ? 'bg-ink text-white' : 'bg-butter text-ink',
      )}
    >
      {c.initials}
    </span>
  );
}

function OrderTag({ order }: { order: { ref: string; products?: string } }) {
  return (
    <span className="mb-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-ink ring-1 ring-ink/10">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
        <path d="M3 8l9 5 9-5M12 13v8" />
      </svg>
      <span className="truncate">
        Order #{order.ref}
        {order.products ? ` · ${order.products}` : ''}
      </span>
    </span>
  );
}

export function MemberChat({
  threads,
  initialChannel = 'support',
  openOnLoad = null,
  waiting = [],
}: {
  threads: Record<MessageChannel, PortalMessage[]>;
  /** The conversation shown on desktop when none is picked. */
  initialChannel?: MessageChannel;
  /** ?thread= from a link (an email): open that conversation straight away, phone included. */
  openOnLoad?: MessageChannel | null;
  /** Conversations where the care team spoke last: a dot in the list. */
  waiting?: MessageChannel[];
}) {
  const router = useRouter();
  // null on a phone = the list. Desktop always shows a conversation beside the list.
  const [selected, setSelected] = useState<MessageChannel | null>(openOnLoad);
  const channel = selected ?? initialChannel;
  const meta = CHANNELS.find((c) => c.key === channel)!;
  const messages = threads[channel];
  const [draft, setDraft] = useState('');
  const [pendingMsgs, setPendingMsgs] = useState<PortalMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const all = [...messages, ...pendingMsgs];

  // Bring the newest message into view, but only if it's off screen: a short
  // thread stays put instead of scrolling the page under the top bar.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [all.length, channel]);

  // Server refresh delivered the real rows: drop the optimistic copies.
  useEffect(() => {
    setPendingMsgs([]);
  }, [messages]);

  function open(c: MessageChannel | null) {
    setSelected(c);
    setError(null);
    // Keep ?thread= in step, so a reload or a shared link opens the same view.
    window.history.replaceState(null, '', c ? `/portal/messages?thread=${c}` : '/portal/messages');
    if (c) window.scrollTo({ top: 0 });
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
    <div className="md:grid md:grid-cols-[300px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* Inbox */}
      <section aria-label="Conversations" className={cn(selected ? 'hidden md:block' : 'block')}>
        <h1 className="mb-5 text-[32px] font-semibold leading-[1] tracking-[-0.04em] text-ink md:text-[44px]">Messages</h1>
        <ul className="divide-y divide-ink/[0.06] overflow-hidden rounded-shell bg-milk">
          {CHANNELS.map((c) => {
            const last = threads[c.key].at(-1);
            const parts = last ? splitOrder(last.body) : null;
            const unread = waiting.includes(c.key);
            const active = channel === c.key;
            return (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => open(c.key)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30',
                    active && 'md:bg-white',
                  )}
                >
                  <Avatar channel={c.key} size="lg" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn('truncate text-[16px] text-ink', unread ? 'font-bold' : 'font-semibold')}>{c.label}</span>
                      {last && <span className="flex-none text-[12px] tabular-nums text-ink/55">{fmtShort(last.createdAt)}</span>}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={cn('line-clamp-2 text-[14px] leading-snug', unread ? 'text-ink' : 'text-ink/65')}>
                        {last
                          ? `${last.senderRole === 'member' ? 'You: ' : ''}${parts!.order ? `Order #${parts!.order.ref} · ` : ''}${parts!.text}`
                          : c.hint}
                      </span>
                      {unread && (
                        <>
                          <span aria-hidden className="ml-auto h-2.5 w-2.5 flex-none rounded-full bg-red-600" />
                          <span className="sr-only">(new reply)</span>
                        </>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 px-1 text-[13px] leading-relaxed text-ink/60">
          Messages about an order are tagged with its number. Replies within one business day.
        </p>
      </section>

      {/* Conversation */}
      {/* Fills the screen below the top bar (and above the phone tab bar), so the composer sits at the bottom. */}
      <section
        aria-label={meta.label}
        className={cn(
          // Phone: 100dvh minus top bar (4.25rem), page padding (2rem + 2rem) and tab bar (4.5rem + safe area).
          'min-h-[calc(100dvh-13rem-env(safe-area-inset-bottom))] min-w-0 flex-col md:min-h-[calc(100dvh-7.5rem)]',
          selected ? 'flex' : 'hidden md:flex',
        )}
      >
        <div className="flex items-center gap-3 border-b border-ink/[0.06] pb-4">
          <button
            type="button"
            onClick={() => open(null)}
            aria-label="Back to messages"
            className="-ml-1 grid h-11 w-11 flex-none place-items-center rounded-full text-ink transition-colors hover:bg-milk md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <Avatar channel={channel} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-[18px] font-semibold leading-tight text-ink">{meta.label}</h2>
            <p className="truncate text-[13px] text-ink/60">{meta.hint} · replies within one business day</p>
          </div>
        </div>

        <div className="mt-5 flex-1 space-y-4">
          {all.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <Avatar channel={channel} size="lg" />
              <p className="max-w-sm text-[16px] leading-relaxed text-ink/75">
                {channel === 'doctor'
                  ? 'Message Dr. Elder about your treatment. Replies usually come within one business day.'
                  : 'Ask us anything about your order, billing or shipping.'}
              </p>
            </div>
          )}
          {all.map((m, i) => {
            const mine = m.senderRole === 'member';
            const { order, text } = splitOrder(m.body);
            // Avatar once per run of messages from the same side.
            const head = i === 0 || all[i - 1].senderRole !== m.senderRole;
            return (
              <div key={m.id} className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
                {!mine && (head ? <Avatar channel={channel} /> : <span className="w-9 flex-none" />)}
                <div className={cn('flex min-w-0 max-w-[85%] flex-col md:max-w-[70%]', mine ? 'items-end' : 'items-start')}>
                  <div
                    className={cn(
                      'max-w-full rounded-[20px] px-4 py-2.5 text-[16px] leading-relaxed',
                      mine ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md bg-milk text-ink',
                      m.id.startsWith('pending-') && 'opacity-70',
                    )}
                  >
                    {order && <OrderTag order={order} />}
                    <p className="whitespace-pre-wrap break-words">{text}</p>
                  </div>
                  <span className="mt-1 px-1 text-[12px] font-medium tabular-nums text-ink/55">
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
      </section>
    </div>
  );
}
