-- =============================================================================
-- 0022_promo_free_shipping — a promo code can also waive shipping.
--
-- includes_shipping = true: the code's discount applies to the items as before
-- and the order's shipping is waived too. The waived shipping is recorded in
-- orders.discount_cents, so subtotal + shipping - discount = total still holds
-- on every receipt.
--
-- Safe to re-run.
--
-- Verify after running:
--   select column_name, data_type, column_default from information_schema.columns
--   where table_name = 'promo_codes' and column_name = 'includes_shipping';
--   -- expect one row: boolean, false
-- =============================================================================

alter table promo_codes
  add column if not exists includes_shipping boolean not null default false;
