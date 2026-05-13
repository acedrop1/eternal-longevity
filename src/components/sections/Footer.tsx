import Link from 'next/link';

const COL_LINKS = [
  {
    title: 'Platform',
    links: [
      { label: 'Protocols', href: '/protocols' },
      { label: 'Science', href: '/science' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Start assessment', href: '/start' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Log in', href: '/login' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Telehealth Consent', href: '/legal/telehealth' },
      { label: 'Refund Policy', href: '/legal/refunds' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-background px-6 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <div className="mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="Eternal Longevity"
                className="h-9 w-auto"
                draggable={false}
              />
            </div>
            <p className="max-w-xs text-sm text-foreground/55 leading-relaxed">
              Physician-supervised peptide protocols. For performance,
              recovery, and longevity.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="pill glass text-[10px] tracking-widest text-foreground/70 px-3 py-1.5">
                LICENSED 503A PHARMACY
              </span>
              <span className="pill glass text-[10px] tracking-widest text-foreground/70 px-3 py-1.5">
                HIPAA COMPLIANT
              </span>
            </div>
          </div>

          {COL_LINKS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-[11px] tracking-widest text-foreground/50">
                {col.title.toUpperCase()}
              </h4>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-foreground/70 hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-foreground/40">
            © {new Date().getFullYear()} Eternal Longevity. All rights reserved.
          </p>
          <p className="max-w-2xl text-[11px] text-foreground/35 leading-relaxed md:text-right">
            Eternal Longevity provides telehealth services strictly for health
            optimization. Not a substitute for primary care. Final eligibility
            at the discretion of the overseeing physician. 18+.
          </p>
        </div>
      </div>
    </footer>
  );
}
