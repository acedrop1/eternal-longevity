import { CartProvider } from '@/components/cart/CartProvider';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { OrdersProvider } from '@/components/orders/OrdersProvider';
import { MemberProfileProvider } from '@/components/profile/MemberProfileProvider';

/**
 * Shared layout for everything under /portal/*.
 * Wraps in:
 *   - OrdersProvider: shared order list with the workflow state machine
 *     (member places → admin approves/assigns → doctor signs)
 *   - MemberProfileProvider: saved addresses + cards so the member doesn't
 *     re-type at each checkout
 *   - CartProvider: cart state + global drawer
 *
 * Checkout lives outside this layout but mounts the same providers so the
 * state syncs via localStorage.
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrdersProvider>
      <MemberProfileProvider>
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </MemberProfileProvider>
    </OrdersProvider>
  );
}
