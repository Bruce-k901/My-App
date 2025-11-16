-- ============================================================================
-- Fix with Debug Policy
-- This adds logging to see what's happening
-- ============================================================================

BEGIN;

-- Create a function that logs what it's checking
CREATE OR REPLACE FUNCTION public.check_user_company_match_debug(user_uuid UUID, comp_id UUID)
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
  result BOOLEAN;
BEGIN
  current_auth_uid := auth.uid();
  
  -- Log to PostgreSQL logs (check Supabase logs)
  RAISE NOTICE 'check_user_company_match called: user_uuid=%, comp_id=%, auth.uid()=%', user_uuid, comp_id, current_auth_uid;
  
  IF current_auth_uid IS NULL THEN
    RAISE NOTICE 'auth.uid() is NULL - returning FALSE';
    RETURN FALSE;
  END IF;
  
  IF comp_id IS NULL THEN
    RAISE NOTICE 'comp_id is NULL - returning TRUE';
    RETURN TRUE;
  END IF;
  
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = current_auth_uid) INTO profile_exists;
  RAISE NOTICE 'Profile exists: %', profile_exists;
  
  IF NOT profile_exists THEN
    RAISE NOTICE 'Profile does not exist - returning FALSE';
    RETURN FALSE;
  END IF;
  
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = current_auth_uid;
  
  RAISE NOTICE 'User company_id: %, Insert company_id: %', user_company_id, comp_id;
  
  IF user_company_id IS NULL THEN
    RAISE NOTICE 'User company_id is NULL - returning FALSE';
    RETURN FALSE;
  END IF;
  
  result := (user_company_id = comp_id);
  RAISE NOTICE 'Company match result: %', result;
  
  RETURN result;
END;
$$;

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

-- Create policy using the debug function
CREATE POLICY conversations_insert_company
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      company_id IS NULL 
      OR public.check_user_company_match_debug(auth.uid(), company_id)
    )
  );

-- Also recreate the original function
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
  current_auth_uid := auth.uid();
  
  IF current_auth_uid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF comp_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = current_auth_uid) INTO profile_exists;
  
  IF NOT profile_exists THEN
    RETURN FALSE;
  END IF;
  
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = current_auth_uid;
  
  IF user_company_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN (user_company_id = comp_id);
END;
$$;

-- Grant permissions
ALTER FUNCTION public.check_user_company_match(UUID, UUID) OWNER TO postgres;
ALTER FUNCTION public.check_user_company_match_debug(UUID, UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.check_user_company_match(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_company_match_debug(UUID, UUID) TO authenticated;

COMMIT;

-- After running this, try creating a conversation
-- Then check Supabase Logs (Dashboard -> Logs -> Postgres Logs)
-- You should see RAISE NOTICE messages showing what's happening

