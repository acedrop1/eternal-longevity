import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminPageHeader, indexCard } from '@/components/admin/IndexTable';
import { getSession, loginUrl } from '@/lib/auth-server';
import { getCatalog } from '@/lib/catalog';
import { statusLabel } from '@/lib/orders';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { deletedOrders } from '@/lib/order-visibility';

export const metadata: Metadata = { title: 'Search' };
export const dynamic = 'force-dynamic';

type Hit = { href: string; title: string; detail?: string; meta?: string };

const usd = (cents: number | null) => `$${((cents ?? 0) / 100).toFixed(2)}`;
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

/**
 * Admin-wide search, Shopify style: one box, results grouped by what they
 * are. Members (name, email, phone), orders (number, member name or email,
 * product), products, messages and the admin's own pages.
 */
export default async function AdminSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const q = ((await searchParams).q ?? '').trim().slice(0, 80);
  // PostgREST filter syntax uses , ( ) and % – strip them so a query can't change the filter.
  const term = q.replace(/[,()%*\\]/g, ' ').trim();
  const digits = term.replace(/^#/, '').replace(/\D/g, '');
  const like = `%${term}%`;

  const groups: { label: string; hits: Hit[] }[] = [];

  if (term.length >= 2) {
    const pages: Hit[] = ADMIN_NAV.filter((n) => n.label.toLowerCase().includes(term.toLowerCase())).map((n) => ({
      href: n.href,
      title: n.label,
      detail: 'Admin page',
    }));

    const products: Hit[] = (await getCatalog())
      .filter((p) => `${p.name} ${p.id}`.toLowerCase().includes(term.toLowerCase()))
      .slice(0, 10)
      .map((p) => ({ href: `/portal/admin/products/${p.id}`, title: p.name, detail: p.status === 'live' ? 'Live' : 'Not live' }));

    let members: Hit[] = [];
    let orders: Hit[] = [];
    let messages: Hit[] = [];
    if (supabaseAdminConfigured()) {
      const db = createSupabaseAdminClient();
      const [m, o, oi, msg] = await Promise.all([
        db
          .from('profiles')
          .select('id, full_name, email, phone, role')
          .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
          .limit(10),
        db
          .from('orders')
          .select('order_number, status, total_cents, member_name, member_email, created_at')
          .or(
            [digits ? `order_number.ilike.%${digits}%` : '', `member_name.ilike.${like}`, `member_email.ilike.${like}`]
              .filter(Boolean)
              .join(','),
          )
          .order('created_at', { ascending: false })
          .limit(10),
        db.from('order_items').select('order_id').ilike('product_name', like).limit(25),
        db
          .from('messages')
          .select('id, thread_user_id, channel, body, created_at')
          .ilike('body', like)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      members = (m.data ?? []).map((p) => ({
        href: p.role === 'member' ? `/portal/admin/members/${p.id}` : '/portal/admin/members',
        title: p.full_name || p.email || 'Unnamed',
        detail: [p.email, p.phone].filter(Boolean).join(' · '),
        meta: p.role === 'member' ? undefined : p.role,
      }));

      // Orders that contain a matching product, beside those matched by number or member.
      const byProductIds = [...new Set((oi.data ?? []).map((i) => i.order_id))];
      const byProduct = byProductIds.length
        ? ((
            await db
              .from('orders')
              .select('order_number, status, total_cents, member_name, member_email, created_at')
              .in('id', byProductIds)
              .order('created_at', { ascending: false })
              .limit(10)
          ).data ?? [])
        : [];
      const seen = new Set<string>(await deletedOrders());
      orders = [...(o.data ?? []), ...byProduct]
        .filter((r) => !seen.has(r.order_number) && seen.add(r.order_number))
        .slice(0, 12)
        .map((r) => ({
          href: `/portal/admin/orders/${r.order_number}`,
          title: `Order #${r.order_number}`,
          detail: [r.member_name, r.member_email].filter(Boolean).join(' · '),
          meta: `${statusLabel(r.status)} · ${usd(r.total_cents)} · ${day(r.created_at)}`,
        }));

      // Messages: who they're with, and the line that matched.
      const threadIds = [...new Set((msg.data ?? []).map((r) => r.thread_user_id))];
      const names = threadIds.length
        ? Object.fromEntries(
            ((await db.from('profiles').select('id, full_name, email').in('id', threadIds)).data ?? []).map((p) => [
              p.id,
              p.full_name || p.email || 'Member',
            ]),
          )
        : {};
      messages = (msg.data ?? []).map((r) => ({
        href: `/portal/admin/members/${r.thread_user_id}`,
        title: `${names[r.thread_user_id] ?? 'Member'} · ${r.channel === 'doctor' ? 'Dr. Elder' : 'Care team'}`,
        detail: r.body.length > 140 ? `${r.body.slice(0, 140)}…` : r.body,
        meta: day(r.created_at),
      }));
    }

    groups.push(
      { label: 'Orders', hits: orders },
      { label: 'Members', hits: members },
      { label: 'Products', hits: products },
      { label: 'Messages', hits: messages },
      { label: 'Admin pages', hits: pages },
    );
  }

  const total = groups.reduce((n, g) => n + g.hits.length, 0);

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="space-y-5">
        <AdminPageHeader title="Search" subtitle="Orders, members, products, messages and admin pages." />
        <form action="/portal/admin/search" role="search" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            autoFocus={!q}
            placeholder="Order number, name, email, phone, product…"
            aria-label="Search the admin"
            className="h-12 min-w-0 flex-1 rounded-inner bg-white px-4 text-[16px] text-ink ring-1 ring-ink/15 placeholder:text-ink/50 focus:outline-none focus:ring-2 focus:ring-ink/30"
          />
          <button type="submit" className="h-12 flex-none rounded-full bg-ink px-5 text-[15px] font-semibold text-white hover:bg-ink/85">
            Search
          </button>
        </form>

        {q && term.length < 2 && <p className="text-[14px] text-ink/60">Type at least 2 characters.</p>}
        {term.length >= 2 && total === 0 && (
          <div className={`${indexCard} px-6 py-10 text-center text-[15px] text-ink/65`}>Nothing matches “{q}”.</div>
        )}

        {groups
          .filter((g) => g.hits.length)
          .map((g) => (
            <section key={g.label} className={indexCard}>
              <h2 className="border-b border-ink/10 px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink/60">
                {g.label} <span className="font-medium tabular-nums text-ink/45">{g.hits.length}</span>
              </h2>
              <ul>
                {g.hits.map((h, i) => (
                  <li key={`${h.href}-${i}`} className="border-b border-ink/[0.06] last:border-0">
                    <Link href={h.href} className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-milk/70">
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold text-ink">{h.title}</span>
                        {h.detail && <span className="mt-0.5 block truncate text-[13.5px] text-ink/65">{h.detail}</span>}
                      </span>
                      {h.meta && <span className="flex-none text-right text-[13px] tabular-nums text-ink/55">{h.meta}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </PortalShell>
  );
}
