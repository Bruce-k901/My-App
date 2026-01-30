-- SIMPLE FUNCTION FIX: Use function only once in policy

-- Step 1: Test the function first
SELECT 
  'Step 1: Function test' as step,
  public.get_my_company_id() as company_id,
  CASE 
    WHEN public.get_my_company_id() IS NULL THEN 'NULL - Function not working!'
    ELSE 'OK'
  END as status;

-- Step 2: Check your profile directly (bypassing RLS)
SET LOCAL role = 'postgres';
SELECT 
  'Step 2: Your profile (bypassing RLS)' as step,
  id,
  email,
  company_id,
  app_role
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();
RESET role;

-- Step 3: Simplify the policy - call function only once
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    -- Call function once and store result
    company_id = COALESCE(public.get_my_company_id(), '00000000-0000-0000-0000-000000000000'::UUID)
    AND public.get_my_company_id() IS NOT NULL
  );

-- Step 4: Test
SELECT 
  'Step 4: Test profiles' as step,
  COUNT(*) as visible_profiles
FROM profiles
WHERE company_id = public.get_my_company_id()
AND public.get_my_company_id() IS NOT NULL;

-- Step 5: Alternative - try without the NULL check
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    company_id = public.get_my_company_id()
  );

-- Step 6: Test alternative
SELECT 
  'Step 6: Test alternative' as step,
  COUNT(*) as visible_profiles
FROM profiles
WHERE company_id = public.get_my_company_id();










