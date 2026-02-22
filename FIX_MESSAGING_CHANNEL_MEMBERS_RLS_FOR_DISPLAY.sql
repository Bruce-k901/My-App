-- ============================================================================
-- FIX messaging_channel_members RLS POLICY FOR DISPLAY NAMES
-- The current policy only allows users to see their own membership
-- We need to allow users to see ALL members of channels they're in
-- 
-- IMPORTANT: We use a security definer function to avoid infinite recursion
-- ============================================================================

-- First, create a security definer function to check membership
-- This avoids infinite recursion because the function runs with elevated privileges
CREATE OR REPLACE FUNCTION public.user_is_channel_member(p_channel_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.messaging_channel_members
    WHERE channel_id = p_channel_id
      AND profile_id = auth.uid()
      AND left_at IS NULL
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.user_is_channel_member(UUID) TO authenticated;

DO $$
BEGIN
  -- Enable RLS if not already enabled
  ALTER TABLE public.messaging_channel_members ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing SELECT policies
  DROP POLICY IF EXISTS messaging_channel_members_select_member ON public.messaging_channel_members;
  DROP POLICY IF EXISTS "Users can view their channel memberships" ON public.messaging_channel_members;
  DROP POLICY IF EXISTS "messaging_channel_members_select" ON public.messaging_channel_members;
  DROP POLICY IF EXISTS "Users can view channel members" ON public.messaging_channel_members;
  
  -- Create new SELECT policy using the security definer function
  -- This avoids infinite recursion
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_channel_members' 
    AND column_name = 'profile_id'
  ) THEN
    CREATE POLICY messaging_channel_members_select_member
      ON public.messaging_channel_members
      FOR SELECT
      USING (
        -- User can see members of any channel they're a member of
        -- Use security definer function to avoid recursion
        public.user_is_channel_member(channel_id)
      );
    
    RAISE NOTICE 'Created messaging_channel_members SELECT policy (allows viewing all members of channels user is in)';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION: Check the policy
-- ============================================================================
SELECT 
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'messaging_channel_members'
  AND cmd = 'SELECT';
