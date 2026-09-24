import Link from 'next/link';
import { Plus } from 'lucide-react';
import { FAQS, withPrices } from '@/lib/faq';
import { getLiveProducts } from '@/lib/catalog';

/** Homepage FAQ: a short pick from the full list, which lives at /faq. */
const PICK = [
  'How does Eternal Longevity work?',
  'Which states do you ship to?',
  'Is there an age requirement?',
  'Are these peptides FDA-approved?',
  'How are peptides shipped?',
  'What is your refund policy?',
];

export async function HomeFAQ() {
  const faqs = withPrices(FAQS, await getLiveProducts());
  const ITEMS = PICK.map((q) => faqs.find((f) => f.q === q)).filter((f) => f !== undefined);
  return (
    <section className="bg-white px-5 py-16 text-black md:px-8 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <h2
            className="font-display font-normal"
            style={{ fontSize: 'clamp(2rem, 3vw + 1rem, 3.75rem)', fontStretch: '75%', lineHeight: 1 }}
          >
            Questions, answered.
          </h2>
          <Link
            href="/faq"
            className="mt-6 inline-block font-mono text-[13px] underline decoration-black/50 underline-offset-[3px] transition-colors hover:decoration-black"
          >
            All FAQs
          </Link>
        </div>

        <div className="border-t border-black/15">
          {ITEMS.map((f) => (
            <details key={f.q} name="home-faq" className="group border-b border-black/15">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] md:text-[19px] [&::-webkit-details-marker]:hidden">
                {f.q}
                <Plus className="h-5 w-5 shrink-0 transition-transform duration-300 group-open:rotate-45" strokeWidth={1.75} />
              </summary>
              <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-black/70">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
