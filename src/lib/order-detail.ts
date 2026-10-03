import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Read-only: what the staff order page shows that `Order` and the board row
 * do not carry. The discount, and the prescription the pharmacy fills,
 * found the way auto-pharmacy finds it (the shipment's prescription first,
 * then the one written for the order). Callers check the role first.
 */
export interface OrderExtras {
  promoCode: string | null;
  /** Dollars, like Order. */
  discount: number;
  prescription: { protocol: string; directions: string | null } | null;
}

export async function loadOrderExtras(orderNumber: string): Promise<OrderExtras | null> {
  const db = createSupabaseAdminClient();
  const [{ data: order }, { data: ful }] = await Promise.all([
    db.from('orders').select('id, promo_code, discount_cents').eq('order_number', orderNumber).maybeSingle(),
    db.from('fulfillment_orders').select('prescription_id').eq('order_ref', `FUL-${orderNumber}`).maybeSingle(),
  ]);
  if (!order) return null;
  const rxQuery = db.from('prescriptions').select('protocol_name, directions');
  const { data: rx } = ful?.prescription_id
    ? await rxQuery.eq('id', ful.prescription_id).maybeSingle()
    : await rxQuery.eq('order_id', order.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return {
    promoCode: order.promo_code,
    discount: Math.round(Number(order.discount_cents ?? 0)) / 100,
    prescription: rx ? { protocol: rx.protocol_name, directions: rx.directions } : null,
  };
}
