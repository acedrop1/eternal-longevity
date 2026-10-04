/**
 * DEV-ONLY SAMPLE DATA for the member portal.
 *
 * Shown only when running `next dev` WITHOUT Supabase (the demo login,
 * demo@eternal.test). Never in production, never when a database is
 * connected: `memberSamples` is false there and nothing below is read.
 * It exists so every order state, two plans and both message threads can be
 * seen and clicked locally. Safe to delete along with its call sites.
 */

import type { Order, OrderStatus, OrderUpdate } from '@/lib/orders';
import type { PortalMessage } from '@/lib/messages-db';
import type { Subscription } from '@/components/portal/SubscriptionsManager';
import { supabaseConfigured } from '@/lib/env';
import { getAnyShopProduct } from '@/lib/shopProducts';

export const memberSamples = process.env.NODE_ENV === 'development' && !supabaseConfigured;

const DAY = 86_400_000;
const EMAIL = 'demo@eternal.test';
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

function sample(
  id: string,
  productId: string,
  status: OrderStatus,
  daysAgo: number,
  cadenceLabel: string,
  extra: Partial<Order> & { log?: [hoursAgo: number, author: string, note: string, statusChange?: OrderStatus][] } = {},
): Order {
  const p = getAnyShopProduct(productId);
  const price = p?.pricing.monthly ?? 99;
  const { log = [], ...rest } = extra;
  const placedAt = Date.now() - daysAgo * DAY;
  const updates: OrderUpdate[] = log.map(([h, author, note, statusChange], i) => ({
    id: `${id}-u${i}`,
    at: Date.now() - h * 3_600_000,
    author,
    role: author.startsWith('Dr') ? 'physician' : author === 'Pharmacy' ? 'pharmacy' : 'system',
    note,
    statusChange,
  }));
  return {
    id,
    memberName: 'Alex Demo',
    memberEmail: EMAIL,
    state: 'NJ',
    lines: [
      {
        productId,
        productName: p?.name ?? productId,
        cadence: cadenceLabel === 'Quarterly' ? 'quarterly' : 'monthly',
        cadenceLabel,
        quantity: 1,
        perCycle: price,
        image: p?.image ?? '/images/9.jpg',
        swatch: p?.swatch ?? '#1a1a1a',
      },
    ],
    subtotal: price,
    shippingCost: 30,
    tax: 0,
    total: price + 30,
    shippingAddress: { fullName: 'Alex Demo', line1: '1 Sample St', city: 'Hoboken', state: 'NJ', zip: '07030' },
    placedAt,
    status,
    updates,
    ...rest,
  };
}

/** One order in each state a member can see. */
export const SAMPLE_ORDERS: Order[] = [
  sample('EL-1009', 'sildenafil', 'assigned', 1, 'Monthly', {
    log: [[20, 'System', 'Sent to prescriber', 'assigned']],
  }),
  sample('EL-1008', 'tretinoin', 'signed', 2, 'Monthly', {
    log: [
      [40, 'System', 'Sent to prescriber', 'assigned'],
      [6, 'Dr. Elder', 'Approved. Apply a pea-sized amount at night.', 'signed'],
    ],
  }),
  sample('EL-1007', 'nad-nasal', 'compounding', 4, 'Monthly', {
    paidAt: Date.now() - 3 * DAY,
    log: [
      [90, 'Dr. Elder', 'Approved.', 'signed'],
      [70, 'System', 'Payment received.', 'paid'],
      [30, 'Pharmacy', 'Your order is being compounded.', 'compounding'],
    ],
  }),
  sample('EL-1006', 'enclomiphene', 'shipped', 6, 'Monthly', {
    paidAt: Date.now() - 5 * DAY,
    carrier: 'UPS',
    tracking: '1Z999AA10123456784',
    log: [
      [130, 'Dr. Elder', 'Approved.', 'signed'],
      [110, 'System', 'Payment received.', 'paid'],
      [60, 'Pharmacy', 'Being compounded.', 'compounding'],
      [20, 'Pharmacy', 'Shipped with UPS.', 'shipped'],
    ],
  }),
  sample('EL-1005', 'finasteride', 'delivered', 40, 'Quarterly', {
    paidAt: Date.now() - 39 * DAY,
    carrier: 'UPS',
    tracking: '1Z999AA10123456785',
    log: [
      [940, 'Dr. Elder', 'Approved.', 'signed'],
      [900, 'Pharmacy', 'Shipped with UPS.', 'shipped'],
      [860, 'Pharmacy', 'Delivered.', 'delivered'],
    ],
  }),
  sample('EL-1004', 'oral-minoxidil', 'delivered', 60, 'Monthly', {
    paidAt: Date.now() - 59 * DAY,
    log: [[1400, 'Pharmacy', 'Delivered.', 'delivered']],
  }),
  sample('EL-1003', 'methylene-blue', 'declined-clinical', 12, 'Monthly', {
    physicianNote: 'Not a fit alongside your current medication.',
    log: [[280, 'Dr. Elder', 'Not approved: not a fit alongside your current medication.', 'declined-clinical']],
  }),
  sample('EL-1002', 'hrt-cream', 'refunded', 30, 'Monthly', {
    log: [[700, 'System', 'Refunded in full.', 'refunded']],
  }),
  sample('EL-1001', 'spironolactone', 'denied-admin', 45, 'Monthly', {
    adminNote: 'We can’t ship this treatment to your state yet.',
  }),
];

/** Products on a plan, for "Manage plan" on the orders page. */
export const SAMPLE_PLAN_PRODUCTS = ['finasteride', 'oral-minoxidil'];

function plan(id: string, productId: string, status: Subscription['status'], cadenceLabel: string, perCycle: number, nextIso: string | null): Subscription {
  const p = getAnyShopProduct(productId);
  return {
    id,
    productId,
    productName: p?.name ?? productId,
    cycleLabel: p?.cycleLength ?? '',
    cadenceLabel,
    perMonth: perCycle,
    nextBillingIso: nextIso,
    nextBillingDate: nextIso ?? '—',
    status,
    image: p?.image ?? '/images/9.jpg',
    swatch: p?.swatch ?? '#1a1a1a',
    tiers: p
      ? [
          { key: 'monthly', label: 'Monthly', perCycle: p.pricing.monthly + 30 },
          { key: 'quarterly', label: 'Quarterly', perCycle: p.pricing.quarterly + 30 },
          ...(p.pricing.sixMonth ? [{ key: 'sixMonth' as const, label: '6-month', perCycle: p.pricing.sixMonth + 30 }] : []),
        ]
      : [],
  };
}

export const SAMPLE_PLANS: Subscription[] = [
  plan('sub-sample-1', 'finasteride', 'active', 'Quarterly', 285, iso(27)),
  plan('sub-sample-2', 'oral-minoxidil', 'paused', 'Monthly', 115, iso(12)),
];

const msg = (id: string, fromMember: boolean, hoursAgo: number, body: string): PortalMessage => ({
  id,
  senderRole: fromMember ? 'member' : 'staff',
  body,
  createdAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
});

export const SAMPLE_THREADS: { support: PortalMessage[]; doctor: PortalMessage[] } = {
  doctor: [
    msg('d1', true, 30, 'Hi Dr. Elder, I’ve been on finasteride for six weeks. Is some shedding normal?'),
    msg('d2', false, 26, 'Yes, early shedding is common in the first few months and usually settles. Keep going.'),
    msg('d3', false, 3, 'Before I approve your tretinoin: are you using any other retinoids or acids right now?'),
  ],
  support: [
    msg('s1', false, 120, 'Welcome to Eternal. Message us here about orders, billing or shipping.'),
    msg('s2', true, 50, 'Can I change my delivery address for the next refill?'),
    msg('s3', false, 48, 'Of course. Update it under Account → Addresses and the next shipment uses it.'),
    msg('s4', true, 47, 'Done, thank you!'),
  ],
};
