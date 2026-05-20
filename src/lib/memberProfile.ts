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
  phone?: string;
  dateOfBirth?: string;
  addresses: SavedAddress[];
  cards: SavedCard[];
}

/** Seed profile so the demo member has something pre-saved to demo from. */
export const SEED_PROFILE: MemberProfile = {
  phone: '(201) 555-0188',
  dateOfBirth: '',
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
