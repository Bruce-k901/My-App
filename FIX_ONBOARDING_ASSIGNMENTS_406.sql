-- =====================================================
-- FIX: 406 Error on employee_onboarding_assignments
-- =====================================================
-- The 406 error often means conflicting RLS policies or 
-- PostgREST cache issues

-- Step 1: Drop all existing policies on employee_onboarding_assignments
DROP POLICY IF EXISTS onboarding_assignments_select_company_or_own ON public.employee_onboarding_assignments;
DROP POLICY IF EXISTS onboarding_assignments_insert_company_admin ON public.employee_onboarding_assignments;
DROP POLICY IF EXISTS public_can_read_onboarding_assignments ON public.employee_onboarding_assignments;
DROP POLICY IF EXISTS allow_public_read_onboarding_assignments ON public.employee_onboarding_assignments;
DROP POLICY IF EXISTS allow_public_insert_onboarding_assignments ON public.employee_onboarding_assignments;
DROP POLICY IF EXISTS allow_company_users_insert_onboarding_assignments ON public.employee_onboarding_assignments;
DROP POLICY IF EXISTS allow_company_users_update_onboarding_assignments ON public.employee_onboarding_assignments;

-- Step 2: Create a single, simple public read policy for onboarding portal
CREATE POLICY "allow_public_read_onboarding_assignments"
ON public.employee_onboarding_assignments
FOR SELECT
TO anon, authenticated
USING (true);

-- Step 2b: Allow anonymous users to INSERT assignments (for auto-creation during onboarding)
CREATE POLICY "allow_public_insert_onboarding_assignments"
ON public.employee_onboarding_assignments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Step 3: Create policy for authenticated users to insert (managers/admins)
CREATE POLICY "allow_company_users_insert_onboarding_assignments"
ON public.employee_onboarding_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.company_id = employee_onboarding_assignments.company_id
      AND p.app_role IN ('Owner', 'Admin', 'Manager', 'General Manager', 'Super Admin')
  )
);

-- Step 4: Create policy for authenticated users to update
CREATE POLICY "allow_company_users_update_onboarding_assignments"
ON public.employee_onboarding_assignments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.company_id = employee_onboarding_assignments.company_id
  )
);

-- Step 5: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verification query
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'employee_onboarding_assignments'
ORDER BY policyname;
