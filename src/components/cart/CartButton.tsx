'use client';

import { useCart } from './CartProvider';

/**
 * Cart icon button for the portal header. Shows a badge with the item count
 * when the cart isn't empty. Opens the cart drawer on click.
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
      className="relative grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-foreground/75 hover:text-foreground hover:border-foreground/30 transition-colors"
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
          className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-black"
          aria-hidden
        >
          {itemCount}
        </span>
      )}
    </button>
  );
}
