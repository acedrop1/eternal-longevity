/**
 * Member profile data. Saved addresses and payment methods that persist
 * across checkout sessions. Stored in localStorage for the demo; in
 * production this lives in the member's account row.
 */

export interface SavedAddress {
  id: string;
  label: string; // "Home", "Work", custom
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  isPrimary?: boolean;
}

export interface SavedCard {
  id: string;
  brand: string; // "VISA" | "MASTERCARD" | "AMEX" | "DISCOVER"
  last4: string;
  expMonth: string;
  expYear: string;
  nameOnCard: string;
  isPrimary?: boolean;
}

export interface MemberProfile {
  /** Optional richer profile fields */
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  twoFactorEnabled?: boolean;
  /** Keyed by NOTIFICATION_DEFS[].key */
  notifications?: Record<string, boolean>;
  addresses: SavedAddress[];
  cards: SavedCard[];
}

/** Notification preferences shown on the Account page. */
export interface NotificationDef {
  key: string;
  title: string;
  body: string;
  /** Required channels can't be turned off. */
  required?: boolean;
}

export const NOTIFICATION_DEFS: NotificationDef[] = [
  {
    key: 'shipment',
    title: 'Shipment + order updates',
    body: 'Tracking numbers, delivery confirmations.',
    required: true,
  },
  {
    key: 'clinical',
    title: 'Clinical messages',
    body: 'Replies from your care team.',
    required: true,
  },
  {
    key: 'cycle',
    title: 'Cycle reminders',
    body: 'When to dose, when an off-cycle starts.',
  },
  {
    key: 'product',
    title: 'Product updates',
    body: 'New peptides, formulary changes.',
  },
  {
    key: 'marketing',
    title: 'Marketing & offers',
    body: 'Promotions, member-only pricing.',
  },
];

export const DEFAULT_NOTIFICATIONS: Record<string, boolean> = {
  shipment: true,
  clinical: true,
  cycle: true,
  product: false,
  marketing: false,
};

/** Seed profile so the demo member has something pre-saved to demo from. */
export const SEED_PROFILE: MemberProfile = {
  fullName: 'Alex Demo',
  phone: '(201) 555-0188',
  dateOfBirth: '',
  twoFactorEnabled: false,
  notifications: { ...DEFAULT_NOTIFICATIONS },
  addresses: [
    {
      id: 'addr-home',
      label: 'Home',
      fullName: 'Alex Demo',
      line1: '1402 Garden St',
      line2: 'Apt 4B',
      city: 'Hoboken',
      state: 'NJ',
      zip: '07030',
      phone: '(201) 555-0188',
      isPrimary: true,
    },
  ],
  cards: [
    {
      id: 'card-primary',
      brand: 'VISA',
      last4: '4242',
      expMonth: '04',
      expYear: '27',
      nameOnCard: 'Alex Demo',
      isPrimary: true,
    },
  ],
};

export function formatAddressOneLine(a: SavedAddress): string {
  return `${a.line1}${a.line2 ? `, ${a.line2}` : ''}, ${a.city}, ${a.state} ${a.zip}`;
}
