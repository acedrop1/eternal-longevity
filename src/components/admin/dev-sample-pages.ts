import type { AccountStatus } from '@/lib/database.types';
import type { Role } from '@/lib/auth';
import type { CheckinRow } from '@/lib/checkins-db';
import type { MessageThread, PortalMessage } from '@/lib/messages-db';
import type { IntakeRowView } from '@/components/admin/AdminIntakeQueue';

/**
 * Sample data (dev only) for Applications, Check-ins, Messages and the member
 * record, so they can be designed in local demo mode. Pages import this only
 * behind `process.env.NODE_ENV === 'development' && !live` and label it
 * "Sample data (dev only)". Never real people. Actions against these rows fail
 * harmlessly: there is no database behind them.
 */

const DAY = 86400_000;
const iso = (d: number) => new Date(Date.now() - d * DAY).toISOString();
const short = (d: number) =>
  new Date(Date.now() - d * DAY).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function intake(
  n: number,
  name: string,
  status: IntakeRowView['status'],
  state: string,
  source: string | null,
  days: number,
  extra: Partial<IntakeRowView> = {},
): IntakeRowView {
  return {
    id: `sample-intake-${n}`,
    userId: `sample-user-${n % 6}`,
    caseId: `el-${4100 + n}`,
    email: `${name.split(' ')[0].toLowerCase()}@example.com`,
    name,
    state,
    status,
    source,
    submittedAt: short(days),
    createdAt: iso(days),
    answers: [
      { label: 'state', value: state },
      { label: 'date_of_birth', value: '1986-04-02' },
      { label: 'sex', value: 'f' },
      { label: 'height', value: '5 ft 6 in' },
      { label: 'weight', value: '142 lb' },
      { label: 'conditions', value: 'None reported' },
      { label: 'medications', value: '—' },
    ],
    categories: [],
    ...extra,
  };
}

export const SAMPLE_INTAKES: IntakeRowView[] = [
  intake(1, 'Maya Chen', 'submitted', 'NJ', 'NAD+ injection', 0, {
    categories: [
      {
        key: 'hair',
        title: 'Hair',
        items: [
          { label: 'How long have you noticed thinning?', value: 'About a year', flag: false },
          { label: 'Any scalp conditions?', value: 'Seborrheic dermatitis', flag: true },
        ],
        photos: [{ label: 'Crown', path: 'sample/crown.jpg', url: null }],
        files: [],
      },
    ],
  }),
  intake(2, 'Daniel Ortiz', 'in_review', 'NY', 'Sermorelin', 1),
  intake(3, 'Priya Nair', 'needs_info', 'NJ', null, 3, {
    thread: { state: 'waiting', since: iso(2), question: 'Can you upload a recent lab panel?' },
  }),
  intake(4, 'Sam Whitfield', 'approved', 'PA', 'Glutathione', 9),
  intake(5, 'Lena Park', 'approved', 'NJ', 'NAD+ injection', 14),
  intake(6, 'Chris Bell', 'declined', 'TX', null, 20),
];

function checkin(
  n: number,
  name: string,
  product: string,
  kind: CheckinRow['kind'],
  rating: number | null,
  comment: string | null,
  days: number,
): CheckinRow {
  return {
    id: `sample-checkin-${n}`,
    createdAt: iso(days),
    memberName: name,
    memberEmail: `${name.split(' ')[0].toLowerCase()}@example.com`,
    productName: product,
    kind,
    rating,
    comment,
    respondedAt: rating === null ? null : iso(days - 1),
  };
}

export const SAMPLE_CHECKINS: CheckinRow[] = [
  checkin(1, 'Ava Romero', 'Glutathione', 'first', 5, 'Sleeping better already.', 1),
  checkin(2, 'Noah Kim', 'NAD+ injection', 'first', 2, 'Injection site was sore for days. Is that normal?', 2),
  checkin(3, 'Ella Brooks', 'Sermorelin', 'refill', 4, null, 4),
  checkin(4, 'Sam Whitfield', 'Glutathione', 'refill', null, null, 5),
  checkin(5, 'Lena Park', 'Sermorelin', 'first', 3, null, 8),
  checkin(6, 'Chris Bell', 'NAD+ injection', 'refill', 5, null, 12),
];

export const SAMPLE_THREADS: MessageThread[] = [
  {
    userId: 'sample-user-1',
    memberName: 'Noah Kim',
    memberEmail: 'noah@example.com',
    lastBody: 'Injection site was sore for days. Is that normal?',
    lastAt: iso(0.05),
    awaitingReply: true,
  },
  {
    userId: 'sample-user-2',
    memberName: 'Ella Brooks',
    memberEmail: 'ella@example.com',
    lastBody: 'Can I move my next shipment back a week?',
    lastAt: iso(0.4),
    awaitingReply: true,
  },
  {
    userId: 'sample-user-3',
    memberName: 'Maya Chen',
    memberEmail: 'maya@example.com',
    lastBody: 'Done, your refill ships Thursday.',
    lastAt: iso(2),
    awaitingReply: false,
  },
];

const msg = (id: string, senderRole: PortalMessage['senderRole'], body: string, days: number): PortalMessage => ({
  id,
  senderRole,
  body,
  createdAt: iso(days),
});

export const SAMPLE_MESSAGES: Record<string, PortalMessage[]> = {
  'sample-user-1': [
    msg('m1', 'member', 'Hi, quick question about my first week.', 0.3),
    msg('m2', 'staff', 'Of course. What is going on?', 0.2),
    msg('m3', 'member', 'Injection site was sore for days. Is that normal?', 0.05),
  ],
  'sample-user-2': [msg('m4', 'member', 'Can I move my next shipment back a week?', 0.4)],
  'sample-user-3': [
    msg('m5', 'member', 'Could you check when my refill goes out?', 2.2),
    msg('m6', 'staff', 'Done, your refill ships Thursday.', 2),
  ],
};

/** The member record page's shape, for one sample member. */
export function sampleMemberDetail() {
  return {
    name: 'Maya Chen',
    email: 'maya@example.com',
    phone: '2015550142',
    dob: '1986-04-02',
    status: 'active' as AccountStatus,
    role: 'member' as Role,
    joinedAt: short(40),
    addresses: [
      { label: 'Home', fullName: 'Maya Chen', lines: ['120 Sample St', 'Apt 4', 'Hoboken, NJ 07030'], primary: true },
    ],
    subscriptions: [{ productName: 'NAD+ injection', status: 'active', cadence: 'Monthly', perCycle: 249 }],
    orders: [
      {
        ref: '1048',
        status: 'signed',
        total: 249,
        money: [
          { label: 'Subtotal', value: 249 },
          { label: 'Shipping', value: 0 },
          { label: 'Tax', value: 0 },
          { label: 'Total', value: 249, strong: true },
        ],
        products: 'NAD+ injection · Monthly',
        placedAt: short(0),
        steps: [
          { label: 'Placed', at: short(0) },
          { label: 'Approved by prescriber', at: short(0) },
        ],
        tracking: null,
        warning: 'Approved but the payment has not cleared.',
      },
      {
        ref: '1031',
        status: 'delivered',
        total: 229,
        money: [
          { label: 'Subtotal', value: 249 },
          { label: 'Discount · WELCOME20', value: -20 },
          { label: 'Shipping', value: 0 },
          { label: 'Tax', value: 0 },
          { label: 'Total', value: 229, strong: true },
        ],
        products: 'NAD+ injection · Monthly',
        placedAt: short(32),
        steps: [
          { label: 'Placed', at: short(32) },
          { label: 'Approved by prescriber', at: short(32) },
          { label: 'Payment cleared', at: short(31) },
          { label: 'Sent to pharmacy', at: short(31) },
          { label: 'Shipped', at: short(29) },
        ],
        tracking: { carrier: 'UPS', number: '1Z999AA10123456784' },
        warning: null,
      },
    ],
    timeline: [
      { at: short(0), label: 'Order approved', body: null, orderNumber: '1048', author: 'Dr. Sample Prescriber' },
      { at: short(0), label: 'Order placed', body: null, orderNumber: '1048', author: null },
      { at: short(29), label: 'Shipped', body: 'UPS 1Z999AA10123456784', orderNumber: '1031', author: 'System' },
    ],
    review: null,
  };
}
