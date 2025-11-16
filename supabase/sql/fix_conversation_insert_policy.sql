-- ============================================================================
-- Fix Conversation INSERT Policy
-- This will replace the existing policy with a working version
-- ============================================================================

BEGIN;

-- Drop all existing INSERT policies on conversations
DROP POLICY IF EXISTS conversations_insert_company ON public.conversations;
DROP POLICY IF EXISTS conversations_insert_debug ON public.conversations;

-- Ensure the function exists and works
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
  -- If company_id is NULL, allow (conversation without company restriction)
  IF comp_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_uuid) INTO profile_exists;
  
  IF NOT profile_exists THEN
    -- Profile doesn't exist - deny
    RETURN FALSE;
  END IF;
  
  -- Get user's company_id (bypasses RLS due to SECURITY DEFINER)
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- If user has no company_id set, deny (they need to be assigned to a company)
  IF user_company_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Allow if company matches
  RETURN (user_company_id = comp_id);
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.check_user_company_match(UUID, UUID) TO authenticated;

-- Create the INSERT policy using the function
CREATE POLICY conversations_insert_company
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.check_user_company_match(auth.uid(), company_id)
  );

-- Verify the policy was created
SELECT 
  'Policy created: ' || policyname as status,
  cmd as command_type,
  with_check as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND cmd = 'INSERT';

COMMIT;

