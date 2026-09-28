import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { LegalNav } from '@/components/legal/LegalNav';
import { ArrowDot } from '@/components/home/HomeSections';

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

const link = 'underline decoration-ink/30 underline-offset-[3px] transition-colors hover:decoration-ink';

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
      <main className="bg-white">
        {/* Top padding clears the fixed header + product strip. */}
        <section className="px-5 pb-16 pt-44 text-ink md:px-10 md:pb-24 md:pt-52">
          <div className="grid gap-10 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-16 xl:gap-24">
            <aside className="hidden lg:block lg:sticky lg:top-[166px] lg:self-start">
              <LegalNav />
            </aside>

            <article className="min-w-0 break-words">
              <header className="max-w-[68ch] pb-10 md:pb-12">
                <h1 className="text-[48px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[80px]">
                  {title}
                </h1>
                <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-milk px-3.5 py-1.5 text-[13px] font-medium text-ink/70">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-butter-deep" />
                  Effective {effective}
                </p>
                <p className="mt-6 text-[18px] leading-[1.6] text-ink-soft md:text-[20px]">{lead}</p>
              </header>

              <div className="max-w-[68ch] border-t border-ink/10">
                {sections.map((s) => (
                  <section key={s.heading} id={slug(s.heading)} className="scroll-mt-[170px] pt-10 md:pt-14">
                    <h2 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink [text-wrap:balance] md:text-[30px]">
                      {s.heading}
                    </h2>
                    <div className="mt-4 space-y-4 text-[16px] leading-[1.75] text-ink/80">
                      {s.paragraphs.map((p, j) => (
                        <p key={j}>{p}</p>
                      ))}
                      {s.bullets && s.bullets.length > 0 && (
                        <ul className="space-y-2.5">
                          {s.bullets.map((b, j) => (
                            <li key={j} className="relative pl-6">
                              <span aria-hidden className="absolute left-1 top-[0.72em] h-2 w-2 rounded-full bg-butter-deep" />
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
                <div className="mt-16 max-w-[68ch] rounded-shell bg-milk p-3 md:p-4">
                  <h2 className="px-3 pb-2 pt-2 text-[13px] font-medium text-ink/55">Related documents</h2>
                  <ul className="space-y-1">
                    {related.map((r) => (
                      <li key={r.href}>
                        <Link
                          href={r.href}
                          className="group flex min-h-[44px] items-center justify-between gap-4 rounded-inner px-3 py-3 text-[15px] font-semibold text-ink transition-colors hover:bg-white"
                        >
                          <span>{r.label}</span>
                          <ArrowDot className="h-7 w-7 bg-white ring-0 group-hover:bg-butter" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-10 max-w-[68ch] text-[13px] leading-relaxed text-ink/55">
                Questions about this document? Email{' '}
                <a href="mailto:support@etlongevity.com" className={`text-ink ${link}`}>
                  support@etlongevity.com
                </a>
                . This page is for informational purposes and does not constitute legal advice.
              </p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
