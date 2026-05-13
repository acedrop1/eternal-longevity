import { CartProvider } from '@/components/cart/CartProvider';
import { OrdersProvider } from '@/components/orders/OrdersProvider';
import { MemberProfileProvider } from '@/components/profile/MemberProfileProvider';

/**
 * /checkout layout mirrors /portal's providers so cart, orders, and saved
 * profile all carry across (via localStorage). After successful pay we
 * call OrdersProvider.placeOrder() to create the pending-admin order, and
 * MemberProfileProvider to save any new address/card the member picked.
 */
export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrdersProvider>
      <MemberProfileProvider>
        <CartProvider>{children}</CartProvider>
      </MemberProfileProvider>
    </OrdersProvider>
  );
}
