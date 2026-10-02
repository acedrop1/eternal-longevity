import { CartProvider } from '@/components/cart/CartProvider';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { loadCart } from '@/lib/profile-db';

/**
 * Public storefront layout (/shop/*).
 *
 * Visitors browse and start the assessment. A signed-in member who is
 * assessed for a product subscribes right here, so the cart loads exactly as
 * the portal's does: the member's saved server cart in live mode (the cart
 * /checkout reads), localStorage in demo. Signed out, loadCart returns an
 * empty unsupported cart and nothing is ever added.
 */
export default async function PublicShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cart = await loadCart();
  return (
    <CartProvider initialItems={cart.items} live={cart.supported}>
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
