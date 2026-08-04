import { CartProvider } from '@/components/cart/CartProvider';

/**
 * Public storefront layout (/shop/*).
 *
 * Browse-only. Visitors can see products and pricing, but ordering runs
 * through the assessment — every CTA points at /start, and there is no cart
 * drawer here. CartProvider is still mounted because the shared PDP
 * components call useCart(); nothing on the public side ever adds to it.
 */
export default function PublicShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CartProvider>{children}</CartProvider>;
}
