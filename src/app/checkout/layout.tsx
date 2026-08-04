import { CartProvider } from '@/components/cart/CartProvider';
import { OrdersProvider } from '@/components/orders/OrdersProvider';
import { MemberProfileProvider } from '@/components/profile/MemberProfileProvider';
import { listOrders, ordersDbConfigured } from '@/lib/orders-db';
import { loadCart, loadProfile, profileDbConfigured } from '@/lib/profile-db';

/**
 * /checkout mirrors /portal's providers so cart and saved profile carry
 * across. On successful pay, CheckoutFlow calls OrdersProvider.placeOrder(),
 * which writes the pending-admin order to Supabase in live mode (and to
 * localStorage otherwise).
 */
export default async function CheckoutLayout({
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
        <CartProvider initialItems={cart.items} live={cart.supported}>{children}</CartProvider>
      </MemberProfileProvider>
    </OrdersProvider>
  );
}
