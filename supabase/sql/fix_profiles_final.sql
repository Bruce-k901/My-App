-- FINAL FIX: Use a SECURITY DEFINER function to get company profiles
-- This bypasses RLS entirely for the nested select scenario

-- Step 1: Create a function that returns company profile IDs (bypasses RLS)
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
  
  -- Only return profile IDs if user is a manager/admin/owner
  IF v_company_id IS NOT NULL AND LOWER(v_app_role) IN ('admin', 'owner', 'manager') THEN
    SELECT ARRAY_AGG(id) INTO v_profile_ids
    FROM public.profiles
    WHERE company_id = v_company_id;
  END IF;
  
  RETURN COALESCE(v_profile_ids, ARRAY[]::UUID[]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_profile_ids() TO authenticated;

-- Step 2: Update profiles_select_company to use the function
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    id = ANY(public.get_company_profile_ids())
  );

-- Step 3: Test
SELECT 
  'Test: Function returns profile IDs' as step,
  public.get_company_profile_ids() as profile_ids,
  array_length(public.get_company_profile_ids(), 1) as count;

-- Step 4: Test if we can see profiles
SELECT 
  'Test: Can see company profiles?' as step,
  COUNT(*) as visible_profiles,
  ARRAY_AGG(id ORDER BY id) as profile_ids
FROM profiles
WHERE id = ANY(public.get_company_profile_ids());

