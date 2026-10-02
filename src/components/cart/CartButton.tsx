'use client';

import Link from 'next/link';
import { useOptionalCart } from './CartProvider';

/**
 * Cart icon button for the portal header's frosted bar: ink icon on a white
 * glass circle, butter count badge. 44px tap target. Opens the cart drawer.
 */
export function CartButton({ className }: { className?: string } = {}) {
  const cart = useOptionalCart();
  const itemCount = cart?.itemCount ?? 0;
  const cls =
    className ??
    'relative grid h-11 w-11 place-items-center rounded-full bg-white/70 text-ink ring-1 ring-ink/5 transition-colors hover:bg-white';

  // Pages without a cart (marketing pages): go straight to checkout, which reads the saved cart.
  if (!cart) {
    return (
      <Link href="/checkout" aria-label="Your cart" className={cls}>
        <CartIcon />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={cart.openDrawer}
      aria-label={
        itemCount === 0
          ? 'Open cart'
          : `Open cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`
      }
      className={cls}
    >
      <CartIcon />
      {itemCount > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-butter px-1 text-[10px] font-semibold text-ink ring-1 ring-butter-deep"
          aria-hidden
        >
          {itemCount}
        </span>
      )}
    </button>
  );
}

function CartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
