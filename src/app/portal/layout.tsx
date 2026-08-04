import { CartProvider } from '@/components/cart/CartProvider';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { OrdersProvider } from '@/components/orders/OrdersProvider';
import { MemberProfileProvider } from '@/components/profile/MemberProfileProvider';
import { listOrders, ordersDbConfigured } from '@/lib/orders-db';
import { loadCart, loadProfile, profileDbConfigured } from '@/lib/profile-db';

/**
 * Shared layout for everything under /portal/*.
 *
 * Orders are fetched here on the server so every role — member, doctor,
 * admin, pharmacy — reads the same Supabase rows. RLS narrows the result:
 * members see only their own orders, clinical staff see all of them. When
 * Supabase is not configured the provider falls back to localStorage demo
 * data, so the preview build still works.
 *
 * Cart and profile are Supabase-backed too, so a member keeps their cart,
 * addresses and saved cards across devices.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const live = await ordersDbConfigured();
  const profileLive = await profileDbConfigured();
  const [orders, profile, cart] = await Promise.all([
    live ? listOrders() : Promise.resolve([]),
    profileLive ? loadProfile() : Promise.resolve(null),
    profileLive ? loadCart() : Promise.resolve({ items: [], supported: false }),
  ]);

  return (
    <OrdersProvider initialOrders={orders} live={live}>
      <MemberProfileProvider
        initialProfile={profile ?? undefined}
        live={profileLive}
      >
        <CartProvider initialItems={cart.items} live={cart.supported}>
          {children}
          <CartDrawer />
        </CartProvider>
      </MemberProfileProvider>
    </OrdersProvider>
  );
}
