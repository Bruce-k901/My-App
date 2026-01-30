-- COMPLETE FIX: Ensure both own profile and company profiles work
-- This will fix the broken profiles_select_own policy

-- Step 1: Drop ALL profiles policies to start fresh
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_company ON public.profiles;
DROP POLICY IF EXISTS profiles_update_company ON public.profiles;

-- Step 2: Recreate profiles_select_own (CRITICAL - must work)
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid() 
    OR auth_user_id = auth.uid()
  );

-- Step 3: Test own profile access
SELECT 
  'Test: Own profile count' as step,
  COUNT(*) as visible
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- Step 3b: Show own profile data
SELECT 
  'Test: Own profile data' as step,
  id,
  email,
  full_name,
  app_role,
  company_id
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- Step 4: Create the get_company_profile_ids function if it doesn't exist
CREATE OR REPLACE FUNCTION public.get_company_profile_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_app_role TEXT;
  v_profile_ids UUID[];
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;
  
  -- Get user's company_id and role (bypassing RLS)
  SELECT company_id, COALESCE(app_role::TEXT, '') INTO v_company_id, v_app_role
  FROM public.profiles
  WHERE id = v_user_id OR auth_user_id = v_user_id
  LIMIT 1;
  
  -- If manager/admin/owner, get all profile IDs in company
  IF v_company_id IS NOT NULL AND LOWER(v_app_role) IN ('admin', 'owner', 'manager') THEN
    SELECT ARRAY_AGG(id) INTO v_profile_ids
    FROM public.profiles
    WHERE company_id = v_company_id;
  END IF;
  
  RETURN COALESCE(v_profile_ids, ARRAY[]::UUID[]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_profile_ids() TO authenticated;

-- Step 5: Test the function
SELECT 
  'Test: Function' as step,
  public.get_company_profile_ids() as profile_ids,
  array_length(public.get_company_profile_ids(), 1) as count;

-- Step 6: Create profiles_select_company policy
CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    id = ANY(public.get_company_profile_ids())
  );

-- Step 7: Test company profiles
SELECT 
  'Test: Company profiles' as step,
  COUNT(*) as visible_profiles
FROM profiles
WHERE id = ANY(public.get_company_profile_ids());

-- Step 8: Add insert/update policies
CREATE POLICY profiles_insert_company
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    id = auth.uid()
    OR auth_user_id = auth.uid()
  );

CREATE POLICY profiles_update_company
  ON public.profiles
  FOR UPDATE
  USING (
    id = auth.uid()
    OR auth_user_id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
    OR auth_user_id = auth.uid()
  );

