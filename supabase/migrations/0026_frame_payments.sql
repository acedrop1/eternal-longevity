-- =============================================================================
-- 0026_frame_payments — cards and charges move from Stripe to Frame.
--
-- Stripe closed the account on 2026-10-07. The stripe_* columns stay, read
-- only, for the history already in them; everything new is written here.
--
--   profiles.frame_account_id         the member's Frame Account (one each)
--   profiles.frame_payment_method_id  the card we charge. Frame has no
--                                     "default card", so we keep it
--   orders.frame_transfer_id          the charge for this order. Written
--                                     BEFORE the charge is confirmed: Frame
--                                     has no idempotency key, so a retry
--                                     reads this back instead of charging twice
--   order_costs.stripe_fee_cents  →   processor_fee_cents (Frame's fee now)
--
-- Members cannot write any of these: profiles_member_write_guard (0024) is an
-- allowlist of the columns a member may change, so new columns are locked by
-- default, and members have no write path to orders or order_costs.
--
-- Safe to re-run.
--
-- Verify after running:
--   select column_name from information_schema.columns
--   where table_name = 'profiles' and column_name like 'frame_%';      -- 2 rows
--   select column_name from information_schema.columns
--   where table_name = 'orders' and column_name = 'frame_transfer_id'; -- 1 row
--   select column_name from information_schema.columns
--   where table_name = 'order_costs' and column_name like '%fee%';     -- processor_fee_cents
-- =============================================================================

alter table profiles add column if not exists frame_account_id text;
alter table profiles add column if not exists frame_payment_method_id text;
create unique index if not exists profiles_frame_account_id_key
  on profiles (frame_account_id) where frame_account_id is not null;

alter table orders add column if not exists frame_transfer_id text;
create unique index if not exists orders_frame_transfer_id_key
  on orders (frame_transfer_id) where frame_transfer_id is not null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'order_costs' and column_name = 'stripe_fee_cents'
  ) then
    alter table order_costs rename column stripe_fee_cents to processor_fee_cents;
  end if;
end $$;
