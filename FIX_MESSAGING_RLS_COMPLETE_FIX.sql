-- ============================================================================
-- COMPLETE FIX FOR MESSAGING RLS - Based on confirmed schema
-- messaging_channel_members uses profile_id (confirmed)
-- Assumes typing_indicators and messaging_messages also use profile_id/sender_profile_id
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix typing_indicators primary key
-- ============================================================================
DO $$
BEGIN
  -- Drop old constraints
  BEGIN
    ALTER TABLE public.typing_indicators DROP CONSTRAINT typing_indicators_pkey CASCADE;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER TABLE public.typing_indicators DROP CONSTRAINT typing_indicators_channel_user_unique CASCADE;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER TABLE public.typing_indicators DROP CONSTRAINT typing_indicators_channel_profile_unique CASCADE;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
  
  -- Add primary key on (channel_id, profile_id)
  BEGIN
    ALTER TABLE public.typing_indicators
    ADD PRIMARY KEY (channel_id, profile_id);
    RAISE NOTICE '✅ Added primary key on typing_indicators (channel_id, profile_id)';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Primary key already exists on typing_indicators';
  END;
END $$;

-- ============================================================================
-- STEP 2: Fix messaging_channel_members unique constraint
-- ============================================================================
DO $$
BEGIN
  -- Drop old constraint
  BEGIN
    ALTER TABLE public.messaging_channel_members DROP CONSTRAINT messaging_channel_members_channel_profile_unique CASCADE;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER TABLE public.messaging_channel_members DROP CONSTRAINT messaging_channel_members_channel_user_unique CASCADE;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
  
  -- Add unique constraint
  BEGIN
    ALTER TABLE public.messaging_channel_members
    ADD CONSTRAINT messaging_channel_members_channel_profile_unique 
    UNIQUE (channel_id, profile_id);
    RAISE NOTICE '✅ Added unique constraint on messaging_channel_members (channel_id, profile_id)';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Unique constraint already exists on messaging_channel_members';
  END;
END $$;

-- ============================================================================
-- STEP 3: Fix messaging_messages RLS INSERT policy
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;
  
  -- Drop all existing INSERT policies
  DROP POLICY IF EXISTS messaging_messages_insert_member ON public.messaging_messages;
  DROP POLICY IF EXISTS "messaging_messages_insert_member" ON public.messaging_messages;
  DROP POLICY IF EXISTS "Members can post messages" ON public.messaging_messages;
  DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.messaging_messages;
  
  -- Create INSERT policy with sender_profile_id
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
-- STEP 4: Fix typing_indicators RLS policies
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
  
  -- Drop all existing policies
  DROP POLICY IF EXISTS typing_indicators_select_member ON public.typing_indicators;
  DROP POLICY IF EXISTS typing_indicators_select_participant ON public.typing_indicators;
  DROP POLICY IF EXISTS typing_indicators_upsert_own ON public.typing_indicators;
  DROP POLICY IF EXISTS "typing_indicators_upsert_own" ON public.typing_indicators;
  
  -- Create SELECT policy
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
  
  -- Create UPSERT policy
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
  RAISE NOTICE '✅ Created typing_indicators RLS policies';
END $$;

-- ============================================================================
-- STEP 5: Fix messaging_channel_members INSERT policy
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.messaging_channel_members ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing INSERT policy
  DROP POLICY IF EXISTS messaging_channel_members_insert_member ON public.messaging_channel_members;
  DROP POLICY IF EXISTS "Users can add members to channels" ON public.messaging_channel_members;
  DROP POLICY IF EXISTS "Users can insert channel members" ON public.messaging_channel_members;
  
  -- Create INSERT policy
  CREATE POLICY messaging_channel_members_insert_member
    ON public.messaging_channel_members
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.messaging_channels mc
        WHERE mc.id = messaging_channel_members.channel_id
          AND mc.company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
          )
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = messaging_channel_members.profile_id
          AND p.company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
          )
      )
    );
  RAISE NOTICE '✅ Created messaging_channel_members INSERT policy';
END $$;

-- ============================================================================
-- VERIFICATION - Check what was created
-- ============================================================================
SELECT 
  '✅ Fix complete!' as status,
  'All constraints and RLS policies created.' as message;

-- Show created policies
SELECT 
  'messaging_messages policies' as table_name,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'messaging_messages'
AND schemaname = 'public';

SELECT 
  'typing_indicators policies' as table_name,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'typing_indicators'
AND schemaname = 'public';

SELECT 
  'messaging_channel_members policies' as table_name,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'messaging_channel_members'
AND schemaname = 'public';
