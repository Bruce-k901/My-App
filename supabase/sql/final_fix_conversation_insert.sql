-- ============================================================================
-- FINAL FIX for Conversation INSERT Policy
-- This comprehensively fixes all potential issues
-- ============================================================================

BEGIN;

-- Step 1: Ensure the function exists and is bulletproof
CREATE OR REPLACE FUNCTION public.check_user_company_match(user_uuid UUID, comp_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
  profile_exists BOOLEAN;
BEGIN
  -- Always return a boolean, never NULL
  
  -- If company_id is NULL, allow (conversation without company restriction)
  IF comp_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- If user_uuid is NULL, deny
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_uuid) INTO profile_exists;
  
  IF NOT profile_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's company_id (bypasses RLS due to SECURITY DEFINER)
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- If user has no company_id set, deny
  IF user_company_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Allow if company matches (explicit boolean comparison)
  IF user_company_id = comp_id THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Step 2: Ensure function ownership and permissions
ALTER FUNCTION public.check_user_company_match(UUID, UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.check_user_company_match(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_company_match(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_company_match(UUID, UUID) TO service_role;

-- Step 3: Drop ALL existing INSERT policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'conversations' 
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversations', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Step 4: Create the INSERT policy with EXPLICIT schema qualification
CREATE POLICY conversations_insert_company
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.check_user_company_match(auth.uid(), company_id)
  );

-- Step 5: Ensure table permissions
GRANT INSERT ON public.conversations TO authenticated;
GRANT SELECT ON public.conversations TO authenticated;

-- Step 6: Verify RLS is enabled
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Step 7: Test the function directly
SELECT 
  '=== FUNCTION TEST ===' as section,
  auth.uid() as user_id,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as user_company_id,
  public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ) as function_result,
  CASE 
    WHEN public.check_user_company_match(
      auth.uid(),
      (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    ) = TRUE
    THEN '✓ Function returns TRUE - INSERT should work'
    ELSE '✗ Function returns FALSE/NULL - INSERT will be blocked'
  END as interpretation;

-- Step 8: Verify the policy
SELECT 
  '=== POLICY VERIFICATION ===' as section,
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND cmd = 'INSERT';

COMMIT;

