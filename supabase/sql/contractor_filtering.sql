-- Phase 1: Backend Query Logic for Region + Category-based Contractor Selection
-- This file contains RPC functions for filtering contractors based on asset region and category

-- Function 1: Get contractors for a specific asset
-- Returns contractors that match the asset's category and site region
-- Updated to include the new 'type' column
create or replace function get_contractors_for_asset(
  asset_id uuid
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
    and c.is_active = true
  order by c.name;
$$;

-- Function 2: Get contractors for a specific site and category combination
-- Used for dynamic filtering when site or category changes in the modal
-- Updated to include the new 'type' column
create or replace function get_contractors_for_site_and_category(
  site_id uuid,
  category text
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
  where s.id = site_id 
    and lower(trim(c.category)) = lower(trim(category))
    and c.is_active = true
  order by c.name;
$$;

-- Function 3: Get all contractors for a company (fallback when no region/category match)
-- This provides a fallback option when strict filtering returns no results
-- Updated to include the new 'type' column
create or replace function get_company_contractors(
  company_id uuid
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
  where c.company_id = company_id
    and c.is_active = true
  order by c.name;
$$;

-- Function 4: Validate contractor selection for an asset
-- Ensures selected contractors are valid for the asset's region and category
create or replace function validate_asset_contractors(
  asset_id uuid,
  ppm_contractor_id uuid default null,
  reactive_contractor_id uuid default null,
  warranty_contractor_id uuid default null
)
returns table (
  is_valid boolean,
  error_message text
)
language plpgsql
as $$
declare
  asset_record record;
  site_record record;
  contractor_record record;
begin
  -- Get asset and site information
  select a.*, s.region as site_region
  into asset_record
  from assets a
  join sites s on s.id = a.site_id
  where a.id = asset_id;
  
  if not found then
    return query select false, 'Asset not found'::text;
    return;
  end if;
  
  -- Validate PPM contractor
  if ppm_contractor_id is not null then
    select * into contractor_record
    from contractors c
    where c.id = ppm_contractor_id
      and c.company_id = asset_record.company_id
      and lower(trim(c.category)) = lower(trim(asset_record.category))
      and lower(trim(c.region)) = lower(trim(asset_record.site_region))
      and c.is_active = true;
      
    if not found then
      return query select false, 'PPM contractor is not valid for this asset region/category'::text;
      return;
    end if;
  end if;
  
  -- Validate reactive contractor
  if reactive_contractor_id is not null then
    select * into contractor_record
    from contractors c
    where c.id = reactive_contractor_id
      and c.company_id = asset_record.company_id
      and lower(trim(c.category)) = lower(trim(asset_record.category))
      and lower(trim(c.region)) = lower(trim(asset_record.site_region))
      and c.is_active = true;
      
    if not found then
      return query select false, 'Reactive contractor is not valid for this asset region/category'::text;
      return;
    end if;
  end if;
  
  -- Validate warranty contractor
  if warranty_contractor_id is not null then
    select * into contractor_record
    from contractors c
    where c.id = warranty_contractor_id
      and c.company_id = asset_record.company_id
      and lower(trim(c.category)) = lower(trim(asset_record.category))
      and lower(trim(c.region)) = lower(trim(asset_record.site_region))
      and c.is_active = true;
      
    if not found then
      return query select false, 'Warranty contractor is not valid for this asset region/category'::text;
      return;
    end if;
  end if;
  
  -- All validations passed
  return query select true, 'All contractors are valid'::text;
end;
$$;

-- Function 5: Get contractors filtered by type for a specific site and category
-- Used for type-specific dropdown filtering (PPM, Reactive, Warranty)
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
  where s.id = site_id 
    and lower(trim(c.category)) = lower(trim(category))
    and lower(trim(c.type)) = lower(trim(contractor_type))
    and c.is_active = true
  order by c.name;
$$;

-- Function 6: Get contractors by type for a specific asset
-- Returns contractors that match the asset's category, site region, and type
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

-- Grant execute permissions to authenticated users
grant execute on function get_contractors_for_asset(uuid) to authenticated;
grant execute on function get_contractors_for_site_and_category(uuid, text) to authenticated;
grant execute on function get_company_contractors(uuid) to authenticated;
grant execute on function validate_asset_contractors(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function get_contractors_by_type(uuid, text, text) to authenticated;
grant execute on function get_contractors_for_asset_by_type(uuid, text) to authenticated;