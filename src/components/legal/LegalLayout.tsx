import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { FadeIn } from '@/components/ui/FadeIn';

export interface LegalSection {
  /** Short heading shown both in the body and in the sidebar table of contents */
  heading: string;
  /** Paragraphs (in order). HTML is not interpreted — strings only. */
  paragraphs: string[];
  /** Optional bullet list rendered after the paragraphs */
  bullets?: string[];
}

export interface LegalLayoutProps {
  eyebrow: string;
  title: string;
  /** Last-updated date e.g. "May 2026" */
  effective: string;
  /** Short lead paragraph below the title */
  lead: string;
  sections: LegalSection[];
  /** Sibling legal pages for cross-linking at the bottom */
  related?: { label: string; href: string }[];
}

/**
 * Shared wrapper for /legal/* pages — header, footer, editorial article layout
 * with a sticky TOC on desktop. Content is data-driven; pass in sections and
 * we render headings + paragraphs consistently.
 */
export function LegalLayout({
  eyebrow,
  title,
  effective,
  lead,
  sections,
  related = [],
}: LegalLayoutProps) {
  // Generate stable anchor IDs for the TOC links
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  return (
    <>
      <Header />
      <main className="relative bg-background">
        {/* ============ HERO ============ */}
        <section className="relative px-6 pt-28 pb-12 md:pt-40 md:pb-16 overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-1/4 left-1/2 h-[40vh] w-[80vh] -translate-x-1/2 rounded-full bg-accent/[0.08] blur-[120px]"
          />
          <div className="relative mx-auto max-w-5xl">
            <FadeIn>
              <p className="mb-4 text-[11px] tracking-widest text-accent">
                {eyebrow}
              </p>
            </FadeIn>
            <FadeIn delay={100}>
              <h1
                className="mb-4 font-semibold tracking-tight text-foreground"
                style={{
                  fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)',
                  letterSpacing: '-0.025em',
                  lineHeight: 1,
                }}
              >
                {title}
              </h1>
            </FadeIn>
            <FadeIn delay={200}>
              <p className="mb-3 text-[11px] tracking-widest text-foreground/55">
                EFFECTIVE {effective.toUpperCase()}
              </p>
            </FadeIn>
            <FadeIn delay={280}>
              <p className="max-w-3xl text-base md:text-lg text-foreground/70 leading-relaxed">
                {lead}
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ============ ARTICLE ============ */}
        <section className="relative px-6 pb-24 md:pb-32">
          <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-[1fr_3fr] lg:gap-16">
            {/* === TOC === */}
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <p className="mb-4 text-[10px] tracking-widest text-foreground/50">
                  CONTENTS
                </p>
                <ol className="space-y-2 text-sm">
                  {sections.map((s, i) => (
                    <li key={s.heading}>
                      <a
                        href={`#${slug(s.heading)}`}
                        className="group flex items-start gap-3 text-foreground/65 hover:text-foreground transition-colors"
                      >
                        <span className="mt-0.5 text-[10px] tracking-widest text-accent">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="leading-snug">{s.heading}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>

            {/* === BODY === */}
            <article className="space-y-12">
              {sections.map((s, i) => (
                <FadeIn key={s.heading} delay={i * 60}>
                  <section id={slug(s.heading)} className="scroll-mt-28">
                    <div className="mb-3 text-[10px] tracking-widest text-accent">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <h2 className="mb-5 text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                      {s.heading}
                    </h2>
                    <div className="space-y-4 text-foreground/75 leading-relaxed text-base">
                      {s.paragraphs.map((p, j) => (
                        <p key={j}>{p}</p>
                      ))}
                      {s.bullets && s.bullets.length > 0 && (
                        <ul className="ml-1 mt-2 space-y-2">
                          {s.bullets.map((b, j) => (
                            <li key={j} className="flex items-start gap-3">
                              <span
                                aria-hidden
                                className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent"
                              />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                </FadeIn>
              ))}

              {/* Related links */}
              {related.length > 0 && (
                <FadeIn delay={400}>
                  <div className="mt-16 rounded-3xl border border-line bg-surface p-6 md:p-8">
                    <p className="mb-4 text-[10px] tracking-widest text-foreground/50">
                      RELATED DOCUMENTS
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {related.map((r) => (
                        <Link
                          key={r.href}
                          href={r.href}
                          className="group flex items-center justify-between rounded-2xl border border-line bg-background px-5 py-4 text-sm font-medium text-foreground/85 hover:border-accent/40 hover:text-foreground transition-all"
                        >
                          <span>{r.label}</span>
                          <span
                            aria-hidden
                            className="text-accent transition-transform duration-300 group-hover:translate-x-1"
                          >
                            →
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </FadeIn>
              )}

              <FadeIn delay={500}>
                <p className="pt-8 text-xs text-foreground/45 leading-relaxed">
                  Questions about this document? Email{' '}
                  <a
                    href="mailto:legal@eternallongevity.com"
                    className="text-accent hover:text-accent-soft"
                  >
                    legal@eternallongevity.com
                  </a>
                  . This page is for informational purposes and does not
                  constitute legal advice.
                </p>
              </FadeIn>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
