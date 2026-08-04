import { CartProvider } from '@/components/cart/CartProvider';
import { OrdersProvider } from '@/components/orders/OrdersProvider';
import { MemberProfileProvider } from '@/components/profile/MemberProfileProvider';
import { listOrders, ordersDbConfigured } from '@/lib/orders-db';

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
  const orders = live ? await listOrders() : [];

  return (
    <OrdersProvider initialOrders={orders} live={live}>
      <MemberProfileProvider>
        <CartProvider>{children}</CartProvider>
      </MemberProfileProvider>
    </OrdersProvider>
  );
}
