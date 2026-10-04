-- =============================================================================
-- 0025_order_costs — what each paid order cost us, frozen when it was paid.
--
-- ADMIN ONLY (lib/profit, lib/profit-data). One row per order:
--   cost_cents           product cost: units per 30 days × months × unit cost
--                        (Admin → Products "Your cost"), at payment time
--   shipping_cost_cents  what the pharmacy charges us to ship it (lib/shipping SHIPPING_COST)
--   stripe_fee_cents     Stripe's fee from the charge's balance transaction
--                        (0 on a $0 order); may land a moment after payment
--   refunded_cents       what Stripe has refunded on the charge so far
-- No row, or a null column = not written (older orders, or before this ran):
-- the app estimates those at read time and labels them "est.".
--
-- Why a table and not columns on `orders`: RLS lets a member read their own
-- order rows and the prescriber (is_clinical) read every order row, column by
-- column, straight through the Supabase API with their own login. Costs on
-- `orders` would be readable by both. This table has RLS on and no policies,
-- so only the service role (the server) can read or write it.
--
-- Safe to re-run.
--
-- Verify after running:
--   select column_name, data_type, is_nullable, column_default
--   from information_schema.columns where table_name = 'order_costs' order by ordinal_position;
--   -- expect order_id uuid, cost_cents / shipping_cost_cents / stripe_fee_cents integer null,
--   -- refunded_cents integer not null default 0, updated_at timestamptz
--
--   select relrowsecurity from pg_class where relname = 'order_costs';           -- expect true
--   select count(*) from pg_policies where tablename = 'order_costs';            -- expect 0
--   select grantee, privilege_type from information_schema.role_table_grants
--   where table_name = 'order_costs' and grantee in ('anon', 'authenticated');   -- expect no rows
--
--   -- After the next paid order:
--   select o.order_number, c.* from order_costs c join orders o on o.id = c.order_id
--   order by c.updated_at desc limit 5;
-- =============================================================================

create table if not exists order_costs (
  order_id            uuid primary key references orders(id) on delete cascade,
  cost_cents          integer,
  shipping_cost_cents integer,
  stripe_fee_cents    integer,
  refunded_cents      integer not null default 0,
  updated_at          timestamptz not null default now()
);

alter table order_costs enable row level security;
-- No policies: service role only. Belt and braces on the table grants too.
revoke all on order_costs from anon, authenticated;

drop trigger if exists order_costs_updated_at on order_costs;
create trigger order_costs_updated_at before update on order_costs
  for each row execute function set_updated_at();

-- Make PostgREST see the new table straight away.
notify pgrst, 'reload schema';
