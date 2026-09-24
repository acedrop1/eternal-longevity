'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { footerLinks } from '@/components/ui/footer-section';

// Same two lists as the footer's Legal + Medical & Safety columns.
const GROUPS = footerLinks.filter((g) => g.label === 'Legal' || g.label === 'Medical & Safety');

/** Desktop sidebar: every legal document, current page highlighted. */
export function LegalNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Legal documents" className="space-y-8">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <p className="mb-3 font-mono text-[13px] text-black/55">{g.label}</p>
          <ul className="space-y-0.5">
            {g.links.map((l) => {
              const current = pathname === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={current ? 'page' : undefined}
                    className={
                      current
                        ? 'block rounded-[2px] bg-[#F2F2F0] px-3 py-1.5 text-[14px] text-black'
                        : 'block rounded-[2px] px-3 py-1.5 text-[14px] text-black/60 transition-colors hover:text-black'
                    }
                  >
                    {l.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
