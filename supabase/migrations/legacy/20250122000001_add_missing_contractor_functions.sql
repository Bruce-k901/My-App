-- Add only the missing contractor RPC functions
-- This migration adds only the functions that don't exist yet

-- Function: Get contractors by type for a specific asset
create or replace function get_contractors_for_asset_by_type(
  asset_id uuid,
  contractor_type text
)
returns table (
  id uuid,
  name text,
  category text,
  region text,
  type text,
  email text,
  phone text,
  callout_fee numeric,
  hourly_rate numeric
)
language sql
as $$
  select 
    c.id, 
    c.name, 
    c.category, 
    c.region, 
    c.type,
    c.email, 
    c.phone, 
    c.callout_fee, 
    c.hourly_rate
  from contractors c
  join assets a on a.company_id = c.company_id
  join sites s on s.id = a.site_id
  where a.id = asset_id
    and lower(trim(c.category)) = lower(trim(a.category))
    and lower(trim(c.region)) = lower(trim(s.region))
    and lower(trim(c.type)) = lower(trim(contractor_type))
    and c.is_active = true
  order by c.name;
$$;

-- Function: Get contractors by type for a specific site and category
create or replace function get_contractors_by_type(
  site_id uuid,
  category text,
  contractor_type text
)
returns table (
  id uuid,
  name text,
  category text,
  region text,
  type text,
  email text,
  phone text,
  callout_fee numeric,
  hourly_rate numeric,
  company_id uuid
)
language sql
as $$
  select 
    c.id,
    c.name,
    c.category,
    c.region,
    c.type,
    c.email,
    c.phone,
    c.callout_fee,
    c.hourly_rate,
    c.company_id
  from contractors c
  join sites s on lower(trim(c.region)) = lower(trim(s.region))
  where s.id = get_contractors_by_type.site_id 
    and lower(trim(c.category)) = lower(trim(category))
    and lower(trim(c.type)) = lower(trim(contractor_type))
    and c.is_active = true
  order by c.name;
$$;

-- Grant execute permissions to authenticated users
grant execute on function get_contractors_for_asset_by_type(uuid, text) to authenticated;
grant execute on function get_contractors_by_type(uuid, text, text) to authenticated;
