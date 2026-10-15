import { SectionCard, StatusBadge } from '@/components/admin/IndexTable';
import { formatDateTime } from '@/lib/format';
import type { LoggedMessage } from '@/lib/message-log';

/** Every email and text sent to this person (lib/message-log), newest first. Click one to read it. */
export function MessageLog({ messages, description }: { messages: LoggedMessage[]; description: string }) {
  return (
    <SectionCard title="Emails & texts sent" description={description} flush>
      {messages.length === 0 ? (
        <p className="px-4 py-3.5 text-[14px] text-ink/60">Nothing sent yet. Recording started Oct 15, 2026.</p>
      ) : (
        <ul className="max-h-[70vh] divide-y divide-ink/10 overflow-auto">
          {messages.map((m) => (
            <li key={m.id}>
              <details className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusBadge tone={m.channel === 'sms' ? 'info' : 'neutral'}>{m.channel === 'sms' ? 'Text' : 'Email'}</StatusBadge>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
                    {m.subject ?? m.body?.slice(0, 80)}
                  </span>
                  {!m.sent && <StatusBadge tone="critical">Failed</StatusBadge>}
                  <span className="text-[13px] tabular-nums text-ink/60">{formatDateTime(m.at)}</span>
                </summary>
                <div className="mt-2 space-y-1.5">
                  <p className="text-[13px] text-ink/60">To {m.to}</p>
                  {m.error && <p className="text-[13px] text-red-700">Error: {m.error}</p>}
                  <p className="whitespace-pre-line rounded-inner bg-milk px-3 py-2 text-[13px] leading-relaxed text-ink/85">{m.body}</p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
