-- Export contractors CSV RPC
-- Returns headers even when no data exists (via a blank row)
create or replace function export_contractors_csv(company_uuid uuid)
returns table(
  name text,
  email text,
  phone text,
  ooh text,
  hourly_rate numeric,
  callout_fee numeric,
  notes text
)
language sql
as $$
  -- Map to maintenance_contractors schema
  select
    mc.contractor_name as name,
    mc.email,
    mc.phone,
    mc.emergency_phone as ooh,
    mc.hourly_rate,
    mc.callout_fee,
    mc.notes
  from public.maintenance_contractors mc
  where mc.company_id = company_uuid

  union all

  -- Always produce one blank row if no data exists, so CSV headers still appear
  select
    null::text as name,
    null::text as email,
    null::text as phone,
    null::text as ooh,
    null::numeric as hourly_rate,
    null::numeric as callout_fee,
    null::text as notes
  where not exists (
    select 1 from public.maintenance_contractors where company_id = company_uuid
  )

  order by name nulls last;
$$;