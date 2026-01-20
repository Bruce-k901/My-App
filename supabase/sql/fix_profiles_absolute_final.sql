-- ABSOLUTE FINAL FIX: Use a completely different approach
-- Create a SECURITY DEFINER function that returns a table of visible profile IDs
-- Then use that in the policy

-- Step 1: Drop everything and start fresh
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;
DROP FUNCTION IF EXISTS public.get_user_company_id_for_policy() CASCADE;
DROP FUNCTION IF EXISTS public.get_company_profile_ids() CASCADE;

-- Step 2: Create a simple function that returns company_id (no role check for now)
-- We'll add role check later if needed
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id 
  FROM public.profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated;

-- Step 3: Test the function
SELECT 
  'Test: Function' as step,
  public.get_my_company_id() as company_id;

-- Step 4: Create the simplest possible policy
CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_company_id() IS NOT NULL
  );

-- Step 5: Test
SELECT 
  'Test: Company profiles' as step,
  COUNT(*) as visible_profiles
FROM profiles
WHERE company_id = public.get_my_company_id()
AND public.get_my_company_id() IS NOT NULL;










