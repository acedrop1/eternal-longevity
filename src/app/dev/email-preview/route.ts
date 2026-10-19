import { notFound } from 'next/navigation';
import { EMAIL_TEMPLATES } from '@/lib/email-catalog';

/** Dev only: /dev/email-preview?id=<catalog id> renders one email from the admin catalog. */
export function GET(req: Request) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const id = new URL(req.url).searchParams.get('id');
  const t = EMAIL_TEMPLATES.find((e) => e.id === id);
  if (!t) return new Response(EMAIL_TEMPLATES.map((e) => e.id).join('\n'), { headers: { 'content-type': 'text/plain' } });
  return new Response(t.build().html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
