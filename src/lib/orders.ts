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
  cadence: 'monthly' | 'quarterly' | 'annual';
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

export interface DemoPhysician {
  id: string;
  name: string;
  /** States this physician is licensed in. Admin sees this when assigning. */
  states: string[];
  /** Email key. Used to match the demo doctor session. */
  email: string;
}

export const PHYSICIANS: DemoPhysician[] = [
  {
    id: 'dr-reyes',
    name: 'Dr. M. Reyes',
    states: ['NJ', 'NY', 'MA'],
    email: 'doctor@eternal.test',
  },
  {
    id: 'dr-chen',
    name: 'Dr. A. Chen',
    states: ['CA', 'WA', 'CO'],
    email: 'chen@eternallongevity.com',
  },
  {
    id: 'dr-okafor',
    name: 'Dr. P. Okafor',
    states: ['TX', 'FL', 'IL'],
    email: 'okafor@eternallongevity.com',
  },
];

/** Look up physician name by id (UI helper). */
export function getPhysicianName(id?: string): string | null {
  if (!id) return null;
  return PHYSICIANS.find((p) => p.id === id)?.name ?? null;
}

/** Find which physicians can sign for an order's state (UI hint). */
export function physiciansForState(state: string): DemoPhysician[] {
  return PHYSICIANS.filter((p) => p.states.includes(state));
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  'pending-admin': 'AWAITING ADMIN REVIEW',
  'denied-admin': 'DENIED BY ADMIN',
  assigned: 'AWAITING PHYSICIAN',
  signed: 'PHYSICIAN APPROVED',
  'declined-clinical': 'DECLINED. CLINICAL',
  compounding: 'COMPOUNDING',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
};

/** Demo seed orders so the admin/doctor portals aren't empty on first load. */
export const SEED_ORDERS: Order[] = [
  {
    id: 'ord-1041',
    memberName: 'Marcus Thompson',
    memberEmail: 'marcus.t@protonmail.com',
    state: 'NJ',
    lines: [
      {
        productId: 'bpc-157',
        productName: 'BPC-157',
        cadence: 'quarterly',
        cadenceLabel: 'Quarterly',
        quantity: 1,
        perCycle: 420,
        image: '/images/11.jpg',
        swatch: 'linear-gradient(180deg, #1a4a3e 0%, #000000 100%)',
      },
    ],
    subtotal: 420,
    shippingCost: 0,
    tax: 34,
    total: 454,
    shippingAddress: {
      fullName: 'Marcus Thompson',
      line1: '14 Hudson St',
      city: 'Hoboken',
      state: 'NJ',
      zip: '07030',
    },
    cardLast4: '4242',
    placedAt: Date.now() - 14 * 60 * 1000, // 14 min ago
    status: 'pending-admin',
  },
  {
    id: 'ord-1042',
    memberName: 'Lena Rodriguez',
    memberEmail: 'lena.r@gmail.com',
    state: 'NY',
    lines: [
      {
        productId: 'semaglutide',
        productName: 'Semaglutide',
        cadence: 'quarterly',
        cadenceLabel: 'Quarterly',
        quantity: 1,
        perCycle: 770,
        image: '/images/12.jpg',
        swatch: 'linear-gradient(180deg, #3e5a52 0%, #000000 100%)',
      },
    ],
    subtotal: 770,
    shippingCost: 0,
    tax: 62,
    total: 832,
    shippingAddress: {
      fullName: 'Lena Rodriguez',
      line1: '210 W 49th St, Apt 8C',
      city: 'New York',
      state: 'NY',
      zip: '10019',
    },
    cardLast4: '5556',
    placedAt: Date.now() - 38 * 60 * 1000,
    status: 'pending-admin',
    adminNote: '',
  },
  {
    id: 'ord-1043',
    memberName: 'Sam Park',
    memberEmail: 'sam.park@icloud.com',
    state: 'CA',
    lines: [
      {
        productId: 'cjc-ipamorelin',
        productName: 'CJC-1295 / Ipamorelin',
        cadence: 'monthly',
        cadenceLabel: 'Monthly',
        quantity: 1,
        perCycle: 240,
        image: '/images/9.jpg',
        swatch: 'linear-gradient(180deg, #3a5a4e 0%, #000000 100%)',
      },
    ],
    subtotal: 240,
    shippingCost: 0,
    tax: 19,
    total: 259,
    shippingAddress: {
      fullName: 'Sam Park',
      line1: '88 Mission St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
    },
    cardLast4: '4242',
    placedAt: Date.now() - 1.5 * 60 * 60 * 1000, // 1.5 hr ago
    status: 'assigned',
    assignedToPhysicianId: 'dr-reyes',
    adminNote: 'Routed via NJ-licensed pending CA license expansion.',
  },
  {
    id: 'ord-1037',
    memberName: 'Hadi Khoury',
    memberEmail: 'hadi.k@gmail.com',
    state: 'FL',
    lines: [
      {
        productId: 'tesamorelin',
        productName: 'Tesamorelin',
        cadence: 'quarterly',
        cadenceLabel: 'Quarterly',
        quantity: 1,
        perCycle: 870,
        image: '/images/8.jpg',
        swatch: 'linear-gradient(180deg, #4a604e 0%, #000000 100%)',
      },
    ],
    subtotal: 870,
    shippingCost: 0,
    tax: 70,
    total: 940,
    shippingAddress: {
      fullName: 'Hadi Khoury',
      line1: '405 NE 6th Ave',
      city: 'Miami',
      state: 'FL',
      zip: '33132',
    },
    cardLast4: '4242',
    placedAt: Date.now() - 26 * 60 * 60 * 1000,
    status: 'compounding',
    assignedToPhysicianId: 'dr-okafor',
    physicianNote: 'Cleared after cardiology coordination. Approved.',
  },
  {
    id: 'ord-1024',
    memberName: 'Priya Narayan',
    memberEmail: 'priya.n@gmail.com',
    state: 'TX',
    lines: [
      {
        productId: 'ghk-cu',
        productName: 'GHK-Cu',
        cadence: 'quarterly',
        cadenceLabel: 'Quarterly',
        quantity: 1,
        perCycle: 380,
        image: '/images/14.jpg',
        swatch: 'linear-gradient(180deg, #2a5048 0%, #000000 100%)',
      },
    ],
    subtotal: 380,
    shippingCost: 0,
    tax: 30,
    total: 410,
    shippingAddress: {
      fullName: 'Priya Narayan',
      line1: '1820 N Lamar Blvd',
      city: 'Austin',
      state: 'TX',
      zip: '78705',
    },
    cardLast4: '5556',
    placedAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
    status: 'delivered',
    assignedToPhysicianId: 'dr-okafor',
    tracking: '1Z A99 7W2 03 1124 5582',
    carrier: 'FedEx',
  },
];
