'use client';

import { useState } from 'react';
import type { Cond, Field, Step } from '@/lib/intakeSchema';
import { FieldRenderer } from '@/components/intake/IntakeFields';

const conds = (c?: Cond | Cond[]) => (c ? (Array.isArray(c) ? c : [c]) : []);

/** Each screen as a card (data-shot = one screenshot), every field shown, with its rules spelled out. */
export function StepPreview({
  part,
  steps,
  labels,
  options,
  offset,
}: {
  part: string;
  steps: Step[];
  labels: Record<string, string>;
  /** field id → answer value → the wording the patient sees. */
  options: Record<string, Record<string, string>>;
  offset: number;
}) {
  const said = (field: string, values: string[]) =>
    values.filter(Boolean).map((v) => `“${options[field]?.[v] ?? v}”`).join(' or ') || 'left blank';
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const when = (c?: Cond | Cond[]) =>
    conds(c)
      .map((x) => `“${labels[x.field] ?? x.field}” is answered ${said(x.field, x.values)}`)
      .join(' and ');
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold">{part}</h2>
      {steps.map((st, i) => (
        <article key={st.id} data-shot={`${String(offset + i + 1).padStart(2, '0')} - ${st.heading}`} className="rounded-[20px] border border-ink/10 bg-white p-6">
          <p className="text-[12px] font-medium uppercase tracking-wide text-ink/55">
            Screen {offset + i + 1} · {st.eyebrow}
          </p>
          <h3 className="mt-1 text-[24px] font-semibold leading-tight tracking-[-0.02em]">{st.heading}</h3>
          {st.body && <p className="mt-2 text-[15px] leading-relaxed text-ink/70">{st.body}</p>}
          {(st.showIf || st.showIfAny) && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
              Only shown when {when(st.showIf) || conds(st.showIfAny).map((x) => `“${labels[x.field] ?? x.field}” is answered ${said(x.field, x.values)}`).join(', or ')}.
            </p>
          )}
          {st.disclaimers?.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-ink/70">
              {st.disclaimers.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : null}
          {st.kind === 'interstitial' && <p className="mt-3 text-[13px] italic text-ink/55">(Information screen, no questions.)</p>}
          <div className="mt-5 space-y-6">
            {st.fields.map((f: Field) => (
              <div key={f.id}>
                {f.label && <p className="mb-2 text-[16px] font-semibold">{f.label}{f.required ? ' *' : ''}</p>}
                {f.type === 'recommendation' ? (
                  <p className="rounded-lg bg-milk px-3 py-3 text-[14px] text-ink/70">
                    The physician-review options and plans for this treatment appear here (prices from the catalogue).
                  </p>
                ) : (
                  <FieldRenderer field={f} value={answers[f.id]} onChange={(v) => setAnswers((a) => ({ ...a, [f.id]: v }))} />
                )}
                <div className="mt-2 space-y-1 text-[12.5px]">
                  {f.showIf && <p className="text-amber-800">Only asked when {when(f.showIf)}.</p>}
                  {f.knockoutOn?.key === 'out_of_state' ? (
                    <p className="text-red-700">
                      Available in New Jersey, New York, Pennsylvania and Michigan. Any other state: “We’re not in your state yet”, no
                      assessment or order, but they can still create a free account and hear when we launch there.
                    </p>
                  ) : f.knockoutOn && (
                    <p className="text-red-700">
                      Stops the assessment (not eligible) if answered: {f.options?.filter((o) => f.knockoutOn!.values.includes(o.value)).map((o) => o.label).join(' / ') || f.knockoutOn.values.join(' / ')}.
                    </p>
                  )}
                  {f.flagOn?.length ? (
                    <p className="text-sky-800">
                      Flagged for physician review if: {f.options?.filter((o) => f.flagOn!.includes(o.value)).map((o) => o.label).join(' / ') || f.flagOn.join(' / ')}.
                    </p>
                  ) : null}
                  {f.why && <p className="text-ink/55">Why we ask: {f.why}</p>}
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
