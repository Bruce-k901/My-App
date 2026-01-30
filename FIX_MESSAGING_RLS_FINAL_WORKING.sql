-- ============================================================================
-- FINAL WORKING FIX - Based on confirmed policies
-- The policies look correct, but let's ensure they're properly set up
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure typing_indicators has primary key
-- ============================================================================
DO $$
BEGIN
  -- Drop old primary key if exists
  BEGIN
    ALTER TABLE public.typing_indicators DROP CONSTRAINT typing_indicators_pkey CASCADE;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
  
  -- Add primary key on (channel_id, profile_id)
  BEGIN
    ALTER TABLE public.typing_indicators
    ADD PRIMARY KEY (channel_id, profile_id);
    RAISE NOTICE '✅ Added primary key on typing_indicators (channel_id, profile_id)';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Primary key already exists';
  END;
END $$;

-- ============================================================================
-- STEP 2: Ensure messaging_channel_members has unique constraint
-- ============================================================================
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.messaging_channel_members DROP CONSTRAINT messaging_channel_members_channel_profile_unique CASCADE;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER TABLE public.messaging_channel_members
    ADD CONSTRAINT messaging_channel_members_channel_profile_unique 
    UNIQUE (channel_id, profile_id);
    RAISE NOTICE '✅ Added unique constraint on messaging_channel_members';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Unique constraint already exists';
  END;
END $$;

-- ============================================================================
-- STEP 3: Verify and fix typing_indicators RLS policies
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies
  DROP POLICY IF EXISTS typing_indicators_select_member ON public.typing_indicators;
  DROP POLICY IF EXISTS typing_indicators_upsert_own ON public.typing_indicators;
  
  -- Recreate SELECT policy - allow if user is channel member
  CREATE POLICY typing_indicators_select_member
    ON public.typing_indicators
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.messaging_channel_members mcm
        WHERE mcm.channel_id = typing_indicators.channel_id
          AND mcm.profile_id = auth.uid()
          AND (mcm.left_at IS NULL)
      )
    );
  
  -- Recreate UPSERT policy - allow if user matches profile_id AND is channel member
  CREATE POLICY typing_indicators_upsert_own
    ON public.typing_indicators
    FOR ALL
    USING (profile_id = auth.uid())
    WITH CHECK (
      profile_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.messaging_channel_members mcm
        WHERE mcm.channel_id = typing_indicators.channel_id
          AND mcm.profile_id = auth.uid()
          AND (mcm.left_at IS NULL)
      )
    );
  RAISE NOTICE '✅ Recreated typing_indicators RLS policies';
END $$;

-- ============================================================================
-- STEP 4: Verify messaging_messages INSERT policy
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;
  
  -- Drop and recreate to ensure it's correct
  DROP POLICY IF EXISTS messaging_messages_insert_member ON public.messaging_messages;
  
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
  RAISE NOTICE '✅ Recreated messaging_messages INSERT policy';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT '✅ All policies recreated. Test messaging now.' as status;

-- Show final policies
SELECT 
  'Final typing_indicators policies' as info,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'typing_indicators'
AND schemaname = 'public';

SELECT 
  'Final messaging_messages INSERT policy' as info,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_messages'
AND schemaname = 'public'
AND cmd = 'INSERT';
