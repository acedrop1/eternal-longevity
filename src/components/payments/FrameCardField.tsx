'use client';

/**
 * The card field: the processor's own iframe (Frame.js), so a card number
 * never passes through our page, our JavaScript or our servers. What comes
 * out is the encrypted number and CVC plus the plain expiry, which a server
 * action forwards unchanged (lib/payments saveCard).
 *
 * Frame.js has no npm package: it loads from its CDN as a script tag and must
 * be initialised once per page, so both are cached at module level.
 */

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import type { EncryptedCard } from '@/lib/frame';

const SCRIPT_SRC = 'https://js.framepayments.com/v1/index.js';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_FRAME_PUBLISHABLE_KEY ?? '';

export type CardField = 'number' | 'cvc' | 'expiry';

/* Typed only as far as we use it (docs: frame-js card + installation). */
interface FrameCardPayload {
  isComplete: boolean;
  card?: {
    number: string | null;
    cvc: string | null;
    expiry?: { month: string | null; year: string | null } | null;
  } | null;
}
interface FrameCardElement {
  mount(target: string | HTMLElement): Promise<void>;
  unmount(): void;
  on(event: 'change', cb: (p: FrameCardPayload) => void): unknown;
  setFieldError(field: CardField, message: string | null): void;
}
interface FrameInstance {
  createElement(type: 'card', options?: Record<string, unknown>): Promise<FrameCardElement>;
  cardTheme?(preset: string): unknown;
  themes?(preset: string): unknown;
  confirmCardPayment(clientSecret: string): Promise<unknown>;
}
declare global {
  interface Window {
    Frame?: { init(publishableKey: string, options?: { accountId?: string }): Promise<FrameInstance> };
  }
}

let framePromise: Promise<FrameInstance> | null = null;

/**
 * Load the script and run Frame.init, once per page. The first accountId
 * wins (Frame.init must not run twice). A failure clears the cache so
 * "Try again" really retries.
 */
function loadFrame(accountId?: string): Promise<FrameInstance> {
  if (framePromise) return framePromise;
  const p = new Promise<void>((resolve, reject) => {
    if (window.Frame) return resolve();
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      s.remove();
      reject(new Error('card_script_failed'));
    };
    document.head.appendChild(s);
  }).then(() => {
    if (!window.Frame) throw new Error('card_script_failed');
    return window.Frame.init(PUBLISHABLE_KEY, accountId ? { accountId } : undefined);
  });
  framePromise = p;
  p.catch(() => {
    if (framePromise === p) framePromise = null;
  });
  return p;
}

export type ConfirmResult = { ok: true } | { ok: false; message: string };

/**
 * The bank's 3D Secure check, for a charge that came back needing it. Works
 * whether or not a card field is on screen (a saved card can need it too).
 * Frame does not document the resolved value beyond an `error`, so this only
 * says whether the member got through; the server reads the charge itself.
 */
export async function confirm3ds(clientSecret: string, accountId?: string): Promise<ConfirmResult> {
  const failed = { ok: false as const, message: 'Your bank did not confirm the payment. Please try again or use another card.' };
  if (!PUBLISHABLE_KEY) return failed;
  try {
    const frame = await loadFrame(accountId);
    const res = (await frame.confirmCardPayment(clientSecret)) as { error?: { message?: string } } | null | undefined;
    return res?.error ? { ok: false, message: res.error.message || failed.message } : { ok: true };
  } catch {
    return failed;
  }
}

export interface FrameCardHandle {
  /** The encrypted card from the latest complete change, or null while incomplete. */
  getCard(): EncryptedCard | null;
  /** Show a server-side rejection under the field; null clears it. */
  setFieldError(field: CardField, message: string | null): void;
  confirm3ds(clientSecret: string): Promise<ConfirmResult>;
}

export function FrameCardField({
  ref,
  accountId,
  onCompleteChange,
}: {
  ref?: Ref<FrameCardHandle>;
  /** The member's processor account, when known: links fraud signals to their charges. */
  accountId?: string;
  /** Fires with true once every part of the card is filled in, false when it stops being. */
  onCompleteChange?: (complete: boolean) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const card = useRef<FrameCardElement | null>(null);
  const latest = useRef<EncryptedCard | null>(null);
  const onComplete = useRef(onCompleteChange);
  onComplete.current = onCompleteChange;
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  // Bumped by "Try again".
  const [attempt, setAttempt] = useState(0);

  useImperativeHandle(
    ref,
    () => ({
      getCard: () => latest.current,
      setFieldError: (field, message) => card.current?.setFieldError(field, message),
      confirm3ds: (clientSecret) => confirm3ds(clientSecret, accountId),
    }),
    [accountId],
  );

  useEffect(() => {
    if (!PUBLISHABLE_KEY) return;
    let cancelled = false;
    let mounted: FrameCardElement | null = null;
    setStatus('loading');

    loadFrame(accountId)
      .then(async (frame) => {
        const theme = frame.cardTheme
          ? { cardTheme: frame.cardTheme('clean') }
          : frame.themes
            ? { theme: frame.themes('clean') }
            : {};
        const el = await frame.createElement('card', theme);
        if (cancelled || !host.current) return;
        mounted = el;
        card.current = el;
        el.on('change', (p) => {
          const c = p.card;
          latest.current =
            p.isComplete && c?.number && c.cvc && c.expiry?.month && c.expiry.year
              ? { number: c.number, cvc: c.cvc, expMonth: c.expiry.month, expYear: c.expiry.year }
              : null;
          onComplete.current?.(latest.current !== null);
        });
        await el.mount(host.current);
        if (!cancelled) setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('failed');
      });

    return () => {
      cancelled = true;
      mounted?.unmount();
      card.current = null;
      latest.current = null;
      onComplete.current?.(false);
    };
  }, [accountId, attempt]);

  if (!PUBLISHABLE_KEY) {
    return (
      <p role="alert" className="rounded-inner bg-red-50 px-4 py-3 text-[15px] leading-relaxed text-red-800 ring-1 ring-red-600/15">
        {process.env.NODE_ENV === 'development'
          ? 'Card payments are not configured: set NEXT_PUBLIC_FRAME_PUBLISHABLE_KEY.'
          : 'Card entry is unavailable right now.'}
      </p>
    );
  }

  return (
    <div>
      {status === 'failed' && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-inner bg-red-50 px-4 py-3 text-[15px] leading-relaxed text-red-800 ring-1 ring-red-600/15">
          <span>The secure card form did not load. Check your connection and try again.</span>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="min-h-[44px] rounded-full bg-white px-4 text-[14px] font-semibold text-ink ring-1 ring-ink/10 hover:bg-milk"
          >
            Try again
          </button>
        </div>
      )}
      <div className={status === 'failed' ? 'hidden' : 'relative min-h-[52px] rounded-inner bg-white p-3 ring-1 ring-ink/10'}>
        {/* Frame.js owns this node's children, so React renders none into it. */}
        <div ref={host} />
        {status === 'loading' && (
          <div role="status" className="absolute inset-0 flex items-center gap-3 rounded-inner bg-white px-4 text-[14px] text-ink/65">
            <span aria-hidden className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
            Loading secure card form…
          </div>
        )}
      </div>
    </div>
  );
}
