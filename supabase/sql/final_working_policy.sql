-- ============================================================================
-- FINAL WORKING POLICY
-- This should work - we'll test step by step
-- ============================================================================

BEGIN;

-- Step 1: Ensure the function exists and uses auth.uid() directly
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
  current_auth_uid UUID;
BEGIN
  -- Always use auth.uid() directly, ignore the parameter
  current_auth_uid := auth.uid();
  
  -- If no authenticated user, deny
  IF current_auth_uid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- If company_id is NULL, allow
  IF comp_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = current_auth_uid) INTO profile_exists;
  
  IF NOT profile_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's company_id
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = current_auth_uid;
  
  -- If user has no company_id, deny
  IF user_company_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Allow if company matches
  RETURN (user_company_id = comp_id);
END;
$$;

-- Step 2: Grant permissions
ALTER FUNCTION public.check_user_company_match(UUID, UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.check_user_company_match(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_company_match(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_company_match(UUID, UUID) TO service_role;

-- Step 3: Drop all existing INSERT policies
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

-- Step 4: Create the policy
CREATE POLICY conversations_insert_company
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      company_id IS NULL 
      OR public.check_user_company_match(auth.uid(), company_id)
    )
  );

-- Step 5: Ensure table permissions
GRANT INSERT ON public.conversations TO authenticated;
GRANT SELECT ON public.conversations TO authenticated;

-- Step 6: Verify RLS is enabled
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Step 7: Verify the setup
SELECT 
  '=== POLICY CREATED ===' as section,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND cmd = 'INSERT';

COMMIT;

