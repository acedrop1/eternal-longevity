'use client';

import { useCart } from './CartProvider';

/**
 * Cart icon button for the portal header, which is black: white icon on a
 * faint white ring, gold count badge. 44px tap target. Opens the cart drawer.
 */
export function CartButton() {
  const { itemCount, openDrawer } = useCart();

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={
        itemCount === 0
          ? 'Open cart'
          : `Open cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`
      }
      className="relative grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white/85 ring-1 ring-white/25 transition-colors hover:bg-white/15 hover:text-white"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {itemCount > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[10px] text-black"
          aria-hidden
        >
          {itemCount}
        </span>
      )}
    </button>
  );
}
