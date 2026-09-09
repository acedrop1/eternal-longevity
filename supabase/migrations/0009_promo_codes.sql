-- Eternal Longevity — migration 0009: promotion codes
--
-- Discounts are applied to the order total before the PaymentIntent is
-- created, so Stripe simply charges the reduced amount. That is deliberate:
-- Stripe's own coupons only auto-apply to Checkout Sessions and Subscriptions,
-- and the first charge here is a bare PaymentIntent minted from a pay link
-- after a prescriber approves. A Stripe coupon would silently do nothing.
--
-- The code is redeemed at the moment the order is placed, not at payment, so
-- a limited code cannot be spent twice by opening two tabs.
--
-- Safe to re-run.

create table if not exists promo_codes (
  id            uuid primary key default gen_random_uuid(),
  -- Stored uppercase; lookups uppercase the input so codes are case-blind.
  code          text unique not null,
  -- 'percent' takes `value` as 1-100. 'fixed' takes it as cents.
  kind          text not null default 'percent'
                  check (kind in ('percent', 'fixed')),
  value         integer not null check (value > 0),
  -- Null means unlimited. redeemed_count never exceeds max_redemptions.
  max_redemptions integer,
  redeemed_count  integer not null default 0,
  expires_at    timestamptz,
  active        boolean not null default true,
  note          text,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

comment on table promo_codes is
  'Discount codes applied to the order total before the PaymentIntent is '
  'created. Stripe charges the already-reduced amount.';

create index if not exists promo_codes_active_idx
  on promo_codes (code) where active;

-- What the order actually got, recorded on the order itself so a refund or a
-- dispute can be reconciled without re-deriving the discount from a code that
-- may since have changed.
alter table orders
  add column if not exists promo_code      text,
  add column if not exists discount_cents  integer not null default 0;

comment on column orders.discount_cents is
  'Amount taken off this order by promo_code, in cents. Already reflected in '
  'total_cents.';

alter table promo_codes enable row level security;

-- Only staff touch these directly; members never read the table. Validation
-- and redemption both run through server actions on the service-role client.
drop policy if exists "promo_codes: admin only" on promo_codes;
create policy "promo_codes: admin only" on promo_codes
  for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
