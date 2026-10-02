'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Ask {
  title: string;
  body?: string;
  /** Default "Confirm". */
  confirmLabel?: string;
  /** Default "Cancel". Omit both labels' pair with `alert: true` for a single OK. */
  cancelLabel?: string;
  /** Red confirm button, for deletes, refunds and suspensions. */
  danger?: boolean;
  /** A notice with one button instead of a yes/no question. */
  alert?: boolean;
}

/**
 * The site's own confirm and notice dialog, in place of the browser's
 * window.confirm / window.alert. Native <dialog>: focus trap, Escape and the
 * backdrop come free. Render `dialog` once in the component, then
 * `if (!(await confirm({ title: 'Delete X?' }))) return;`.
 */
export function useConfirm(): [(ask: Ask) => Promise<boolean>, ReactNode] {
  const ref = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);

  const confirm = useCallback((next: Ask) => {
    setAsk(next);
    requestAnimationFrame(() => ref.current?.showModal());
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const done = (ok: boolean) => {
    ref.current?.close();
    resolver.current?.(ok);
    resolver.current = null;
  };

  const dialog = (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={() => done(false)}
      onClick={(e) => e.target === e.currentTarget && done(false)}
      className="w-[calc(100%-32px)] max-w-sm rounded-shell bg-white p-6 text-ink shadow-[0_24px_60px_-24px_rgba(17,17,17,0.45)] backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      {ask && (
        <>
          <h2 id="confirm-title" className="text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] [text-wrap:balance]">
            {ask.title}
          </h2>
          {ask.body && <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{ask.body}</p>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
            {!ask.alert && (
              <button
                type="button"
                // A destructive question starts on the safe answer, so Enter does not refund or delete.
                autoFocus={ask.danger}
                onClick={() => done(false)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-milk px-5 py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-milk-deep sm:flex-1"
              >
                {ask.cancelLabel ?? 'Cancel'}
              </button>
            )}
            <button
              type="button"
              autoFocus={!ask.danger || ask.alert}
              onClick={() => done(true)}
              className={cn(
                'inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-3 text-[14px] font-semibold transition-colors sm:flex-1',
                ask.danger ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-butter text-ink hover:bg-butter-deep',
              )}
            >
              {ask.confirmLabel ?? (ask.alert ? 'OK' : 'Confirm')}
            </button>
          </div>
        </>
      )}
    </dialog>
  );

  return [confirm, dialog];
}
