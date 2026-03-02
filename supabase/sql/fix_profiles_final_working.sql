-- FINAL WORKING SOLUTION: Use SECURITY DEFINER function that returns profile IDs
-- This completely bypasses RLS recursion

-- Step 1: Drop existing function and recreate it properly
DROP FUNCTION IF EXISTS public.get_company_profile_ids() CASCADE;

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
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- If no user, return empty array
  IF v_user_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;
  
  -- Get user's company_id and role (bypassing RLS with SECURITY DEFINER)
  -- This query bypasses RLS because the function is SECURITY DEFINER
  SELECT company_id, COALESCE(app_role::TEXT, '') INTO v_company_id, v_app_role
  FROM public.profiles
  WHERE id = v_user_id OR auth_user_id = v_user_id
  LIMIT 1;
  
  -- If user is manager/admin/owner and has a company_id, get all profile IDs in that company
  IF v_company_id IS NOT NULL AND LOWER(v_app_role) IN ('admin', 'owner', 'manager') THEN
    SELECT ARRAY_AGG(id) INTO v_profile_ids
    FROM public.profiles
    WHERE company_id = v_company_id;
  END IF;
  
  RETURN COALESCE(v_profile_ids, ARRAY[]::UUID[]);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_company_profile_ids() TO authenticated;

-- Step 2: Test the function
SELECT 
  'Test: Function result' as step,
  public.get_company_profile_ids() as profile_ids,
  array_length(public.get_company_profile_ids(), 1) as count;

-- Step 3: Drop and recreate the policy using the function
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    id = ANY(public.get_company_profile_ids())
  );

-- Step 4: Test if we can see profiles now
SELECT 
  'Test: Profiles visible' as step,
  COUNT(*) as visible_profiles
FROM profiles
WHERE id = ANY(public.get_company_profile_ids());

-- Step 5: Also ensure profiles_select_own still works
SELECT 
  'Test: Own profile' as step,
  COUNT(*) as own_profile_visible
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();










