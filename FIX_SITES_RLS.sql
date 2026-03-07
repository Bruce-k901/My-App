-- Check and fix sites table RLS policies
-- Run this in Supabase SQL Editor

-- First, check if sites table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'sites'
);

-- Check current RLS policies on sites
SELECT * FROM pg_policies WHERE tablename = 'sites';

-- Enable RLS if not already enabled
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "company_members_can_view_sites" ON public.sites;
DROP POLICY IF EXISTS "company_members_can_manage_sites" ON public.sites;

-- Allow company members to view their company's sites
CREATE POLICY "company_members_can_view_sites"
ON public.sites FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow managers/admins to manage sites
CREATE POLICY "company_members_can_manage_sites"
ON public.sites FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM public.profiles 
    WHERE id = auth.uid() 
    AND app_role IN ('Admin', 'Owner', 'Manager', 'Area Manager', 'Ops Manager')
  )
);

-- Test query (replace with your actual company_id)
-- SELECT id, name, address FROM public.sites 
-- WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91';

-- If no sites exist, you may need to create some test data:
-- INSERT INTO public.sites (company_id, name, address)
-- VALUES 
--   ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Main Kitchen', '{"line1": "123 High Street", "city": "London", "postcode": "SW1A 1AA"}'::jsonb),
--   ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Cafe Branch', '{"line1": "45 Market Street", "city": "Manchester", "postcode": "M1 2AB"}'::jsonb);
