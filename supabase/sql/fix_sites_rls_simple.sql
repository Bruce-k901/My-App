-- Simple Fix for Sites RLS Access
-- This ensures users can access sites from their company by checking both id and auth_user_id

-- Drop all existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sites'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.sites', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Create simple SELECT policy that checks company_id
-- This works by checking if the user's profile has a matching company_id
CREATE POLICY sites_select_by_company ON public.sites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND company_id = sites.company_id
    )
  );

-- Create INSERT policy
CREATE POLICY sites_insert_by_company ON public.sites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND company_id = sites.company_id
    )
  );

-- Create UPDATE policy
CREATE POLICY sites_update_by_company ON public.sites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND company_id = sites.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND company_id = sites.company_id
    )
  );

-- Create DELETE policy (admins/owners only)
CREATE POLICY sites_delete_by_company ON public.sites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND company_id = sites.company_id
        AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;

-- Verify policies
SELECT 
  policyname,
  cmd,
  'Policy created' as status
FROM pg_policies
WHERE tablename = 'sites'
ORDER BY policyname;

