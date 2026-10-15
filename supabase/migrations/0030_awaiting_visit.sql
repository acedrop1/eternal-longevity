-- 0030: orders placed before the member has answered the health questions.
--
-- The assessment now asks only what picks a treatment (Hims order); the
-- medical questions come right after checkout, in the portal visit. Until
-- they are answered an order waits here: not with the prescriber, never
-- charged. Finishing the visit releases it to the prescriber ('assigned').
do $$
begin
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                 where t.typname = 'order_status' and e.enumlabel = 'awaiting-visit') then
    alter type order_status add value 'awaiting-visit';
  end if;
end $$;
