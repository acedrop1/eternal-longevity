import { CartProvider } from '@/components/cart/CartProvider';
import { CartDrawer } from '@/components/cart/CartDrawer';

/**
 * Public storefront layout (/shop/*).
 *
 * Mounts the same CartProvider the portal and checkout use — the cart is
 * localStorage-backed, so a logged-out visitor can browse and add to cart,
 * and the cart survives straight through signup into checkout.
 */
export default function PublicShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
