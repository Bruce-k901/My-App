-- ============================================================================
-- Fix Policy with Explicit NEW Row Reference
-- Sometimes PostgreSQL needs explicit NEW.column_name in WITH CHECK
-- ============================================================================

BEGIN;

-- Drop all INSERT policies
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
  END LOOP;
END $$;

-- Ensure function exists and is correct
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

-- Create policy with explicit NEW reference (though it should work without)
CREATE POLICY conversations_insert_company
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.check_user_company_match(auth.uid(), company_id)
  );

-- Also ensure we have the right table permissions
GRANT INSERT ON public.conversations TO authenticated;
GRANT SELECT ON public.conversations TO authenticated;

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

