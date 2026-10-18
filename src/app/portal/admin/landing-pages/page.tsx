import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminPageHeader, SectionCard, StatusBadge } from '@/components/admin/IndexTable';
import { getSession, loginUrl } from '@/lib/auth-server';
import { LANDINGS, startHref } from '@/lib/landings';
import { getLandingStatus } from '@/lib/landing-status';
import { getLiveProducts } from '@/lib/catalog';
import { SITE_URL } from '@/lib/site';
import { PublishToggle } from './PublishToggle';

export const metadata: Metadata = { title: 'Landing pages' };
export const dynamic = 'force-dynamic';

/**
 * Admin → Landing pages: every ad landing page, its status, what its quiz
 * asks and which products it offers. /hair is the original the others are
 * built from. Publishing makes a page public; until then only admins see it.
 */
export default async function AdminLandingPagesPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const [status, live] = await Promise.all([getLandingStatus(), getLiveProducts()]);
  const name = new Map(live.map((p) => [p.id, p.name]));
  const base = SITE_URL.replace(/\/$/, '');

  const rows = [
    {
      slug: 'hair',
      title: 'Hair (the template)',
      headline: 'Regrow hair in as few as 3–6 months.¹',
      quiz: ['What are your hair goals?', 'How would you prefer to take it?', 'Are you interested in prescription-strength treatment?'],
      products: ['Finasteride + Minoxidil', 'Finasteride + Minoxidil Foam'],
      opens: '/start?category=hair',
      published: true,
      fixed: true,
    },
    ...LANDINGS.map((l) => ({
      slug: l.slug,
      title: l.title,
      headline: `${l.headline.lead} ${l.headline.swipe}`,
      quiz: l.quiz.map((q) => q.label),
      products: l.options.flatMap((o) => o.products.map((id) => name.get(id) ?? `${id} (not live)`)),
      opens: startHref(l),
      published: status[l.slug] === true,
      fixed: false,
    })),
  ];

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="space-y-5">
        <AdminPageHeader
          title="Landing pages"
          subtitle="Every ad landing page, built from the /hair template. Drafts are visible only to admins; publish one when its wording is approved."
        />
        <p className="rounded-inner bg-milk px-4 py-2.5 text-[14px] text-ink/75">
          Copy on these pages comes only from The Words for Ads (approved Oct 15) and the claims research. Make tagged links for any page in{' '}
          <Link href="/portal/admin/marketing" className="underline underline-offset-2">
            Marketing → Link builder
          </Link>
          . To add a page or change wording, ask Claude: each page is one entry in the template.
        </p>
        <SectionCard flush>
          <ul className="divide-y divide-ink/10">
            {rows.map((r) => (
              <li key={r.slug} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-ink">{r.title}</span>
                    <StatusBadge tone={r.published ? 'success' : 'neutral'}>{r.published ? 'Published' : 'Draft'}</StatusBadge>
                    <span className="text-[13px] text-ink/55">
                      {base.replace(/^https?:\/\//, '')}/{r.slug}
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] text-ink/85">“{r.headline}”</p>
                  <dl className="mt-2 grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-[110px_minmax(0,1fr)]">
                    <dt className="text-ink/55">Quiz</dt>
                    <dd className="text-ink/80">{r.quiz.join(' · ')}</dd>
                    <dt className="text-ink/55">Products</dt>
                    <dd className="text-ink/80">{r.products.join(' · ')}</dd>
                    <dt className="text-ink/55">Opens</dt>
                    <dd className="text-ink/80">{r.opens}</dd>
                  </dl>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Link
                    href={`/${r.slug}`}
                    target="_blank"
                    className="inline-flex min-h-[36px] items-center rounded-thumb bg-white px-3 text-[14px] font-semibold text-ink ring-1 ring-ink/15 hover:bg-milk"
                  >
                    {r.published ? 'View' : 'Preview'}
                  </Link>
                  {!r.fixed && <PublishToggle slug={r.slug} published={r.published} />}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </PortalShell>
  );
}
