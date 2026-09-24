-- =============================================================================
-- 0015_products — the product catalogue, editable from Admin → Products.
--
-- One row per product the admin has edited or created. The app's seed file
-- (src/lib/shopProducts.ts) is the base; a row here is laid over its seed
-- product field by field, and a row whose id the seed doesn't know is a new
-- product. With no rows the catalogue is exactly the seed, so applying this
-- migration changes nothing on the site by itself.
--
-- status is the compliance gate: only 'live' products are listed, linked,
-- indexed or orderable. Every change is also written to audit_log by the app.
-- =============================================================================

create table if not exists products (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status      text not null default 'draft' check (status in ('draft', 'live', 'withheld')),
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- Read and written only by the server through the service role. No policies
-- means the anon and authenticated roles can neither read nor write it.
alter table products enable row level security;

-- Product photos. Public, because product pages show them to anyone; uploads
-- go through the service role only.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
