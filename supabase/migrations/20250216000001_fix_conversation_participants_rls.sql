-- ============================================================================
-- Migration: Fix Conversation Participants RLS Infinite Recursion
-- Description: Fixes infinite recursion in conversation_participants RLS policy
-- ============================================================================

BEGIN;

-- Create a security definer function to check if user is a participant
-- This bypasses RLS to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id
      AND user_id = user_uuid
      AND left_at IS NULL
  );
END;
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS participants_select_conversation_member ON public.conversation_participants;

-- Recreate with fixed logic using the security definer function
CREATE POLICY participants_select_conversation_member
  ON public.conversation_participants
  FOR SELECT
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

-- Fix conversations INSERT policy
-- Use a security definer function to check company membership
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(user_uuid UUID, comp_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid
      AND company_id = comp_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_site(user_uuid UUID, site_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid
      AND site_id = site_uuid
  );
END;
$$;

DROP POLICY IF EXISTS conversations_insert_company ON public.conversations;

-- Use security definer function to check company membership (bypasses RLS on profiles)
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

-- Simplified policy using security definer function
CREATE POLICY conversations_insert_company
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.check_user_company_match(auth.uid(), company_id)
  );

-- TEMPORARY: Very permissive policy for debugging
-- Uncomment this to test if the issue is with the function or policy logic
-- DROP POLICY IF EXISTS conversations_insert_debug ON public.conversations;
-- CREATE POLICY conversations_insert_debug
--   ON public.conversations
--   FOR INSERT
--   WITH CHECK (created_by = auth.uid());

-- Ensure function has proper permissions
ALTER FUNCTION public.check_user_company_match(UUID, UUID) OWNER TO postgres;
ALTER FUNCTION public.is_conversation_participant(UUID, UUID) OWNER TO postgres;

-- Also grant necessary permissions (if not already granted)
GRANT INSERT ON public.conversations TO authenticated;
GRANT SELECT ON public.conversations TO authenticated;

COMMIT;

