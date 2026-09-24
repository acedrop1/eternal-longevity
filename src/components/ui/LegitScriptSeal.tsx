'use client';

import { useEffect, useRef, useState } from 'react';

const VERIFY_URL = 'https://www.legitscript.com/websites/?checker_keywords=etlongevity.com';

/**
 * LegitScript certification seal, exactly as issued by LegitScript
 * (certification@legitscript.com). Links to the site's verification page.
 * Kept at its native 73×79: LegitScript advises against scaling it, since it
 * becomes hard to read. A plain <img> (not next/image) so the seal is served
 * from LegitScript's own host, as their code specifies.
 *
 * If their image server doesn't return the seal (it can lag behind a new
 * certification), a text badge with the same verification link stands in, so
 * the page never shows a broken image. The real seal takes over once it loads.
 */
export function LegitScriptSeal({ className }: { className?: string }) {
  const img = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  // A server-rendered image can fail before React attaches onError; check once
  // on mount too.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <a
      href={VERIFY_URL}
      target="_blank"
      rel="noopener"
      title="Verify LegitScript Approval for www.etlongevity.com"
      className={className}
    >
      {failed ? (
        <span className="inline-flex items-center gap-2 rounded-[2px] bg-white px-3 py-2 font-mono text-[12px] leading-none text-black ring-1 ring-black/15">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          LegitScript certified · Verify
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={img}
          src="https://static.legitscript.com/seals/51875236.png"
          alt="Verify Approval for www.etlongevity.com"
          width={73}
          height={79}
          onError={() => setFailed(true)}
        />
      )}
    </a>
  );
}
