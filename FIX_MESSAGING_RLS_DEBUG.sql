-- ============================================================================
-- DEBUG FIX - More permissive policies to test
-- This will help us see if the issue is with policy logic or something else
-- ============================================================================

-- ============================================================================
-- STEP 1: Check typing_indicators structure first
-- ============================================================================
DO $$
DECLARE
  has_profile_id BOOLEAN;
  has_user_id BOOLEAN;
  has_channel_id BOOLEAN;
BEGIN
  SELECT 
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_indicators' AND column_name = 'profile_id'),
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_indicators' AND column_name = 'user_id'),
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_indicators' AND column_name = 'channel_id')
  INTO has_profile_id, has_user_id, has_channel_id;
  
  RAISE NOTICE 'typing_indicators: profile_id=%, user_id=%, channel_id=%', has_profile_id, has_user_id, has_channel_id;
END $$;

-- ============================================================================
-- STEP 2: Fix typing_indicators - More permissive policy for testing
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
  
  -- Drop all existing policies
  DROP POLICY IF EXISTS typing_indicators_select_member ON public.typing_indicators;
  DROP POLICY IF EXISTS typing_indicators_select_participant ON public.typing_indicators;
  DROP POLICY IF EXISTS typing_indicators_upsert_own ON public.typing_indicators;
  DROP POLICY IF EXISTS "typing_indicators_upsert_own" ON public.typing_indicators;
  
  -- Create more permissive UPSERT policy - allow if user is authenticated and matches profile_id
  -- This is more permissive to test if the issue is with the channel membership check
  CREATE POLICY typing_indicators_upsert_own
    ON public.typing_indicators
    FOR ALL
    USING (profile_id = auth.uid())
    WITH CHECK (
      profile_id = auth.uid()
    );
  RAISE NOTICE '✅ Created permissive typing_indicators UPSERT policy (testing)';
  
  -- Create SELECT policy - allow if user is a channel member OR if it's their own typing indicator
  CREATE POLICY typing_indicators_select_member
    ON public.typing_indicators
    FOR SELECT
    USING (
      profile_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.messaging_channel_members mcm
        WHERE mcm.channel_id = typing_indicators.channel_id
          AND mcm.profile_id = auth.uid()
          AND (mcm.left_at IS NULL)
      )
    );
  RAISE NOTICE '✅ Created typing_indicators SELECT policy';
END $$;

-- ============================================================================
-- STEP 3: Fix messaging_messages - Check if policy exists and is correct
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;
  
  -- Drop all existing INSERT policies
  DROP POLICY IF EXISTS messaging_messages_insert_member ON public.messaging_messages;
  DROP POLICY IF EXISTS "messaging_messages_insert_member" ON public.messaging_messages;
  DROP POLICY IF EXISTS "Members can post messages" ON public.messaging_messages;
  DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.messaging_messages;
  
  -- Create INSERT policy - verify channel membership
  CREATE POLICY messaging_messages_insert_member
    ON public.messaging_messages
    FOR INSERT
    WITH CHECK (
      (sender_profile_id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.messaging_channel_members mcm
        WHERE mcm.channel_id = messaging_messages.channel_id
          AND mcm.profile_id = auth.uid()
          AND (mcm.left_at IS NULL)
      )
    );
  RAISE NOTICE '✅ Created messaging_messages INSERT policy';
END $$;

-- ============================================================================
-- VERIFICATION - Check what policies exist
-- ============================================================================
SELECT 
  'typing_indicators policies' as table_name,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'typing_indicators'
AND schemaname = 'public';

SELECT 
  'messaging_messages policies' as table_name,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_messages'
AND schemaname = 'public';
