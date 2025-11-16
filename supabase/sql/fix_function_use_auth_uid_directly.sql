-- ============================================================================
-- Fix Function to Use auth.uid() Directly
-- The function should use auth.uid() directly instead of the parameter
-- ============================================================================

BEGIN;

-- Recreate the function to use auth.uid() directly
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
  -- Get auth.uid() directly (this is the key - use auth.uid() not the parameter)
  current_auth_uid := auth.uid();
  
  -- If no authenticated user, deny
  IF current_auth_uid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- If company_id is NULL, allow (conversation without company restriction)
  IF comp_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if profile exists for the authenticated user
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = current_auth_uid) INTO profile_exists;
  
  IF NOT profile_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Get authenticated user's company_id (bypasses RLS due to SECURITY DEFINER)
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = current_auth_uid;
  
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
DROP POLICY IF EXISTS conversations_insert_company ON public.conversations;

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

