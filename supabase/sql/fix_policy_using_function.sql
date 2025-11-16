-- ============================================================================
-- Fix Policy Using a Function
-- Sometimes auth.uid() doesn't work directly in policies, but works in functions
-- ============================================================================

BEGIN;

-- Create a helper function that checks created_by matches auth.uid()
CREATE OR REPLACE FUNCTION public.check_created_by_matches_auth(created_by_val UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  current_auth_uid UUID;
BEGIN
  current_auth_uid := auth.uid();
  
  -- If auth.uid() is NULL, deny
  IF current_auth_uid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- If created_by is NULL, deny
  IF created_by_val IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Allow if they match
  RETURN (created_by_val = current_auth_uid);
END;
$$;

-- Grant permissions
ALTER FUNCTION public.check_created_by_matches_auth(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.check_created_by_matches_auth(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_created_by_matches_auth(UUID) TO anon;

-- Drop existing policies
DROP POLICY IF EXISTS conversations_insert_simple ON public.conversations;
DROP POLICY IF EXISTS conversations_insert_authenticated ON public.conversations;
DROP POLICY IF EXISTS conversations_insert_company ON public.conversations;

-- Create policy using the function
CREATE POLICY conversations_insert_company
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.check_created_by_matches_auth(created_by)
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
  roles,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND cmd = 'INSERT';

COMMIT;

