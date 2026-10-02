import type { ShopProduct } from '@/lib/shopProducts';
import { SERVICE_AREA } from '@/lib/site';
import { SHIPPING_PRICE } from '@/lib/shipping';

const TWO_DAY = `$${SHIPPING_PRICE['2_DAY']}`;
const OVERNIGHT = `$${SHIPPING_PRICE.OVERNIGHT}`;

/*
 * The pricing answer quotes live prices, which admins edit in Admin →
 * Products. FAQS carries {{monthly}} / {{quarterly}} / {{sixMonth}} placeholders and
 * withPrices() fills them from the live catalogue wherever FAQs render.
 */
const range = (xs: number[]) => {
  if (!xs.length) return 'varies';
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  return lo === hi ? `$${lo}` : `$${lo}–$${hi}`;
};

export function withPrices(faqs: FAQ[], live: ShopProduct[]): FAQ[] {
  const monthly = range(live.map((p) => p.pricing.monthly));
  const quarterly = range(live.map((p) => Math.round(p.pricing.quarterly / 3)));
  const sixMonth = range(live.flatMap((p) => (p.pricing.sixMonth ? [Math.round(p.pricing.sixMonth / 6)] : [])));
  return faqs.map((f) => ({
    ...f,
    a: f.a
      .replaceAll('{{monthly}}', monthly)
      .replaceAll('{{quarterly}}', quarterly)
      .replaceAll('{{sixMonth}}', sixMonth),
  }));
}

export type FAQCategory =
  | 'Getting Started'
  | 'Eligibility'
  | 'Treatments'
  | 'Pricing'
  | 'Safety';

export interface FAQ {
  q: string;
  a: string;
  category: FAQCategory;
}

export const FAQ_CATEGORIES: FAQCategory[] = [
  'Getting Started',
  'Eligibility',
  'Treatments',
  'Pricing',
  'Safety',
];

export const FAQS: FAQ[] = [
  // === Getting Started ===
  {
    category: 'Getting Started',
    q: 'How does Eternal Longevity work?',
    a: "You complete a short online intake about your health. Dr. Bader Elder, DO, a licensed physician, reviews it and decides whether to prescribe; he may decline or ask you questions first. At checkout you save a card, and nothing is charged unless he approves. A physician usually reviews your intake within 1 business day. After approval, the pharmacy typically prepares and ships within a few business days.",
  },
  {
    category: 'Getting Started',
    q: 'Do I need bloodwork before ordering?',
    a: "Not usually. If the prescriber needs recent lab results to decide safely, he will ask for them before prescribing.",
  },
  {
    category: 'Getting Started',
    q: 'How long until my order arrives?',
    a: "A physician usually reviews your intake within 1 business day. After approval, the pharmacy typically prepares and ships within a few business days, by 2-day service or overnight cold-chain depending on the product. Results vary by person and treatment, and we don't promise specific results or timelines.",
  },

  // === Eligibility ===
  {
    category: 'Eligibility',
    q: 'Which states do you ship to?',
    a: `We currently serve members in ${SERVICE_AREA}. Our prescriber is licensed in each of them, and orders ship only to addresses in them. We're adding states as we expand. If you're somewhere else, send us a note through our contact page and we'll tell you when we go live in your state.`,
  },
  {
    category: 'Eligibility',
    q: 'Is there an age requirement?',
    a: "Yes. You must be 18 or older. Some treatments have their own health criteria, which the prescriber applies during his review.",
  },
  {
    category: 'Eligibility',
    q: 'Can I get treatment if I have a medical condition?',
    a: "It depends on the condition and the treatment. Some, such as pregnancy or recent cancer treatment, rule out treatment online. Others just need the prescriber to know about them. List your full history in your intake; the prescriber decides what is safe for you, and may ask questions or decline.",
  },
  {
    category: 'Eligibility',
    q: 'What if I take other medications?',
    a: "List every medication and supplement, with the dose, in your intake. The prescriber checks for interactions before deciding and may ask you about them. Keep your own doctor informed of what you take.",
  },

  // === Treatments ===
  {
    category: 'Treatments',
    q: 'What treatments do you offer?',
    a: "Prescription treatments for longevity, sexual health, hormones, hair and skin. Depending on the product, they come as injections, nasal sprays, tablets, capsules, creams or foams. Each product page explains what it is, how it's used, and its possible side effects.",
  },
  {
    category: 'Treatments',
    q: 'How does the prescriber decide what is right for me?',
    a: "He reviews your intake (your history, medications, allergies, and the safety questions for the product you chose) and decides whether that treatment is appropriate for you. He may prescribe, decline, or ask for more information first.",
  },
  {
    category: 'Treatments',
    q: 'How do refills work?',
    a: "On a plan, refills ship on the same prescription until it expires or runs out of refills. They are not reviewed again each time, but the prescriber can pause or stop your plan at any time. When the prescription runs out, your plan pauses until he reviews it again. You can pause, change or cancel your plan any time in Portal › Subscriptions, with no fee.",
  },
  {
    category: 'Treatments',
    q: 'Can I take more than one treatment?',
    a: "Possibly. Each new product needs its own review, and the prescriber checks it against everything else you take. Don't combine treatments on your own.",
  },

  // === Pricing ===
  {
    category: 'Pricing',
    q: 'How much does treatment cost?',
    a: `Pricing depends on the product. On the monthly plan it runs {{monthly}} a month. The quarterly plan brings that down to {{quarterly}} a month, billed every three months, and the 6-month plan to {{sixMonth}} a month, billed every six months. A one-time order is also available. Shipping is ${TWO_DAY} (2-day) or ${OVERNIGHT} (overnight cold-chain) per shipment, depending on the product, and each renewal ships and is charged shipping again. You save a card at checkout and are only charged once the physician approves your prescription. Exact pricing is on each product page.`,
  },
  {
    category: 'Pricing',
    q: 'Do you accept insurance?',
    a: "No. We don't bill insurance, and compounded medications are generally not covered, so all payments are out-of-pocket.",
  },
  {
    category: 'Pricing',
    q: 'What does a plan include?',
    a: "Refills on your prescription on the schedule you choose, tracked shipping on each one, and access to our team and the prescriber through the portal. Longer plans cost less per month. You can pause, change or cancel any time from Portal › Subscriptions, with no fee.",
  },
  {
    category: 'Pricing',
    q: 'What is your refund policy?',
    a: "If the prescriber declines, you are not charged. Once the pharmacy has prepared or shipped your medication we can't refund it, because compounded medications can't be re-dispensed. If a shipment arrives damaged, contact us within 7 days and we'll replace it at no cost.",
  },

  // === Safety ===
  {
    category: 'Safety',
    q: 'Are these medications FDA-approved?',
    a: "No. Our medications are compounded preparations, including PT-141, and compounded medications are not FDA-approved; the FDA does not verify their safety, effectiveness or quality. Some contain ingredients that are also found in FDA-approved drugs. Each is prescribed only after a physician's review and prepared by a state-licensed 503A pharmacy.",
  },
  {
    category: 'Safety',
    q: 'What are the most common side effects?',
    a: "It depends on the medication. Each product page lists the common ones, and you can ask the prescriber through the portal. If something feels wrong, stop the medication and contact us. For anything severe, call 911.",
  },
  {
    category: 'Safety',
    q: 'How is the pharmacy quality controlled?',
    a: "Each batch is tested by the pharmacy as required for its preparation type. That testing is the pharmacy's own, not an independent laboratory's. The pharmacy, a state-licensed 503A compounding pharmacy named on your prescription label, is inspected by its state board of pharmacy, and we will share the certificate of analysis for your lot on request.",
  },
  {
    category: 'Safety',
    q: 'How are medications shipped?',
    a: `Temperature-sensitive medications ship overnight cold-chain in insulated packaging (${OVERNIGHT} per shipment); others ship 2-day (${TWO_DAY} per shipment). Every shipment is charged shipping, renewals included. You'll get a tracking number when your order ships.`,
  },
  {
    category: 'Safety',
    q: 'What if I have a bad reaction?',
    a: "Stop the medication and message us through the portal; we reply within one business day. For anything that feels like an emergency, call 911 or go to the nearest emergency room first, then let us know.",
  },
];
