-- ============================================================================
-- Migration: Allow Profiles Access for Messaging
-- Description: Adds RLS policy to allow users in same conversation to see
--              each other's profiles for messaging purposes
-- ============================================================================

BEGIN;

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS profiles_select_conversation_participants ON public.profiles;

-- Allow users to see profiles of other users in conversations they participate in
-- This is needed for displaying sender names in messages
-- NOTE: This policy works alongside tenant_select_profiles - both policies are checked with OR
CREATE POLICY profiles_select_conversation_participants
  ON public.profiles
  FOR SELECT
  USING (
    -- User can see profiles of users in conversations they're part of
    -- (own profile and company access are already handled by tenant_select_profiles)
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp1
      JOIN public.conversation_participants cp2 ON cp2.conversation_id = cp1.conversation_id
      WHERE cp1.user_id = auth.uid()
        AND cp2.user_id = profiles.id
        AND cp1.left_at IS NULL
        AND cp2.left_at IS NULL
    )
  );

COMMIT;

