import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { LegalNav } from '@/components/legal/LegalNav';

export interface LegalSection {
  /** Section heading; also slugified into the section's anchor id */
  heading: string;
  /** Paragraphs (in order). HTML is not interpreted. Strings only. */
  paragraphs: string[];
  /** Optional bullet list rendered after the paragraphs */
  bullets?: string[];
}

export interface LegalLayoutProps {
  title: string;
  /** Last-updated date e.g. "May 2026" */
  effective: string;
  /** Short lead paragraph below the title */
  lead: string;
  sections: LegalSection[];
  /** Sibling legal pages for cross-linking at the bottom */
  related?: { label: string; href: string }[];
}

const link = 'underline decoration-black/40 underline-offset-[3px] transition-colors hover:decoration-black';

/**
 * Shared wrapper for /legal/* pages: white editorial article at a reading
 * measure, with every legal document listed in a sticky sidebar on desktop.
 * Content is data-driven; pass in sections and we render them consistently.
 */
export function LegalLayout({ title, effective, lead, sections, related = [] }: LegalLayoutProps) {
  // Stable anchor ids, so deep links to a section keep working.
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  return (
    <>
      <Header categoryStrip />
      <main>
        {/* Top padding clears the fixed header + product strip (126 / 134px). */}
        <section className="bg-white px-5 pb-16 pt-[158px] text-black md:px-8 md:pb-24 md:pt-[182px]">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
            <aside className="hidden lg:block lg:sticky lg:top-[166px] lg:self-start">
              <LegalNav />
            </aside>

            <article className="min-w-0 break-words">
              <header className="max-w-[68ch] border-b border-black/15 pb-10 md:pb-12">
                <h1
                  className="font-display font-normal [text-wrap:balance]"
                  style={{ fontSize: 'clamp(2.4rem, 3.4vw + 1rem, 4.5rem)', fontStretch: '75%', lineHeight: 1 }}
                >
                  {title}
                </h1>
                <p className="mt-5 font-mono text-[13px] text-black/55">Effective {effective}</p>
                <p className="mt-6 text-[18px] leading-[1.6] text-black/70">{lead}</p>
              </header>

              <div className="max-w-[68ch]">
                {sections.map((s) => (
                  <section key={s.heading} id={slug(s.heading)} className="scroll-mt-[170px] pt-10 md:pt-12">
                    <h2
                      className="font-display font-normal [text-wrap:balance]"
                      style={{ fontSize: '1.9rem', fontStretch: '75%', lineHeight: 1.05 }}
                    >
                      {s.heading}
                    </h2>
                    <div className="mt-4 space-y-4 text-[16px] leading-[1.7] text-black/80">
                      {s.paragraphs.map((p, j) => (
                        <p key={j}>{p}</p>
                      ))}
                      {s.bullets && s.bullets.length > 0 && (
                        <ul className="list-disc space-y-2 pl-5 marker:text-black/35">
                          {s.bullets.map((b, j) => (
                            <li key={j} className="pl-1">
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                ))}
              </div>

              {related.length > 0 && (
                <div className="mt-14 max-w-[68ch] rounded-[4px] bg-[#F2F2F0] p-5 md:p-6">
                  <h2 className="font-mono text-[13px] text-black/55">Related documents</h2>
                  <ul className="mt-3 border-t border-black/15">
                    {related.map((r) => (
                      <li key={r.href} className="border-b border-black/15">
                        <Link
                          href={r.href}
                          className="group flex items-center justify-between gap-4 py-3.5 text-[15px] text-black/80 transition-colors hover:text-black"
                        >
                          <span>{r.label}</span>
                          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                            →
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-10 max-w-[68ch] text-[13px] leading-relaxed text-black/55">
                Questions about this document? Email{' '}
                <a href="mailto:support@etlongevity.com" className={`text-black ${link}`}>
                  support@etlongevity.com
                </a>
                . This page is for informational purposes and does not constitute legal advice.
              </p>
            </article>
          </div>
        </section>
      </main>
      <div className="bg-white">
        <Footer />
      </div>
    </>
  );
}
