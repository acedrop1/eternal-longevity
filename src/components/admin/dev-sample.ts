import type { BoardRow } from '@/lib/fulfillment-core';
import type { Order, OrderStatus } from '@/lib/orders';
import type { AdminUserRow } from '@/components/admin/AdminUsers';
import type { ReadyRxView } from '@/components/admin/AdminFulfillment';

/**
 * Sample rows so the admin index pages can be designed in local demo mode.
 * Pages import this only behind `process.env.NODE_ENV === 'development'` and
 * no Supabase, and label it "Sample data (dev only)". Never real people.
 */

const DAY = 86400_000;
const ago = (d: number) => Date.now() - d * DAY;
const iso = (d: number) => new Date(ago(d)).toISOString();

function board(
  n: number,
  status: BoardRow['status'],
  name: string,
  item: string,
  days: number,
  extra: Partial<BoardRow> = {},
): BoardRow {
  return {
    id: `sample-ful-${n}`,
    orderRef: `FUL-${n}`,
    status,
    patientName: name,
    patientDob: '1984-03-12',
    phone: '(201) 555-0142',
    address: '120 Sample St · Apt 4 · Hoboken, NJ · 07030',
    items: [item],
    cycleLabel: 'First cycle',
    prescriber: 'Dr. Sample Prescriber',
    npi: '1234567890',
    notes: null,
    trackingCarrier: null,
    trackingNumber: null,
    createdAt: iso(days),
    ageDays: days,
    orderNumber: String(n),
    pharmacy: null,
    ...extra,
  };
}

export const SAMPLE_BOARD: BoardRow[] = [
  board(1048, 'submitted', 'Maya Chen', 'NAD+ injection · Monthly', 0, {
    pharmacy: { status: 'MANUAL', orderId: null, error: 'No pharmacy SKU on this product.', reason: null },
  }),
  board(1047, 'submitted', 'Daniel Ortiz', 'Sermorelin · Quarterly', 2, {
    pharmacy: { status: 'ERROR', orderId: null, error: 'Pharmacy API timed out.', reason: null },
  }),
  board(1046, 'draft', 'Priya Nair', 'NAD+ injection ×2 · Monthly', 0, { cycleLabel: 'Refill 3' }),
  board(1044, 'accepted', 'Sam Whitfield', 'Glutathione · Monthly', 1, {
    pharmacy: { status: 'COMPOUNDING', orderId: '104233', error: null, reason: null },
  }),
  board(1043, 'accepted', 'Lena Park', 'Sermorelin · Monthly', 4, {
    pharmacy: { status: 'HOLD', orderId: '104219', error: null, reason: 'Pharmacist needs a clarified dose.' },
  }),
  board(1041, 'shipped', 'Chris Bell', 'NAD+ injection · Monthly', 2, {
    trackingCarrier: 'FedEx',
    trackingNumber: '771234567890',
    pharmacy: { status: 'IN_TRANSIT', orderId: '104201', error: null, reason: null },
  }),
  board(1039, 'delivered', 'Ava Romero', 'Glutathione · Quarterly', 6, {
    trackingCarrier: 'UPS',
    trackingNumber: '1Z999AA10123456784',
    cycleLabel: 'Refill 1',
    pharmacy: { status: 'DELIVERED', orderId: '104180', error: null, reason: null },
  }),
];

function order(n: number, status: OrderStatus, name: string, product: string, total: number, days: number, extra: Partial<Order> = {}): Order {
  return {
    id: String(n),
    userId: `sample-user-${n}`,
    memberName: name,
    memberEmail: `${name.split(' ')[0].toLowerCase()}@example.com`,
    state: 'NJ',
    lines: [
      {
        productId: 'sample',
        productName: product,
        cadence: 'monthly',
        cadenceLabel: 'Monthly',
        quantity: 1,
        perCycle: total,
        image: '',
        swatch: '',
      },
    ],
    subtotal: total,
    shippingCost: 0,
    tax: 0,
    total,
    shippingAddress: { fullName: name, line1: '120 Sample St', city: 'Hoboken', state: 'NJ', zip: '07030' },
    placedAt: ago(days),
    status,
    ...extra,
  };
}

export const SAMPLE_ORDERS: Order[] = [
  order(1049, 'assigned', 'Noah Kim', 'NAD+ injection', 249, 2),
  order(1050, 'assigned', 'Ella Brooks', 'Sermorelin', 299, 0.1, {
    updates: [{ id: 's1', at: ago(0.1), author: 'System', role: 'system', note: 'Charge failed: card declined' }],
  }),
  order(1048, 'signed', 'Maya Chen', 'NAD+ injection', 249, 0, { paidAt: ago(0) }),
  order(1047, 'signed', 'Daniel Ortiz', 'Sermorelin', 299, 2, { paidAt: ago(2) }),
  order(1044, 'compounding', 'Sam Whitfield', 'Glutathione', 179, 1, { paidAt: ago(1) }),
  order(1043, 'compounding', 'Lena Park', 'Sermorelin', 299, 4, { paidAt: ago(4) }),
  order(1041, 'shipped', 'Chris Bell', 'NAD+ injection', 249, 2, { paidAt: ago(2) }),
];

export const SAMPLE_READY: ReadyRxView[] = [
  { kind: 'prescription', id: 'sample-rx-1', patientName: 'Owen Hart', protocolName: 'NAD+ protocol' },
];

const joined = (d: number) =>
  new Date(ago(d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const SAMPLE_USERS: AdminUserRow[] = [
  ['Noah Kim', 'member', 'active', 2],
  ['Ella Brooks', 'member', 'active', 3],
  ['Maya Chen', 'member', 'active', 9],
  ['Daniel Ortiz', 'member', 'suspended', 21],
  ['Sam Whitfield', 'member', 'active', 30],
  ['Lena Park', 'member', 'deactivated', 64],
  ['Dr. Sample Prescriber', 'doctor', 'active', 120],
  ['Sample Pharmacy', 'pharmacy', 'active', 150],
  ['Ops Admin', 'admin', 'active', 200],
].map(([name, role, status, d], i) => ({
  id: `sample-user-${i}`,
  name: name as string,
  email: `${(name as string).split(' ').slice(-1)[0].toLowerCase()}@example.com`,
  role: role as AdminUserRow['role'],
  status: status as AdminUserRow['status'],
  joinedAt: joined(d as number),
}));
