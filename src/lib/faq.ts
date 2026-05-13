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
    a: "You complete a quick health assessment — about three minutes — that covers your goals, history, and a few targeted clinical questions. Our clinical team drafts a recommended protocol, a licensed physician reviews and signs your prescription, and we ship from a U.S.-licensed 503A compounding pharmacy. From assessment to your door is typically three to five days.",
  },
  {
    category: 'Getting Started',
    q: 'Do I need bloodwork before starting?',
    a: "Recent bloodwork helps your physician personalize the protocol, but it isn't required to begin. If you don't have recent labs, your physician will either work from a thorough clinical history or order targeted labs through a partner lab before signing. Mid-cycle bloodwork is recommended for most protocols.",
  },
  {
    category: 'Getting Started',
    q: 'How long until I see results?',
    a: "It depends on the protocol and the goal. Sleep, recovery, and energy shifts often show up in two to four weeks. Body-composition and metabolic shifts are usually visible by week eight. Deeper longevity markers — IGF-1 trends, fasting insulin, hs-CRP — are measured at the end of the cycle so you have a paper trail, not just a feeling.",
  },

  // === Eligibility ===
  {
    category: 'Eligibility',
    q: 'Which states do you operate in?',
    a: "We currently serve patients in NJ, NY, CA, FL, TX, IL, CO, WA, and MA. We're actively adding states as we license additional physicians. If your state isn't listed yet, you can leave your email and we'll notify you the moment we go live in your region.",
  },
  {
    category: 'Eligibility',
    q: 'Is there an age requirement?',
    a: "Yes. You must be at least 18 years old. Most of our protocols are clinically appropriate for adults from their late twenties onward, but eligibility is decided by your physician based on your full clinical picture.",
  },
  {
    category: 'Eligibility',
    q: 'Can I use peptides if I have a medical condition?',
    a: "It depends entirely on the condition and the peptide. Some conditions — active cancer, certain organ transplants, current pregnancy — are categorical exclusions. Others simply require careful protocol selection and additional monitoring. Disclose everything during your intake; your physician will tell you what's appropriate.",
  },
  {
    category: 'Eligibility',
    q: 'What if I take prescription medications?',
    a: "Most prescription medications are compatible with peptide therapy, but interactions matter. List every medication and supplement during intake — including dose. Your physician reviews these alongside your protocol and will flag anything that needs adjusting before you start.",
  },

  // === Protocols ===
  {
    category: 'Protocols',
    q: 'How are the protocols designed?',
    a: "Each protocol is a stack — two or three peptides chosen because their mechanisms complement each other. Our medical director writes the base template, your physician personalizes the dose to your intake, and we adjust mid-cycle if your labs or response warrants it. We don't run one-size-fits-all kits.",
  },
  {
    category: 'Protocols',
    q: 'How long is a cycle?',
    a: "Most protocols run eight to twelve weeks on-cycle, followed by a four-week off-cycle. Continuous dosing erodes receptor sensitivity, so structured rest periods preserve the effect. Some protocols (metabolic, primarily) run longer; your physician will confirm the schedule before you start.",
  },
  {
    category: 'Protocols',
    q: 'Can I stack protocols?',
    a: "Some protocols stack cleanly (recovery with longevity, for example). Others should not be combined. Never stack on your own — your physician needs to review the combined dosing schedule and rule out interactions. If you want to combine two, mention it during your assessment and they'll advise.",
  },
  {
    category: 'Protocols',
    q: 'What happens at the end of a cycle?',
    a: "You receive a written summary of your cycle — what was dosed, what changed, what your physician recommends next. Many members continue with the same protocol after a short off-cycle. Others rotate to a different goal (e.g., recovery → longevity). Either way, the next cycle is a real clinical decision, not an automatic renewal.",
  },

  // === Pricing ===
  {
    category: 'Pricing',
    q: 'How much does a protocol cost?',
    a: "Pricing varies by protocol. A single cycle generally runs between four hundred and eight hundred dollars all-in — which includes the physician review, the compounded prescription, cold-chain shipping, and the mid-cycle check-in. Subscription pricing is lower per cycle. Exact pricing is shown on each protocol page.",
  },
  {
    category: 'Pricing',
    q: 'Do you accept insurance?',
    a: "No. Peptide protocols are not covered by U.S. insurance plans, and we'd rather be upfront about that than pretend otherwise. All payments are out-of-pocket through the portal.",
  },
  {
    category: 'Pricing',
    q: 'What does the subscription include?',
    a: "A subscription locks in a lower price per cycle and includes scheduled re-shipments, a mid-cycle physician check-in, and priority access to your care team. You can pause or cancel between cycles — no penalty, no awkward call.",
  },
  {
    category: 'Pricing',
    q: 'What is your refund policy?',
    a: "We don't refund opened or shipped vials — compounded prescriptions cannot legally be re-dispensed. If your physician declines to sign your protocol after intake, you are refunded in full. If a shipment is damaged in transit, we replace it at no cost.",
  },

  // === Safety ===
  {
    category: 'Safety',
    q: 'Are these peptides FDA-approved?',
    a: "Some are (e.g., Tesamorelin, Semaglutide, Tirzepatide). Many are compounded under 503A authority for off-label or non-FDA-approved use. Compounded medications occupy a legitimate but distinct regulatory category — your physician will discuss the specific status of anything you're prescribed.",
  },
  {
    category: 'Safety',
    q: 'What are the most common side effects?',
    a: "Most side effects are mild and dose-related: injection-site irritation, transient water retention, head-fog the first week. More significant side effects (elevated fasting glucose, persistent appetite shifts) are why we monitor with mid-cycle labs. Tell your physician anything that feels off; the protocol can be adjusted.",
  },
  {
    category: 'Safety',
    q: 'How is the pharmacy quality controlled?',
    a: "Every lot is third-party tested for purity (HPLC) and identity (mass spec). We work only with 503A pharmacies that publish certificates of analysis and operate under state-board oversight. We will share lot-level documentation on request — transparency is not optional for us.",
  },
  {
    category: 'Safety',
    q: 'How are peptides shipped?',
    a: "Peptides are temperature-sensitive. Every shipment leaves the pharmacy in an insulated container with phase-change packs that hold temperature for at least 48 hours. You'll receive a tracking number, and shipments are signature-required for security.",
  },
  {
    category: 'Safety',
    q: 'What if I have a bad reaction?',
    a: "Stop dosing and contact your physician through the portal — they're available for clinical messages within one business day, and a same-day callback is available if it's urgent. For any reaction that feels like an emergency, call 911 or go to the nearest ER first, then notify us.",
  },
];
