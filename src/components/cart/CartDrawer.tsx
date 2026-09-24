'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useCart, type Cadence } from './CartProvider';
import { cn } from '@/lib/utils';

/**
 * Slide-in cart drawer: a white panel inset from the screen edges with
 * sharp corners, matching the mobile menu and product buy bar.
 * - Scrim covers the page, drawer panel slides in from the right
 * - Esc key closes it
 * - "Continue to checkout" routes to /checkout
 * - "Keep shopping" closes the drawer
 */
export function CartDrawer() {
  const {
    drawerOpen,
    resolvedItems,
    subtotal,
    itemCount,
    closeDrawer,
    setQuantity,
    removeItem,
  } = useCart();

  // Esc to close
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  return (
    <>
      {/* Scrim */}
      <div
        aria-hidden
        onClick={closeDrawer}
        className={cn(
          'fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-label="Your cart"
        aria-modal="true"
        className={cn(
          'fixed inset-y-3 right-3 z-[65] flex w-[calc(100%-24px)] max-w-md flex-col overflow-hidden rounded-[4px] bg-white text-black shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)] ring-1 ring-black/10',
          'transition-transform duration-500 ease-out-expo will-change-transform motion-reduce:transition-none',
          drawerOpen ? 'translate-x-0' : 'translate-x-[calc(100%+24px)]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/15 px-5 py-4">
          <div>
            <h2
              className="font-display font-normal"
              style={{ fontSize: '1.75rem', fontStretch: '75%', lineHeight: 1 }}
            >
              Your cart
            </h2>
            <p className="mt-1 font-mono text-[12px] text-black/55">
              {itemCount === 0
                ? 'Empty'
                : `${itemCount} item${itemCount === 1 ? '' : 's'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close cart"
            className="grid h-9 w-9 place-items-center rounded-[2px] text-black/70 transition-colors hover:bg-black/[0.05] hover:text-black"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body. Line items */}
        <div className="flex-1 overflow-y-auto">
          {resolvedItems.length === 0 ? (
            <EmptyState onClose={closeDrawer} />
          ) : (
            <ul className="divide-y divide-black/15 px-5">
              {resolvedItems.map((it) => (
                <li key={`${it.productId}-${it.cadence}`} className="py-5">
                  <div className="flex gap-4">
                    <div
                      className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-[2px] bg-neutral-200"
                      style={it.product.shot ? undefined : { background: it.product.swatch }}
                    >
                      <Image
                        src={it.product.image}
                        alt={it.product.name}
                        fill
                        sizes="80px"
                        className={it.product.shot ? 'object-cover' : 'object-cover opacity-50'}
                      />
                    </div>
                    <div className="flex flex-1 min-w-0 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/portal/shop/${it.product.id}`}
                            onClick={closeDrawer}
                            className="block truncate text-[15px] font-medium text-black underline-offset-[3px] hover:underline"
                          >
                            {it.product.name}
                          </Link>
                          <p className="mt-0.5 font-mono text-[12px] text-black/60">
                            {it.cadenceLabel} billing
                          </p>
                          <p className="mt-1 text-[13px] tabular-nums text-black/55">
                            ${it.perMonth}/mo · ${it.total}/cycle
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-[15px] font-medium text-black tabular-nums">
                            ${it.total * it.quantity}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              removeItem(it.productId, it.cadence as Cadence)
                            }
                            className="mt-1 font-mono text-[12px] text-black/55 underline decoration-black/30 underline-offset-[3px] transition-colors hover:text-red-700 hover:decoration-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Qty stepper */}
                      <div className="mt-3 inline-flex items-center self-start rounded-[2px] bg-white ring-1 ring-black/15">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() =>
                            setQuantity(
                              it.productId,
                              it.cadence as Cadence,
                              it.quantity - 1
                            )
                          }
                          className="grid h-9 w-9 place-items-center text-base text-black/70 transition-colors hover:text-black"
                        >
                          −
                        </button>
                        <span className="min-w-7 text-center font-mono text-[14px] tabular-nums text-black">
                          {it.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() =>
                            setQuantity(
                              it.productId,
                              it.cadence as Cadence,
                              it.quantity + 1
                            )
                          }
                          className="grid h-9 w-9 place-items-center text-base text-black/70 transition-colors hover:text-black"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer. Totals + CTAs */}
        {resolvedItems.length > 0 && (
          <div className="space-y-4 border-t border-black/15 px-5 pb-5 pt-5">
            {/* Trust chip */}
            <div className="flex items-center gap-2 font-mono text-[12px] text-black/60">
              <span className="grid h-5 w-5 place-items-center rounded-[2px] bg-black text-white">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="text-black">Prescription required</span>
              <span>· 503A compounded</span>
            </div>

            <div className="space-y-1 text-[15px]">
              <Row label="Subtotal" value={`$${subtotal}`} />
              <Row label="Shipping &amp; Tax" value="Calculated at checkout" muted />
            </div>

            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="block w-full rounded-full bg-black px-5 py-3.5 text-center font-mono text-[14px] text-white transition-colors hover:bg-black/85"
            >
              Continue to checkout →
            </Link>
            <button
              type="button"
              onClick={closeDrawer}
              className="block w-full rounded-full px-5 py-3.5 text-center font-mono text-[14px] text-black ring-1 ring-black/20 transition-colors hover:bg-black/[0.04]"
            >
              Keep shopping
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className="text-black/65"
        dangerouslySetInnerHTML={{ __html: label }}
      />
      <span
        className={cn(
          muted ? 'text-black/55' : 'font-medium text-black',
          'tabular-nums'
        )}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-[4px] bg-[#F2F2F0] text-black/50">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      </div>
      <h3
        className="mb-2 font-display font-normal"
        style={{ fontSize: '1.6rem', fontStretch: '75%', lineHeight: 1.05 }}
      >
        Your cart is empty
      </h3>
      <p className="mb-6 max-w-xs text-[15px] leading-relaxed text-black/60">
        Browse our peptide catalog and add anything that fits your protocol.
      </p>
      <Link
        href="/portal/shop"
        onClick={onClose}
        className="rounded-full bg-black px-5 py-3 font-mono text-[14px] text-white transition-colors hover:bg-black/85"
      >
        Browse the shop
      </Link>
    </div>
  );
}
