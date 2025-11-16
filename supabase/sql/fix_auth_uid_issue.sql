-- ============================================================================
-- Fix Auth UID Issue in Policy
-- The policy might be failing because auth.uid() is being evaluated incorrectly
-- ============================================================================

BEGIN;

-- Ensure the function handles NULL user_uuid correctly
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
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  -- If user_uuid is NULL, use auth.uid() instead
  IF user_uuid IS NULL THEN
    user_uuid := current_user_id;
  END IF;
  
  -- If still NULL (no authenticated user), deny
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- If company_id is NULL, allow (conversation without company restriction)
  IF comp_id IS NULL THEN
    RETURN TRUE;
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
  
  -- Allow if company matches
  RETURN (user_company_id = comp_id);
END;
$$;

-- Grant permissions
ALTER FUNCTION public.check_user_company_match(UUID, UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.check_user_company_match(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_company_match(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_company_match(UUID, UUID) TO service_role;

-- Drop and recreate the policy
-- The key insight: created_by should equal auth.uid() when called from frontend
-- But we also need to handle the case where auth.uid() might be evaluated
DROP POLICY IF EXISTS conversations_insert_company ON public.conversations;

-- Simplified policy: created_by must match auth.uid() AND company must match
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

-- Verify
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

