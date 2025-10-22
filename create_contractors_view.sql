-- Run this SQL in your Supabase dashboard SQL editor
-- This creates a contractors view that maps to the maintenance_contractors table
-- This will fix the "No contractors found" issue

create or replace view public.contractors as
select 
  id,
  company_id,
  category,
  name,
  contact_name,
  email,
  phone,
  emergency_phone as ooh_phone,
  emergency_phone as ooh,
  address,
  contract_start,
  contract_expiry,
  contract_file,
  notes,
  created_at,
  updated_at,
  true as is_active,  -- Add is_active field that some queries expect
  null::text as region,  -- Add region field that some queries expect
  null::text as website,  -- Add website field that some queries expect
  null::text as postcode,  -- Add postcode field that some queries expect
  null::numeric as hourly_rate,  -- Add hourly_rate field that some queries expect
  null::numeric as callout_fee  -- Add callout_fee field that some queries expect
from public.maintenance_contractors;

-- Enable RLS on the view (inherits from maintenance_contractors policies)
alter view public.contractors set (security_invoker = true);

-- Grant permissions
grant select, insert, update, delete on public.contractors to authenticated;