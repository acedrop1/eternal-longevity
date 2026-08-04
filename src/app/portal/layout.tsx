import { CartProvider } from '@/components/cart/CartProvider';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { OrdersProvider } from '@/components/orders/OrdersProvider';
import { MemberProfileProvider } from '@/components/profile/MemberProfileProvider';
import { listOrders, ordersDbConfigured } from '@/lib/orders-db';

/**
 * Shared layout for everything under /portal/*.
 *
 * Orders are fetched here on the server so every role — member, doctor,
 * admin, pharmacy — reads the same Supabase rows. RLS narrows the result:
 * members see only their own orders, clinical staff see all of them. When
 * Supabase is not configured the provider falls back to localStorage demo
 * data, so the preview build still works.
 *
 * Cart and profile stay client-side; both are per-browser by nature.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const live = await ordersDbConfigured();
  const orders = live ? await listOrders() : [];

  return (
    <OrdersProvider initialOrders={orders} live={live}>
      <MemberProfileProvider>
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </MemberProfileProvider>
    </OrdersProvider>
  );
}
