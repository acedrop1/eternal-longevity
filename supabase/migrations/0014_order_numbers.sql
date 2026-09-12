-- =============================================================================
-- 0014_order_numbers — order numbers a human can read out loud.
--
-- They were a base36 timestamp ("EL-MTXMTCH0"): unique, unguessable, and
-- useless on the phone to a pharmacy or a member. Numbering restarts at 110001
-- so the first real order is not obviously the first one ever placed, and the
-- sequence does the allocation because two checkouts in the same second must
-- never collide.
--
-- Existing EL- numbers are left exactly as they are. The column is text and
-- nothing parses it, so the two forms coexist.
-- =============================================================================

create sequence if not exists order_number_seq start with 110001;

create or replace function next_order_number()
returns text
language sql
security definer
set search_path = public
as $$
  select nextval('order_number_seq')::text;
$$;

revoke all on function next_order_number() from public, anon, authenticated;
