-- Refresh contractors view to ensure contact_name is properly exposed
-- This forces PostgREST to refresh its schema cache

-- Drop and recreate the view to force schema refresh
DROP VIEW IF EXISTS public.contractors CASCADE;

CREATE VIEW public.contractors AS
SELECT 
  id,
  company_id,
  category,
  name,
  contact_name,  -- Ensure contact_name is explicitly included
  email,
  phone,
  emergency_phone AS ooh_phone,
  emergency_phone AS ooh,
  address,
  contract_start,
  contract_expiry,
  contract_file,
  notes,
  created_at,
  updated_at,
  true AS is_active,
  NULL::text AS region,
  NULL::text AS website,
  NULL::text AS postcode,
  NULL::numeric AS hourly_rate,
  NULL::numeric AS callout_fee
FROM public.maintenance_contractors;

-- Enable RLS on the view
ALTER VIEW public.contractors SET (security_invoker = true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractors TO authenticated;

-- Force PostgREST to refresh schema cache by querying the view
-- This is a workaround - PostgREST should pick up the change automatically
-- but sometimes needs a nudge
DO $$
BEGIN
  -- Query the view to ensure it's accessible
  PERFORM * FROM public.contractors LIMIT 1;
END $$;

