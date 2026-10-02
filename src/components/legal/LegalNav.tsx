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
    <nav aria-label="Legal documents" className="space-y-7 rounded-shell bg-milk p-4">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <p className="mb-2 px-3 pt-1 text-[13px] font-medium text-ink/65">{g.label}</p>
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
                        ? 'block rounded-full bg-white px-3 py-2 text-[14px] font-semibold text-ink shadow-[0_6px_18px_-10px_rgba(17,17,17,0.25)]'
                        : 'block rounded-full px-3 py-2 text-[14px] text-ink/65 transition-colors hover:bg-white/60 hover:text-ink'
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
