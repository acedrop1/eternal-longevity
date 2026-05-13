'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Protocol } from '@/lib/protocols';

type Plan = 'monthly' | 'quarterly' | 'annual';

interface Props {
  protocol: Protocol;
}

/**
 * POUCH-style purchase-options card. Three tabs (Monthly / 3-Month / Annual)
 * with savings called out on the longer commitments. CTA is "Start Your
 * Assessment" because we are consultation-first — the actual checkout
 * happens in the member portal after physician approval.
 */
export function ProtocolPricing({ protocol }: Props) {
  const [plan, setPlan] = useState<Plan>('monthly');

  const { monthly, quarterly, annual } = protocol.pricing;
  const quarterlyMonthly = quarterly / 3;
  const annualMonthly = annual / 12;

  const monthlySavingsQ = Math.round(((monthly - quarterlyMonthly) / monthly) * 100);
  const monthlySavingsA = Math.round(((monthly - annualMonthly) / monthly) * 100);

  const plans = [
    { id: 'monthly' as Plan, label: 'Monthly', perMo: monthly, total: monthly, savings: 0 },
    { id: 'quarterly' as Plan, label: '3-Month', perMo: quarterlyMonthly, total: quarterly, savings: monthlySavingsQ },
    { id: 'annual' as Plan, label: 'Annual', perMo: annualMonthly, total: annual, savings: monthlySavingsA },
  ];

  return (
    <div>
      {/* Tab pills */}
      <div className="mb-4 inline-flex items-center gap-1 rounded-full glass p-1">
        {plans.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlan(p.id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs tracking-wider transition-colors duration-300',
              plan === p.id
                ? 'bg-foreground text-background font-semibold'
                : 'text-foreground/70 hover:text-foreground'
            )}
          >
            {p.label}
            {p.savings > 0 && plan !== p.id && (
              <span className="ml-1.5 text-accent text-[10px]">−{p.savings}%</span>
            )}
          </button>
        ))}
      </div>

      {/* Plan cards — two side-by-side: this plan + as-needed reorder. Mirrors
          POUCH's One-Time vs Subscribe layout, adapted to our model. */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* SUBSCRIBE — active plan */}
        <div
          className="relative rounded-2xl p-5 border-2 border-accent"
          style={{ background: 'rgba(213,168,80,0.06)' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] tracking-widest text-accent font-semibold">
              SUBSCRIBE &amp; SAVE
            </span>
            {plans.find((p) => p.id === plan)?.savings ? (
              <span className="text-[10px] tracking-widest text-accent">
                −{plans.find((p) => p.id === plan)?.savings}%
              </span>
            ) : null}
          </div>
          <div className="mb-1">
            <span className="text-3xl font-bold text-foreground">
              ${Math.round(plans.find((p) => p.id === plan)!.perMo)}
            </span>
            <span className="text-foreground/60 text-sm ml-1">/month</span>
          </div>
          <p className="text-xs text-foreground/55 leading-relaxed">
            {plan === 'monthly' && 'Billed monthly. Cancel anytime.'}
            {plan === 'quarterly' && `Billed quarterly ($${quarterly} every 3 months).`}
            {plan === 'annual' && `Billed annually ($${annual}/year — best value).`}
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-foreground/75">
            <li>✓ Compounded vials shipped on cadence</li>
            <li>✓ Dosing kit + instructions included</li>
            <li>✓ Clinical liaison messaging</li>
            <li>✓ Provider re-authorization handled for you</li>
          </ul>
        </div>

        {/* AS-NEEDED — single cycle */}
        <div className="relative rounded-2xl border border-line bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] tracking-widest text-foreground/60">
              SINGLE CYCLE
            </span>
          </div>
          <div className="mb-1">
            <span className="text-3xl font-bold text-foreground/85">
              ${monthly}
            </span>
            <span className="text-foreground/50 text-sm ml-1">one cycle</span>
          </div>
          <p className="text-xs text-foreground/55 leading-relaxed">
            Try the protocol for one 3-month cycle. No subscription.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-foreground/60">
            <li>✓ Same compounding standards</li>
            <li>✓ Physician approval required</li>
            <li>✓ Renew manually when ready</li>
          </ul>
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/start"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent text-black px-6 py-4 text-base font-semibold hover:bg-accent-soft transition-colors"
      >
        Start Your Assessment
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
      <p className="mt-3 text-center text-[11px] text-foreground/45 leading-relaxed">
        Final eligibility at the discretion of the overseeing physician. You won&apos;t
        be charged until your protocol is approved.
      </p>
    </div>
  );
}
