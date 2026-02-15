-- ============================================================================
-- FIX: Allow users to add themselves to channels they create
-- This fixes the issue where conversation creator can't add themselves as member
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix messaging_channel_members INSERT policy
-- Allow users to add themselves or others to channels in their company
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.messaging_channel_members ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing INSERT policy
  DROP POLICY IF EXISTS messaging_channel_members_insert_member ON public.messaging_channel_members;
  DROP POLICY IF EXISTS "Users can add members to channels" ON public.messaging_channel_members;
  DROP POLICY IF EXISTS "Users can insert channel members" ON public.messaging_channel_members;
  
  -- Create more permissive INSERT policy
  -- Allow if:
  -- 1. User is adding themselves to a channel in their company, OR
  -- 2. User is in the same company as the channel and the person being added
  CREATE POLICY messaging_channel_members_insert_member
    ON public.messaging_channel_members
    FOR INSERT
    WITH CHECK (
      -- User must be in the same company as the channel
      EXISTS (
        SELECT 1 FROM public.messaging_channels mc
        WHERE mc.id = messaging_channel_members.channel_id
          AND mc.company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
          )
      )
      AND (
        -- Allow if adding yourself
        messaging_channel_members.profile_id = auth.uid()
        OR
        -- Allow if adding someone else in the same company
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = messaging_channel_members.profile_id
            AND p.company_id IN (
              SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
      )
    );
  RAISE NOTICE '✅ Created messaging_channel_members INSERT policy (allows self-add)';
END $$;

-- ============================================================================
-- STEP 2: Ensure typing_indicators primary key exists
-- ============================================================================
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.typing_indicators DROP CONSTRAINT typing_indicators_pkey CASCADE;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER TABLE public.typing_indicators
    ADD PRIMARY KEY (channel_id, profile_id);
    RAISE NOTICE '✅ Added primary key on typing_indicators';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Primary key already exists';
  END;
END $$;

-- ============================================================================
-- STEP 3: Ensure messaging_channel_members unique constraint exists
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
-- STEP 4: Fix typing_indicators RLS policies
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
  
  DROP POLICY IF EXISTS typing_indicators_select_member ON public.typing_indicators;
  DROP POLICY IF EXISTS typing_indicators_upsert_own ON public.typing_indicators;
  
  -- SELECT: Allow if you're a channel member
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
  
  -- UPSERT: Allow if it's your own typing indicator AND you're a channel member
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
-- STEP 5: Verify messaging_messages INSERT policy
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
SELECT '✅ All fixes applied. Test creating a conversation and sending messages.' as status;
