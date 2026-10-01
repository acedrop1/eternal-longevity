'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useCart, type Cadence } from './CartProvider';
import { cn } from '@/lib/utils';
import { shippingLabelFor, shippingPriceFor } from '@/lib/shipping';

/**
 * Slide-in cart drawer: a white panel docked to the right edge, rounded on
 * its inner edge, with each line item on a soft milk row.
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

  const shipping = resolvedItems.reduce((s, it) => s + shippingPriceFor(it.product), 0);

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
          'fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm transition-opacity duration-300',
          drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-label="Your cart"
        aria-modal="true"
        className={cn(
          'fixed inset-y-0 right-0 z-[65] flex w-[calc(100%-16px)] max-w-md flex-col overflow-hidden rounded-l-shell bg-white text-ink shadow-[0_24px_60px_-20px_rgba(17,17,17,0.45)]',
          'transition-transform duration-500 ease-out-expo will-change-transform motion-reduce:transition-none',
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4 md:px-6">
          <div>
            <h2 className="text-[26px] font-semibold leading-none tracking-[-0.04em] text-ink">Your cart</h2>
            <p className="mt-1.5 text-[13px] font-medium text-ink/55">
              {itemCount === 0
                ? 'Empty'
                : `${itemCount} item${itemCount === 1 ? '' : 's'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close cart"
            className="grid h-11 w-11 place-items-center rounded-full bg-milk text-ink/70 transition-colors hover:bg-milk-deep hover:text-ink"
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
            <ul className="space-y-2 px-3 py-3 md:px-4">
              {resolvedItems.map((it) => (
                <li key={`${it.productId}-${it.cadence}`} className="rounded-inner bg-milk p-3">
                  <div className="flex gap-4">
                    <div
                      className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-thumb bg-white"
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
                            className="block truncate text-[15px] font-semibold tracking-[-0.01em] text-ink decoration-ink/30 underline-offset-[3px] hover:underline"
                          >
                            {it.product.name}
                          </Link>
                          <p className="mt-0.5 text-[12px] font-medium text-ink/55">
                            {it.cadenceLabel} billing
                          </p>
                          <p className="mt-1 text-[13px] tabular-nums text-ink-soft">
                            ${it.perMonth}/mo · ${it.total}/cycle
                          </p>
                          <p className="mt-0.5 text-[12px] tabular-nums text-ink/55">
                            {shippingLabelFor(it.product)} ${shippingPriceFor(it.product)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-[15px] font-semibold text-ink tabular-nums">
                            ${it.total * it.quantity}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              removeItem(it.productId, it.cadence as Cadence)
                            }
                            className="mt-1 text-[12px] font-medium text-ink/55 underline decoration-ink/30 underline-offset-[3px] transition-colors hover:text-red-700 hover:decoration-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Qty stepper */}
                      <div className="mt-3 inline-flex items-center self-start rounded-full bg-white ring-1 ring-ink/10">
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
                          className="grid h-9 w-9 place-items-center rounded-full text-base text-ink/70 transition-colors hover:text-ink"
                        >
                          −
                        </button>
                        <span className="min-w-7 text-center text-[14px] font-semibold tabular-nums text-ink">
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
                          className="grid h-9 w-9 place-items-center rounded-full text-base text-ink/70 transition-colors hover:text-ink"
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
          <div className="space-y-4 border-t border-ink/10 px-5 pb-5 pt-5 md:px-6">
            {/* Trust chip */}
            <div className="flex items-center gap-2 text-[12px] font-medium text-ink/60">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-butter">
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
              <span className="text-ink">Prescription required</span>
              <span>· 503A compounded</span>
            </div>

            <div className="space-y-1 text-[15px]">
              <Row label="Subtotal" value={`$${subtotal}`} />
              {/* One shipment per item; prescriptions carry no sales tax. */}
              <Row label="Shipping" value={`$${shipping}`} />
              <Row label="Total" value={`$${subtotal + shipping}`} />
            </div>

            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="block w-full rounded-full bg-butter px-5 py-3.5 text-center text-[15px] font-semibold text-ink transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-butter-deep"
            >
              Continue to checkout →
            </Link>
            <button
              type="button"
              onClick={closeDrawer}
              className="block w-full rounded-full bg-milk px-5 py-3.5 text-center text-[14px] font-semibold text-ink transition-colors hover:bg-milk-deep"
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
        className="text-ink-soft"
        dangerouslySetInnerHTML={{ __html: label }}
      />
      <span
        className={cn(
          muted ? 'text-ink/55' : 'font-semibold text-ink',
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
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-inner bg-milk text-ink/50">
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
      <h3 className="mb-2 text-[24px] font-semibold tracking-[-0.03em] text-ink">Your cart is empty</h3>
      <p className="mb-6 max-w-xs text-[15px] leading-relaxed text-ink-soft">
        Browse our treatments.
      </p>
      <Link
        href="/portal/shop"
        onClick={onClose}
        className="rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-ink/85"
      >
        Browse the shop
      </Link>
    </div>
  );
}
