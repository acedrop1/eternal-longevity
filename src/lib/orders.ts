/**
 * Order state machine + shared order types.
 * Demo flow:
 *   member submits order → pending-admin
 *   admin approves → assigned (awaiting physician sign-off)
 *   admin denies → denied-admin (terminal)
 *   physician signs Rx → signed (first cycle billed at sign-off)
 *     → compounding → shipped → delivered
 *   physician declines → declined-clinical (terminal)
 *
 * Payment: nothing is charged until a physician signs. Sign-off is the moment
 * billing starts — the saved card is charged for the first cycle.
 */

export type OrderStatus =
  | 'pending-admin'
  | 'denied-admin'
  | 'assigned'
  | 'signed'
  | 'declined-clinical'
  | 'compounding'
  | 'shipped'
  | 'delivered';

export interface OrderLine {
  productId: string;
  productName: string;
  cadence: 'monthly' | 'quarterly' | 'annual' | 'once';
  cadenceLabel: string;
  quantity: number;
  perCycle: number;
  image: string;
  swatch: string;
}

/** Author shown on each timeline entry. */
export type UpdateAuthorRole = 'admin' | 'physician' | 'pharmacy' | 'system';

export interface OrderUpdate {
  id: string;
  at: number;
  author: string;       // display name e.g. "Dr. M. Reyes" or "Admin"
  role: UpdateAuthorRole;
  note: string;
  /** Optional status change recorded by this update */
  statusChange?: OrderStatus;
}

export interface Order {
  id: string;
  memberName: string;
  memberEmail: string;
  state: string;
  lines: OrderLine[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  shippingAddress: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
  cardLast4?: string;
  placedAt: number;
  status: OrderStatus;
  assignedToPhysicianId?: string;
  adminNote?: string;
  physicianNote?: string;
  /** Set when the physician signs — the moment billing starts. */
  paidAt?: number;
  /** Amount charged for the first cycle at sign-off (USD). */
  firstChargeAmount?: number;
  tracking?: string;
  carrier?: string;
  /** Chronological log of human-readable updates on the order. */
  updates?: OrderUpdate[];
}

/**
 * Display name for an assigned physician.
 *
 * ponytail: orders carry only the prescriber's id; the name lives on the
 * profiles table. Rather than render a raw UUID at the member, we render
 * nothing until the order query joins the name through.
 */
export function getPhysicianName(_id?: string): string | null {
  return null;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  'pending-admin': 'AWAITING ADMIN REVIEW',
  'denied-admin': 'DENIED BY ADMIN',
  assigned: 'PROTOCOL REVIEW',
  signed: 'ORDER CONFIRMED',
  'declined-clinical': 'DECLINED',
  compounding: 'COMPOUNDING',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
};

/** No seeded orders — real orders come from Supabase. */
export const SEED_ORDERS: Order[] = [];
