export type FAQCategory =
  | 'Getting Started'
  | 'Eligibility'
  | 'Protocols'
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
  'Protocols',
  'Pricing',
  'Safety',
];

export const FAQS: FAQ[] = [
  // === Getting Started ===
  {
    category: 'Getting Started',
    q: 'How does Eternal Longevity work?',
    a: "You complete a quick profile. About three minutes. That covers your goals, history, and a few targeted questions. Based on your answers we recommend a protocol, it's compounded by a U.S.-licensed 503A pharmacy and third-party tested for purity, and we ship it to your door. From order to your door is typically three to five days.",
  },
  {
    category: 'Getting Started',
    q: 'Do I need bloodwork before ordering?',
    a: "Recent bloodwork helps you match a protocol to your goals, but it isn't required to order. If you don't have recent labs, you can order from a thorough profile or add targeted labs through a partner lab. Mid-cycle bloodwork is recommended for most protocols so you can track your response.",
  },
  {
    category: 'Getting Started',
    q: 'How long until I see results?',
    a: "It depends on the protocol and the goal. Sleep, recovery, and energy shifts often show up in two to four weeks. Body-composition and metabolic shifts are usually visible by week eight. Deeper longevity markers. IGF-1 trends, fasting insulin, hs-CRP. Are measured at the end of the cycle so you have a paper trail, not just a feeling.",
  },

  // === Eligibility ===
  {
    category: 'Eligibility',
    q: 'Which states do you ship to?',
    a: "We currently ship to members in NJ, NY, CA, FL, TX, IL, CO, WA, and MA. We're actively adding states as our pharmacy network expands. If your state isn't listed yet, you can leave your email and we'll notify you the moment we go live in your region.",
  },
  {
    category: 'Eligibility',
    q: 'Is there an age requirement?',
    a: "Yes. You must be at least 18 years old to order. Most of our protocols are formulated for adults from their late twenties onward. Match a protocol to your goals from the profile, and order online.",
  },
  {
    category: 'Eligibility',
    q: 'Can I use peptides if I have a medical condition?',
    a: "It depends entirely on the condition and the peptide. Some conditions. Active cancer, certain organ transplants, current pregnancy. Are categorical exclusions. Others simply call for careful protocol selection and additional monitoring. Share your full history in your profile so you can choose what's appropriate — and this is not medical advice or a substitute for consulting your own healthcare provider.",
  },
  {
    category: 'Eligibility',
    q: 'What if I take other medications?',
    a: "Most medications are compatible with peptides, but interactions matter. List every medication and supplement in your profile. Including dose. Review these alongside the protocol you're considering and flag anything with your own healthcare provider that needs adjusting before you start.",
  },

  // === Protocols ===
  {
    category: 'Protocols',
    q: 'How are the protocols designed?',
    a: "Each protocol is a stack. Two or three peptides chosen because their mechanisms complement each other. Our formulation team writes the base template, and each protocol is compounded to a structured, titrated dose. We don't run one-size-fits-all kits.",
  },
  {
    category: 'Protocols',
    q: 'How long is a cycle?',
    a: "Most protocols run eight to twelve weeks on-cycle, followed by a four-week off-cycle. Continuous dosing erodes receptor sensitivity, so structured rest periods preserve the effect. Some protocols (metabolic, primarily) run longer; the schedule for each is shown on its protocol page.",
  },
  {
    category: 'Protocols',
    q: 'Can I stack protocols?',
    a: "Some protocols stack cleanly (recovery with longevity, for example). Others should not be combined. Don't stack on your own without checking the combined dosing schedule and ruling out interactions. If you want to combine two, note it in your profile for guidance on what pairs well.",
  },
  {
    category: 'Protocols',
    q: 'What happens at the end of a cycle?',
    a: "You receive a written summary of your cycle. What was dosed, what changed, and what to consider next. Many members continue with the same protocol after a short off-cycle. Others rotate to a different goal (e.g., recovery → longevity). Either way, the next cycle is a deliberate choice, not an automatic renewal.",
  },

  // === Pricing ===
  {
    category: 'Pricing',
    q: 'How much does a protocol cost?',
    a: "Pricing varies by protocol. A single cycle generally runs between four hundred and eight hundred dollars all-in. Which includes the compounded protocol, third-party purity testing, cold-chain shipping, and a mid-cycle protocol check-in. Subscription pricing is lower per cycle. Exact pricing is shown on each protocol page.",
  },
  {
    category: 'Pricing',
    q: 'Do you accept insurance?',
    a: "No. Peptide protocols are not covered by U.S. insurance plans, and we'd rather be upfront about that than pretend otherwise. All payments are out-of-pocket through the portal.",
  },
  {
    category: 'Pricing',
    q: 'What does the subscription include?',
    a: "A subscription locks in a lower price per cycle and includes scheduled re-shipments, a mid-cycle protocol check-in, and priority access to our team. You can pause or cancel between cycles. No penalty, no awkward call.",
  },
  {
    category: 'Pricing',
    q: 'What is your refund policy?',
    a: "We don't refund opened or shipped vials. Compounded protocols cannot legally be re-dispensed. If an order can't be filled after you complete your profile, you are refunded in full. If a shipment is damaged in transit, we replace it at no cost.",
  },

  // === Safety ===
  {
    category: 'Safety',
    q: 'Are these peptides FDA-approved?',
    a: "Some are (e.g., Tesamorelin, Semaglutide, Tirzepatide). Many are compounded under 503A authority for off-label or non-FDA-approved use. Compounded medications occupy a legitimate but distinct regulatory category. The specific status of each peptide is noted on its protocol page. This is not medical advice or a substitute for consulting your own healthcare provider.",
  },
  {
    category: 'Safety',
    q: 'What are the most common side effects?',
    a: "Most side effects are mild and dose-related: injection-site irritation, transient water retention, head-fog the first week. More significant side effects (elevated fasting glucose, persistent appetite shifts) are why mid-cycle labs are recommended. Talk to your own healthcare provider about anything that feels off; the protocol can be adjusted between cycles.",
  },
  {
    category: 'Safety',
    q: 'How is the pharmacy quality controlled?',
    a: "Every lot is third-party tested for purity (HPLC) and identity (mass spec). We work only with 503A pharmacies that publish certificates of analysis and operate under state-board oversight. We will share lot-level documentation on request. Transparency is not optional for us.",
  },
  {
    category: 'Safety',
    q: 'How are peptides shipped?',
    a: "Peptides are temperature-sensitive. Every shipment leaves the pharmacy in an insulated container with phase-change packs that hold temperature for at least 48 hours. You'll receive a tracking number, and shipments are signature-required for security.",
  },
  {
    category: 'Safety',
    q: 'What if I have a bad reaction?',
    a: "Stop dosing and reach our team through the portal. We reply within one business day, and a same-day callback is available if it's urgent. For any reaction that feels like an emergency, call 911 or go to the nearest ER first, then notify us.",
  },
];
