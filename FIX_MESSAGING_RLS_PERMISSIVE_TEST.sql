-- ============================================================================
-- PERMISSIVE TEST FIX - Temporarily more permissive to test
-- Once this works, we can tighten the policies
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix typing_indicators - Very permissive for testing
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
  
  -- Drop all existing policies
  DROP POLICY IF EXISTS typing_indicators_select_member ON public.typing_indicators;
  DROP POLICY IF EXISTS typing_indicators_select_participant ON public.typing_indicators;
  DROP POLICY IF EXISTS typing_indicators_upsert_own ON public.typing_indicators;
  DROP POLICY IF EXISTS "typing_indicators_upsert_own" ON public.typing_indicators;
  
  -- Check if profile_id exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'typing_indicators' 
    AND column_name = 'profile_id'
  ) THEN
    -- Very permissive UPSERT - just check profile_id matches
    CREATE POLICY typing_indicators_upsert_own
      ON public.typing_indicators
      FOR ALL
      USING (profile_id = auth.uid())
      WITH CHECK (profile_id = auth.uid());
    
    -- SELECT - allow if it's your own or you're a channel member
    CREATE POLICY typing_indicators_select_member
      ON public.typing_indicators
      FOR SELECT
      USING (
        profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.messaging_channel_members mcm
          WHERE mcm.channel_id = typing_indicators.channel_id
            AND mcm.profile_id = auth.uid()
        )
      );
    RAISE NOTICE '✅ Created typing_indicators policies with profile_id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'typing_indicators' 
    AND column_name = 'user_id'
  ) THEN
    -- Fallback to user_id
    CREATE POLICY typing_indicators_upsert_own
      ON public.typing_indicators
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    
    CREATE POLICY typing_indicators_select_member
      ON public.typing_indicators
      FOR SELECT
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.messaging_channel_members mcm
          WHERE mcm.channel_id = typing_indicators.channel_id
            AND mcm.profile_id = auth.uid()
        )
      );
    RAISE NOTICE '✅ Created typing_indicators policies with user_id (fallback)';
  ELSE
    RAISE NOTICE '⚠️ Could not find profile_id or user_id in typing_indicators';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Fix messaging_messages - Check channel membership
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;
  
  -- Drop all existing INSERT policies
  DROP POLICY IF EXISTS messaging_messages_insert_member ON public.messaging_messages;
  DROP POLICY IF EXISTS "messaging_messages_insert_member" ON public.messaging_messages;
  DROP POLICY IF EXISTS "Members can post messages" ON public.messaging_messages;
  DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.messaging_messages;
  
  -- Create INSERT policy - verify sender and channel membership
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
-- VERIFICATION
-- ============================================================================
SELECT '✅ Policies created. Test messaging now.' as status;
