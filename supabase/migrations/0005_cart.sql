-- Eternal Longevity — migration 0005: server-side cart
--
-- Addresses and payment methods already have tables and owner-scoped RLS, so
-- the member profile only needed wiring, not schema. The cart did not exist
-- server-side at all — it lived in each browser's localStorage, so a member
-- who switched devices lost it.
--
-- A cart is a handful of {productId, cadence, quantity} rows that are always
-- read and written together, so it lives as jsonb on the profile rather than
-- as its own table: no extra joins, no extra RLS surface, and the existing
-- "profiles: update own or admin" policy already covers it.
--
-- Safe to re-run.

alter table profiles
  add column if not exists cart jsonb not null default '[]'::jsonb;

comment on column profiles.cart is
  'Member cart: [{ productId, cadence, quantity, addedAt }]. Written by the '
  'cart provider; cleared on successful checkout.';
