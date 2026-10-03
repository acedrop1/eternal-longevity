import type { Order } from '@/lib/orders';
import type { PatientReview } from '@/lib/clinical-review';
import type { ThreadStatus } from '@/lib/prescriber-view';
import type { MessageThread, PortalMessage } from '@/lib/messages-db';
import { SAMPLE_ORDERS } from '@/components/admin/dev-sample';

/**
 * Sample data (dev only) for the prescriber portal: a queue to review, cases
 * he has signed or declined, and his patient threads, so the doctor pages can
 * be designed in local demo mode. Pages import this only behind
 * `process.env.NODE_ENV === 'development' && !live` and label it "Sample data
 * (dev only)". Never real people. The signed and in-flight orders are the
 * admin sample's, so the order page (/portal/admin/orders/[ref]) opens them.
 */

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const ago = (ms: number) => Date.now() - ms;
const iso = (ms: number) => new Date(ago(ms)).toISOString();

function line(productId: string, productName: string, perCycle: number, image: string, swatch: string): Order['lines'][number] {
  return { productId, productName, cadence: 'monthly', cadenceLabel: 'Monthly', quantity: 1, perCycle, image, swatch };
}

function order(n: number, status: Order['status'], name: string, l: Order['lines'][number], placedMs: number, extra: Partial<Order> = {}): Order {
  return {
    id: String(n),
    userId: `sample-dr-${n}`,
    memberName: name,
    memberEmail: `${name.split(' ')[0].toLowerCase()}@example.com`,
    state: 'NJ',
    lines: [l],
    subtotal: l.perCycle,
    shippingCost: 0,
    tax: 0,
    total: l.perCycle,
    shippingAddress: { fullName: name, line1: '120 Sample St', city: 'Hoboken', state: 'NJ', zip: '07030' },
    placedAt: ago(placedMs),
    status,
    ...extra,
  };
}

const SERMORELIN = line('sermorelin', 'Sermorelin', 299, '/images/7.jpg', 'linear-gradient(180deg, #2e5048 0%, #000000 100%)');
const GHK = line('ghk-cu', 'GHK-Cu', 189, '/images/14.jpg', 'linear-gradient(180deg, #2a5048 0%, #000000 100%)');
const PT141 = line('pt-141', 'PT-141', 159, '/images/8.jpg', 'linear-gradient(180deg, #4a5042 0%, #000000 100%)');
const HAIR = line('fin-min-foam', 'Finasteride + Minoxidil foam', 79, '', '');

const QUEUE: Order[] = [
  order(1055, 'assigned', 'Jordan Avery', SERMORELIN, 3 * DAY, {
    adminNote: 'Asked to move delivery to his office address; updated on the order.',
  }),
  order(1054, 'assigned', 'Rosa Delgado', GHK, 28 * HOUR, {
    subtotal: 189,
    discount: 20,
    promoCode: 'WELCOME20',
    tax: 11.83,
    total: 180.83,
  }),
  order(1053, 'assigned', 'Marcus Lee', PT141, 5 * HOUR, { state: 'NY' }),
  order(1052, 'assigned', 'Hana Sato', HAIR, 2 * HOUR, { shippingCost: 9, total: 88 }),
];

const DECLINED: Order[] = [
  order(1045, 'declined-clinical', 'Ivy Moreno', SERMORELIN, 3 * DAY, {
    physicianNote: 'Your current medication list makes this unsafe to start. Please speak with your primary physician first.',
    updates: [
      {
        id: 'd1',
        at: ago(2.5 * DAY),
        author: 'Dr. Sample Prescriber',
        role: 'physician',
        note: 'Your current medication list makes this unsafe to start. Please speak with your primary physician first.',
        statusChange: 'declined-clinical',
      },
    ],
  }),
  order(1042, 'declined-clinical', 'Ben Carter', PT141, 8 * DAY, {
    physicianNote: 'Blood pressure readings are too high for this treatment.',
    updates: [
      { id: 'd2', at: ago(7.8 * DAY), author: 'Dr. Sample Prescriber', role: 'physician', note: 'Blood pressure readings are too high for this treatment.', statusChange: 'declined-clinical' },
    ],
  }),
];

/** Admin's sample orders, with Maya Chen's marked signed this morning so "Approved today" reads. */
const SIGNED = SAMPLE_ORDERS.map((o) =>
  o.id === '1048'
    ? {
        ...o,
        updates: [
          { id: 'g1', at: ago(2 * HOUR), author: 'Dr. Sample Prescriber', role: 'physician' as const, note: 'Order confirmed. Billing starts now.', statusChange: 'signed' as const },
          { id: 'g2', at: ago(2 * HOUR - 1), author: 'Billing', role: 'system' as const, note: 'First cycle billed. $249 charged to the card on file. Order released to the pharmacy.' },
        ],
      }
    : o,
);

export const SAMPLE_DR_ORDERS: Order[] = [...QUEUE, ...SIGNED, ...DECLINED];

function review(name: string, extra: Partial<PatientReview>): PatientReview {
  return {
    name,
    dob: 'Mar 12, 1984',
    age: '42',
    sex: 'Male',
    body: '5′ 11″ · 182 lb',
    submittedAt: 'Sep 29, 2026',
    safety: [
      { label: 'Active cancer, or treated in the last 5 years', value: 'No', flag: false },
      { label: 'Pregnant or breastfeeding', value: 'Not applicable', flag: false },
      { label: 'End-stage kidney or liver disease', value: 'No', flag: false },
    ],
    history: [
      { label: 'Diagnosed conditions', value: '—', flag: false },
      { label: 'Medications, supplements and herbals', value: '—', flag: false },
      { label: 'Drug allergies', value: 'No', flag: false },
      { label: 'Allergy detail', value: '—' },
    ],
    context: [
      { label: 'Card on file', value: 'Visa ending 4242' },
      { label: 'Previous approved orders', value: 'None yet' },
    ],
    contact: [
      { label: 'Ships to', value: '120 Sample St, Hoboken NJ 07030' },
      { label: 'Phone', value: '(201) 555-0142' },
      { label: 'Email', value: `${name.split(' ')[0].toLowerCase()}@example.com` },
    ],
    categories: [],
    photosPending: false,
    photosRequestable: false,
    ...extra,
  };
}

export const SAMPLE_DR_REVIEWS: Record<string, PatientReview> = {
  '1055': review('Jordan Avery', {
    history: [
      { label: 'Diagnosed conditions', value: 'Hypothyroidism', flag: true },
      { label: 'Medications, supplements and herbals', value: 'Levothyroxine 75 mcg daily; fish oil; vitamin D 2000 IU', flag: true },
      { label: 'Drug allergies', value: 'Yes', flag: true },
      { label: 'Allergy detail', value: 'Penicillin (hives)' },
      { label: 'Product safety screen · Sermorelin', value: 'None of the listed contraindications apply', flag: false },
    ],
    context: [
      { label: 'Card on file', value: 'Visa ending 4242' },
      { label: 'Previous approved orders', value: '2, last Aug 30, 2026' },
    ],
  }),
  '1054': review('Rosa Delgado', {
    sex: 'Female',
    age: '36',
    dob: 'Jul 4, 1990',
    body: '5′ 5″ · 131 lb',
    safety: [
      { label: 'Active cancer, or treated in the last 5 years', value: 'No', flag: false },
      { label: 'Pregnant or breastfeeding', value: 'No', flag: false },
      { label: 'End-stage kidney or liver disease', value: 'No', flag: false },
    ],
    categories: [
      {
        key: 'skin',
        title: 'Skin',
        items: [
          { label: 'Main concern', value: 'Fine lines, uneven tone', flag: false },
          { label: 'Using a retinoid now', value: 'Yes, tretinoin 0.025%', flag: true },
          { label: 'Sensitive skin', value: 'Somewhat', flag: false },
        ],
        photos: [],
        files: [],
      },
    ],
    photosRequestable: true,
    context: [
      { label: 'Card on file', value: 'None saved', flag: true },
      { label: 'Previous approved orders', value: 'None yet' },
    ],
  }),
  '1053': review('Marcus Lee', {
    age: '51',
    dob: 'Jan 20, 1975',
    safety: [
      { label: 'Active cancer, or treated in the last 5 years', value: 'No', flag: false },
      { label: 'Pregnant or breastfeeding', value: 'Not applicable', flag: false },
      { label: 'End-stage kidney or liver disease', value: 'No', flag: false },
    ],
    history: [
      { label: 'Diagnosed conditions', value: 'None reported', flag: false },
      { label: 'Medications, supplements and herbals', value: 'Tadalafil 5 mg daily', flag: true },
      { label: 'Drug allergies', value: 'No', flag: false },
      { label: 'Allergy detail', value: '—' },
    ],
  }),
  '1052': review('Hana Sato', {
    sex: 'Female',
    age: '33',
    dob: 'Feb 2, 1993',
    body: '5′ 3″ · 120 lb',
    categories: [
      {
        key: 'hair',
        title: 'Hair',
        items: [
          { label: 'Where is the thinning', value: 'Crown and part line', flag: false },
          { label: 'How long', value: 'About 2 years', flag: false },
          { label: 'Planning a pregnancy', value: 'No', flag: false },
        ],
        photos: [
          { label: 'Top of head', path: 'sample/top.jpg', url: null },
          { label: 'Part line', path: 'sample/part.jpg', url: null },
        ],
        files: [{ label: 'Thyroid panel.pdf', path: 'sample/labs.pdf', url: null }],
      },
    ],
    photosPending: true,
  }),
  '1045': review('Ivy Moreno', {
    history: [
      { label: 'Diagnosed conditions', value: 'Type 1 diabetes', flag: true },
      { label: 'Medications, supplements and herbals', value: 'Insulin glargine; insulin lispro', flag: true },
      { label: 'Drug allergies', value: 'No', flag: false },
      { label: 'Allergy detail', value: '—' },
    ],
  }),
};

export const SAMPLE_DR_THREADS: Record<string, ThreadStatus> = {
  'sample-dr-1055': { state: 'waiting', since: iso(22 * HOUR), question: 'How long have you been on levothyroxine at this dose?' },
  'sample-dr-1053': { state: 'replied', at: iso(1.5 * HOUR) },
};

export const SAMPLE_DR_SIGS: Record<string, string> = {
  sermorelin: 'Inject 0.3 mL (300 mcg) subcutaneously nightly, 5 nights a week.',
  'pt-141': 'Inject 0.2 mL (1.75 mg) subcutaneously 45 minutes before activity. No more than once in 24 hours.',
};

/* Messages ('doctor' channel). */

const msg = (id: string, senderRole: PortalMessage['senderRole'], body: string, ms: number): PortalMessage => ({
  id,
  senderRole,
  body,
  createdAt: iso(ms),
});

export const SAMPLE_DR_INBOX: MessageThread[] = [
  {
    userId: 'sample-dr-1053',
    memberName: 'Marcus Lee',
    memberEmail: 'marcus@example.com',
    lastBody: 'Five years, 5 mg every day. No side effects.',
    lastAt: iso(1.5 * HOUR),
    awaitingReply: true,
  },
  {
    userId: 'sample-dr-1055',
    memberName: 'Jordan Avery',
    memberEmail: 'jordan@example.com',
    lastBody: 'How long have you been on levothyroxine at this dose?',
    lastAt: iso(22 * HOUR),
    awaitingReply: false,
  },
  {
    userId: 'sample-dr-1045',
    memberName: 'Ivy Moreno',
    memberEmail: 'ivy@example.com',
    lastBody: 'Understood, thank you for explaining.',
    lastAt: iso(2 * DAY),
    awaitingReply: true,
  },
];

export const SAMPLE_DR_MESSAGES: Record<string, PortalMessage[]> = {
  'sample-dr-1053': [
    msg('a1', 'staff', 'What dose of tadalafil are you on, and how long have you been taking it?', 3 * HOUR),
    msg('a2', 'member', 'Five years, 5 mg every day. No side effects.', 1.5 * HOUR),
  ],
  'sample-dr-1055': [msg('b1', 'staff', 'How long have you been on levothyroxine at this dose?', 22 * HOUR)],
  'sample-dr-1045': [
    msg('c1', 'staff', 'Your current medication list makes this unsafe to start. Please speak with your primary physician first.', 2.5 * DAY),
    msg('c2', 'member', 'Understood, thank you for explaining.', 2 * DAY),
  ],
};
