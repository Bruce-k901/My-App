-- WORKING SOLUTION: Use SECURITY DEFINER function that returns company_id
-- Then use simple comparison in policy

-- Step 1: Create/recreate the function to get company_id (only for managers)
CREATE OR REPLACE FUNCTION public.get_user_company_id_for_policy()
RETURNS UUID
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
    RETURN NULL;
  END IF;
  
  -- Get user's company_id and role (bypassing RLS with SECURITY DEFINER)
  SELECT company_id, COALESCE(app_role::TEXT, '') INTO v_company_id, v_app_role
  FROM public.profiles
  WHERE id = v_user_id OR auth_user_id = v_user_id
  LIMIT 1;
  
  -- Only return company_id if user is manager/admin/owner
  IF v_company_id IS NOT NULL AND LOWER(v_app_role) IN ('admin', 'owner', 'manager') THEN
    RETURN v_company_id;
  END IF;
  
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_company_id_for_policy() TO authenticated;

-- Step 2: Test the function
SELECT 
  'Test: Function' as step,
  public.get_user_company_id_for_policy() as company_id;

-- Step 3: Drop and recreate the policy using the function
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    -- Profile must be in the same company as the user
    company_id = public.get_user_company_id_for_policy()
    AND public.get_user_company_id_for_policy() IS NOT NULL
  );

-- Step 4: Test
SELECT 
  'Test: Company profiles' as step,
  COUNT(*) as visible_profiles
FROM profiles
WHERE company_id = public.get_user_company_id_for_policy()
AND public.get_user_company_id_for_policy() IS NOT NULL;

