'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useCart, type Cadence } from './CartProvider';
import { cn } from '@/lib/utils';

/**
 * Slide-in cart drawer. Whoop / Shopify pattern.
 * - Scrim covers the page on the left, drawer panel on the right
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
          'fixed right-0 top-0 bottom-0 z-[65] flex w-full max-w-md flex-col bg-background text-foreground shadow-2xl',
          'transition-transform duration-500 ease-out-expo will-change-transform',
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div>
            <h2 className="text-sm font-semibold tracking-widest text-foreground">
              YOUR CART
            </h2>
            <p className="text-[11px] tracking-wider text-foreground/55 mt-0.5">
              {itemCount === 0
                ? 'Empty'
                : `${itemCount} item${itemCount === 1 ? '' : 's'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close cart"
            className="grid h-9 w-9 place-items-center rounded-full text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors"
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
            <ul className="divide-y divide-line px-6">
              {resolvedItems.map((it) => (
                <li key={`${it.productId}-${it.cadence}`} className="py-5">
                  <div className="flex gap-4">
                    <div
                      className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-line"
                      style={{ background: it.product.swatch }}
                    >
                      <Image
                        src={it.product.image}
                        alt={it.product.name}
                        fill
                        sizes="80px"
                        className="object-cover opacity-50"
                      />
                    </div>
                    <div className="flex flex-1 min-w-0 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/portal/shop/${it.product.id}`}
                            onClick={closeDrawer}
                            className="block truncate text-sm font-semibold text-foreground hover:text-accent transition-colors"
                          >
                            {it.product.name}
                          </Link>
                          <p className="mt-0.5 text-[11px] tracking-wider text-foreground/55">
                            {it.cadenceLabel.toUpperCase()} BILLING
                          </p>
                          <p className="mt-1 text-xs text-foreground/55">
                            ${it.perMonth}/mo · ${it.total}/cycle
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-foreground tabular-nums">
                            ${it.total * it.quantity}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              removeItem(it.productId, it.cadence as Cadence)
                            }
                            className="mt-1 text-[10px] tracking-widest text-foreground/45 hover:text-red-300 transition-colors"
                          >
                            REMOVE
                          </button>
                        </div>
                      </div>

                      {/* Qty stepper */}
                      <div className="mt-3 inline-flex items-center self-start rounded-full border border-line bg-background">
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
                          className="grid h-9 w-9 place-items-center text-base text-foreground/70 hover:text-foreground transition-colors"
                        >
                          −
                        </button>
                        <span className="min-w-7 text-center text-sm tabular-nums text-foreground/85">
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
                          className="grid h-9 w-9 place-items-center text-base text-foreground/70 hover:text-foreground transition-colors"
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
          <div className="border-t border-line px-6 pt-5 pb-safe space-y-4">
            {/* Trust chip */}
            <div className="flex items-center gap-2 text-[11px] tracking-wider text-foreground/65">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-accent/10 text-accent">
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
              <span className="font-semibold text-foreground/85">Physician-reviewed</span>
              <span>· 503A compounded</span>
            </div>

            <div className="space-y-1 text-sm">
              <Row label="Subtotal" value={`$${subtotal}`} />
              <Row label="Shipping &amp; Tax" value="Calculated at checkout" muted />
            </div>

            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="block w-full rounded-full bg-accent text-black font-semibold py-3.5 text-base text-center hover:bg-accent-soft transition-colors"
            >
              Continue to checkout →
            </Link>
            <button
              type="button"
              onClick={closeDrawer}
              className="block w-full rounded-full border border-line bg-surface text-foreground/85 font-semibold py-3.5 text-base text-center hover:border-foreground/30 transition-colors"
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
        className="text-foreground/65"
        dangerouslySetInnerHTML={{ __html: label }}
      />
      <span
        className={cn(
          muted ? 'text-foreground/55' : 'text-foreground font-medium',
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
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-full bg-surface text-foreground/45">
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
      <h3 className="mb-2 text-base font-semibold text-foreground">
        Your cart is empty
      </h3>
      <p className="mb-6 text-sm text-foreground/55 max-w-xs">
        Browse our peptide catalog and add anything that fits your protocol.
      </p>
      <Link
        href="/portal/shop"
        onClick={onClose}
        className="rounded-full bg-accent text-black font-semibold px-5 py-2.5 text-sm hover:bg-accent-soft transition-colors"
      >
        Browse the shop
      </Link>
    </div>
  );
}
