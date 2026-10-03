import type { BoardRow } from '@/lib/fulfillment-core';
import type { Order, OrderStatus } from '@/lib/orders';
import type { AdminUserRow } from '@/components/admin/AdminUsers';
import type { ReadyRxView } from '@/components/admin/AdminFulfillment';
import type { BillingCustomer, BillingSummary } from '@/components/admin/AdminBilling';
import type { PromoCode } from '@/lib/promo-db';
import type { AuditEntry } from '@/lib/prescriber';

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
  // Approved, then the charge was refused: "Payment failed".
  order(1051, 'signed', 'Grace Lin', 'Glutathione', 179, 1, {
    updates: [{ id: 's7', at: ago(1), author: 'System', role: 'system', note: 'Charge failed after approval — Card declined (insufficient funds)' }],
  }),
  order(1048, 'signed', 'Maya Chen', 'NAD+ injection', 249, 0, { paidAt: ago(0) }),
  order(1047, 'signed', 'Daniel Ortiz', 'Sermorelin', 299, 2, { paidAt: ago(2) }),
  order(1046, 'paid', 'Priya Nair', 'NAD+ injection', 249, 0, {
    paidAt: ago(0),
    lines: [{ productId: 'sample', productName: 'NAD+ injection', cadence: 'monthly', cadenceLabel: 'Monthly', quantity: 2, perCycle: 249, image: '', swatch: '' }],
    subtotal: 498,
    total: 498,
  }),
  order(1044, 'compounding', 'Sam Whitfield', 'Glutathione', 179, 1, {
    paidAt: ago(1),
    subtotal: 199,
    discount: 20,
    promoCode: 'WELCOME20',
    updates: [
      { id: 's2', at: ago(1), author: 'System', role: 'system', note: 'Paid — Card ending 4242' },
      { id: 's3', at: ago(0.9), author: 'Ops Admin', role: 'admin', note: 'Sent to the pharmacy — Your pharmacy is compounding your order.', statusChange: 'compounding' },
    ],
  }),
  order(1043, 'compounding', 'Lena Park', 'Sermorelin', 299, 4, { paidAt: ago(4) }),
  order(1041, 'shipped', 'Chris Bell', 'NAD+ injection', 249, 2, {
    paidAt: ago(2),
    tracking: '771234567890',
    carrier: 'FedEx',
    updates: [
      { id: 's4', at: ago(2), author: 'Ops Admin', role: 'admin', note: 'Sent to the pharmacy', statusChange: 'compounding' },
      { id: 's5', at: ago(1), author: 'Ops Admin', role: 'admin', note: 'Shipped — FedEx · 771234567890', statusChange: 'shipped' },
    ],
  }),
  order(1039, 'delivered', 'Ava Romero', 'Glutathione', 179, 6, {
    paidAt: ago(6),
    tracking: '1Z999AA10123456784',
    carrier: 'UPS',
    updates: [{ id: 's6', at: ago(1), author: 'Ops Admin', role: 'admin', note: 'Delivered', statusChange: 'delivered' }],
  }),
];

/** The prescription behind each sample order, for the order page. */
export const SAMPLE_RX: Record<string, { protocol: string; directions: string | null }> = {
  '1048': { protocol: 'NAD+ protocol', directions: 'Inject 0.5 mL subcutaneously twice weekly.' },
  '1047': { protocol: 'Sermorelin protocol', directions: 'Inject 0.3 mL subcutaneously nightly, 5 nights a week.' },
  '1046': { protocol: 'NAD+ protocol', directions: 'Inject 0.5 mL subcutaneously twice weekly.' },
  '1044': { protocol: 'Glutathione protocol', directions: null },
  '1043': { protocol: 'Sermorelin protocol', directions: 'Inject 0.3 mL subcutaneously nightly.' },
  '1041': { protocol: 'NAD+ protocol', directions: 'Inject 0.5 mL subcutaneously twice weekly.' },
  '1039': { protocol: 'Glutathione protocol', directions: 'Inject 1 mL intramuscularly weekly.' },
};

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

/* Billing (admin/billing). */

export const SAMPLE_BILLING_CUSTOMERS: BillingCustomer[] = SAMPLE_USERS.filter((u) => u.role === 'member').map((u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
}));

const paidOrders = SAMPLE_ORDERS.filter((o) => o.paidAt);

export const SAMPLE_BILLING_SUMMARY: BillingSummary = {
  activeSubscriptions: 4,
  cycleRevenueCents: 102_600,
  paidOrders: paidOrders.length,
  lifetimeRevenueCents: paidOrders.reduce((sum, o) => sum + o.total * 100, 0),
  recent: [...SAMPLE_ORDERS]
    .sort((a, b) => b.placedAt - a.placedAt)
    .slice(0, 6)
    .map((o) => ({
      label: o.id,
      amountCents: o.total * 100,
      when: new Date(o.placedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: o.status,
      paid: !!o.paidAt,
    })),
};

const promo = (id: number, code: string, kind: PromoCode['kind'], value: number, extra: Partial<PromoCode> = {}): PromoCode => ({
  id: `sample-promo-${id}`,
  code,
  kind,
  value,
  maxRedemptions: null,
  redeemedCount: 0,
  expiresAt: null,
  active: true,
  note: null,
  includesShipping: false,
  createdAt: iso(id),
  ...extra,
});

export const SAMPLE_PROMOS: PromoCode[] = [
  promo(1, 'LAUNCH20', 'percent', 20, { redeemedCount: 14, maxRedemptions: 100 }),
  promo(2, 'WELCOME25', 'fixed', 2500, { includesShipping: true }),
  promo(3, 'FRIENDS10', 'percent', 10, { redeemedCount: 3, active: false }),
  promo(4, 'SPRING15', 'percent', 15, { expiresAt: iso(10), redeemedCount: 5, maxRedemptions: 5 }),
];

/* Compliance (admin/compliance). */

export const SAMPLE_AUDIT: AuditEntry[] = [
  ['Ops Admin', 'admin', 'prescriber', 'license_expires', '2026-06-30', '2027-06-30', 1],
  ['Dr. Sample Prescriber', 'doctor', 'prescriber', 'npi', '—', '1234567890', 6],
  ['Ops Admin', 'admin', 'prescriber', 'credential', 'MD', 'DO', 12],
  ['Ops Admin', 'admin', 'session', 'new_device', '—', 'Chrome on macOS', 20],
].map(([actor, role, entity, field, from, to, d]) => ({
  at: iso(d as number),
  actor: actor as string,
  role: role as string,
  entity: entity as string,
  field: field as string,
  from: from as string,
  to: to as string,
}));
