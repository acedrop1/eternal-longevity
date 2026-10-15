'use client';

import { useState, useTransition } from 'react';
import { SectionCard, fieldInput, fieldLabel, headerButton, secondaryButton } from '@/components/admin/IndexTable';
import { previewCustomEmailAction, sendCustomEmailAction } from '@/lib/admin-email-actions';
import { cn } from '@/lib/utils';

export interface TemplateView {
  id: string;
  audience: string;
  name: string;
  when: string;
  subject: string;
  html: string;
}

export interface SmsView {
  to: string;
  when: string;
  text: string;
  rule: string;
}

/** One email: name, when, subject; the rendered email opens on click. */
function TemplateRow({ t }: { t: TemplateView }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-t border-ink/10 first:border-t-0">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left hover:bg-milk/60">
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold text-ink">{t.name}</span>
          <span className="mt-0.5 block text-[13px] text-ink/65">{t.when}</span>
          <span className="mt-1 block truncate text-[13px] text-ink/80">
            <span className="text-ink/55">Subject:</span> {t.subject}
          </span>
        </span>
        <span className="flex-none text-[13px] font-medium text-ink/70">{open ? 'Hide' : 'Preview'}</span>
      </button>
      {open && (
        <div className="bg-milk px-4 pb-4">
          <iframe title={t.name} srcDoc={t.html} className="h-[640px] w-full rounded-inner bg-white ring-1 ring-ink/10" sandbox="" />
        </div>
      )}
    </li>
  );
}

function Composer() {
  const [to, setTo] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const doPreview = () =>
    start(async () => {
      const r = await previewCustomEmailAction({ name, subject, body });
      setPreview(r.html ?? null);
    });
  const doSend = () =>
    start(async () => {
      if (!window.confirm(`Send this email to ${to}?`)) return;
      const r = await sendCustomEmailAction({ to, name, subject, body });
      setResult(r);
      if (r.ok) {
        setTo('');
        setName('');
        setSubject('');
        setBody('');
        setPreview(null);
      }
    });

  return (
    <SectionCard title="Send a branded email" description="Same look as every email we send: logo, “Hi {first name},” and the team sign-off. Replies go to support@etlongevity.com.">
      <div className="grid gap-3 p-4 md:grid-cols-2">
        <label>
          <span className={fieldLabel}>To (email)</span>
          <input className={fieldInput} type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" />
        </label>
        <label>
          <span className={fieldLabel}>Their name (for “Hi …”)</span>
          <input className={fieldInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
        </label>
        <label className="md:col-span-2">
          <span className={fieldLabel}>Subject</span>
          <input className={fieldInput} value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="md:col-span-2">
          <span className={fieldLabel}>Message</span>
          <textarea
            className={cn(fieldInput, 'h-40 py-2 md:h-40')}
            value={body}
            maxLength={5000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message. Leave a blank line between paragraphs."
          />
        </label>
        <p className="text-[13px] text-ink/60 md:col-span-2">
          Never put health details in email: point people to their portal messages instead.
        </p>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          <button type="button" onClick={doPreview} disabled={pending} className={secondaryButton}>
            Preview
          </button>
          <button type="button" onClick={doSend} disabled={pending || !to || !subject || !body} className={cn(headerButton, 'disabled:opacity-50')}>
            {pending ? 'Working…' : 'Send email'}
          </button>
          {result && <span className={cn('text-[14px]', result.ok ? 'text-emerald-700' : 'text-red-600')}>{result.message}</span>}
        </div>
        {preview && (
          <iframe title="Preview" srcDoc={preview} className="h-[560px] w-full rounded-inner bg-white ring-1 ring-ink/10 md:col-span-2" sandbox="" />
        )}
      </div>
    </SectionCard>
  );
}

export function EmailsView({ templates, sms, emailOn }: { templates: TemplateView[]; sms: SmsView[]; emailOn: boolean }) {
  const groups = [...new Set(templates.map((t) => t.audience))];
  return (
    <div className="space-y-5">
      {!emailOn && (
        <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[14px] text-amber-900">
          Email isn’t connected on this server (no Resend key), so nothing will send from here.
        </p>
      )}
      <Composer />
      {groups.map((g) => {
        const list = templates.filter((t) => t.audience === g);
        return (
          <SectionCard key={g} title={`${g} emails`} description={`${list.length} templates. Click one to see exactly what it looks like.`} flush>
            <ul>
              {list.map((t) => (
                <TemplateRow key={t.id} t={t} />
              ))}
            </ul>
          </SectionCard>
        );
      })}
      <SectionCard title="Text messages" description="Sent through Twilio once the toll-free number is approved. Patients only get texts if they ticked the optional text box." flush>
        <ul>
          {sms.map((s) => (
            <li key={s.when + s.to} className="border-t border-ink/10 px-4 py-3 first:border-t-0">
              <p className="text-[14px] font-semibold text-ink">
                {s.to}: {s.when}
              </p>
              <p className="mt-1.5 max-w-xl rounded-inner bg-milk px-3 py-2 text-[14px] text-ink">{s.text}</p>
              {s.rule && <p className="mt-1 text-[13px] text-ink/60">{s.rule}</p>}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
