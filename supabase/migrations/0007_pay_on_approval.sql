-- 0007 — pay-on-approval.
--
-- Orders are placed with no payment. When the prescriber signs, we email the
-- member a secure link to pay. These columns carry that link's state.

alter table orders
  add column if not exists pay_token        text,
  add column if not exists pay_token_expires timestamptz,
  add column if not exists paid_confirmed_at timestamptz;

-- The token is the credential in the pay link, so it must be unique and fast
-- to look up.
create unique index if not exists orders_pay_token_idx
  on orders(pay_token) where pay_token is not null;
