-- FINAL FIX: Use SECURITY DEFINER function to avoid recursion
-- This function bypasses RLS to check if user is manager and get company_id

-- Step 1: Create a function that checks if user can see company profiles
CREATE OR REPLACE FUNCTION public.can_user_see_company_profiles()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_app_role TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user's company_id and role (bypassing RLS with SECURITY DEFINER)
  SELECT company_id, COALESCE(app_role::TEXT, '') INTO v_company_id, v_app_role
  FROM public.profiles
  WHERE id = v_user_id OR auth_user_id = v_user_id
  LIMIT 1;
  
  -- Return true if user is manager/admin/owner and has a company_id
  RETURN v_company_id IS NOT NULL 
    AND LOWER(v_app_role) IN ('admin', 'owner', 'manager');
END;
$$;

-- Step 2: Create a function that returns user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id_for_rls()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = v_user_id OR auth_user_id = v_user_id
  LIMIT 1;
  
  RETURN v_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_user_see_company_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company_id_for_rls() TO authenticated;

-- Step 3: Drop and recreate profiles_select_company policy using the functions
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    public.can_user_see_company_profiles() = true
    AND company_id = public.get_user_company_id_for_rls()
  );

-- Step 4: Test the functions
SELECT 
  'Test: Functions' as step,
  public.can_user_see_company_profiles() as can_see,
  public.get_user_company_id_for_rls() as company_id;

-- Step 5: Test if we can see company profiles
SELECT 
  'Test: Company profiles' as step,
  COUNT(*) as visible_profiles,
  ARRAY_AGG(id ORDER BY id) as profile_ids
FROM profiles
WHERE public.can_user_see_company_profiles() = true
AND company_id = public.get_user_company_id_for_rls();

