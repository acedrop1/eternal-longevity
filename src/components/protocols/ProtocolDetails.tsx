'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Protocol } from '@/lib/protocols';

interface Props {
  protocol: Protocol;
}

/**
 * POUCH-style accordion: BENEFITS / DOSING / INGREDIENTS / DELIVERY rows
 * with smooth height transitions on open.
 */
export function ProtocolDetails({ protocol }: Props) {
  const [open, setOpen] = useState<string | null>('benefits');

  const sections = [
    {
      id: 'benefits',
      title: 'Benefits',
      content: (
        <ul className="space-y-2.5">
          {protocol.benefits.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm md:text-base text-foreground/75 leading-relaxed">
              <span className="mt-2 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'dosing',
      title: 'Dosing',
      content: (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-3 pr-4 text-left text-[10px] tracking-widest text-foreground/50 font-medium">PEPTIDE</th>
                <th className="py-3 pr-4 text-left text-[10px] tracking-widest text-foreground/50 font-medium">DOSE</th>
                <th className="py-3 pr-4 text-left text-[10px] tracking-widest text-foreground/50 font-medium">FREQUENCY</th>
                <th className="py-3 text-left text-[10px] tracking-widest text-foreground/50 font-medium">SUPPLY</th>
              </tr>
            </thead>
            <tbody>
              {protocol.dosing.map((d, i) => (
                <tr key={i} className={cn(i < protocol.dosing.length - 1 && 'border-b border-line')}>
                  <td className="py-4 pr-4 text-foreground/85 font-medium">{d.peptide}</td>
                  <td className="py-4 pr-4 text-foreground/70">{d.dose}</td>
                  <td className="py-4 pr-4 text-foreground/70">{d.frequency}</td>
                  <td className="py-4 text-foreground/70">{d.supply}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-foreground/45 leading-relaxed">
            Dosing is finalized by your physician based on your intake. The values above are typical for this protocol.
          </p>
        </div>
      ),
    },
    {
      id: 'ingredients',
      title: 'Ingredients',
      content: (
        <div className="flex flex-wrap gap-2">
          {protocol.ingredients.map((ing) => (
            <span
              key={ing}
              className="pill glass text-foreground/85 text-xs tracking-wider"
            >
              {ing}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: 'delivery',
      title: 'Delivery',
      content: (
        <div className="space-y-3 text-sm text-foreground/75 leading-relaxed">
          <p>
            Once a physician approves your protocol, your vials are compounded by a
            licensed 503A pharmacy and shipped directly to your door within 3–5
            business days. Each order arrives with dosing instructions, alcohol pads,
            syringes, and bacteriostatic water.
          </p>
          <p>
            On subscription plans, refills ship automatically before your supply
            runs out. Provider re-authorization is handled by our clinical team.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="border-t border-line">
      {sections.map((s) => {
        const isOpen = open === s.id;
        return (
          <div key={s.id} className="border-b border-line">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : s.id)}
              className="flex w-full items-center justify-between py-5 md:py-6 text-left group"
            >
              <span className="text-base md:text-lg font-semibold tracking-tight text-foreground">
                {s.title}
              </span>
              <span
                className={cn(
                  'grid h-7 w-7 place-items-center rounded-full bg-foreground/5 text-foreground/70 transition-transform duration-500 ease-out-expo',
                  isOpen ? 'rotate-45' : 'rotate-0'
                )}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
            </button>
            <div
              className="overflow-hidden transition-all duration-700 ease-out-expo"
              style={{
                maxHeight: isOpen ? '800px' : '0px',
                opacity: isOpen ? 1 : 0,
              }}
            >
              <div className="pb-6">{s.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
