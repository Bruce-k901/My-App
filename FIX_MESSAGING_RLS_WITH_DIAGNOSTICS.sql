-- ============================================================================
-- FIX WITH DIAGNOSTICS - Shows what it finds and fixes accordingly
-- ============================================================================

-- ============================================================================
-- DIAGNOSTIC: Check typing_indicators structure
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
  
  RAISE NOTICE '=== TYPING_INDICATORS STRUCTURE ===';
  RAISE NOTICE 'profile_id: %', has_profile_id;
  RAISE NOTICE 'user_id: %', has_user_id;
  RAISE NOTICE 'channel_id: %', has_channel_id;
END $$;

-- ============================================================================
-- STEP 1: Fix typing_indicators primary key
-- ============================================================================
DO $$
DECLARE
  has_profile_id BOOLEAN;
  has_user_id BOOLEAN;
BEGIN
  SELECT 
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_indicators' AND column_name = 'profile_id'),
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_indicators' AND column_name = 'user_id')
  INTO has_profile_id, has_user_id;
  
  -- Drop old constraints
  BEGIN
    ALTER TABLE public.typing_indicators DROP CONSTRAINT typing_indicators_pkey CASCADE;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
  
  -- Add primary key based on what exists
  IF has_profile_id THEN
    BEGIN
      ALTER TABLE public.typing_indicators ADD PRIMARY KEY (channel_id, profile_id);
      RAISE NOTICE '✅ Added primary key on (channel_id, profile_id)';
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Primary key already exists';
    END;
  ELSIF has_user_id THEN
    BEGIN
      ALTER TABLE public.typing_indicators ADD PRIMARY KEY (channel_id, user_id);
      RAISE NOTICE '✅ Added primary key on (channel_id, user_id)';
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Primary key already exists';
    END;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Fix messaging_channel_members unique constraint
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
    RAISE NOTICE '✅ Added unique constraint on messaging_channel_members (channel_id, profile_id)';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Unique constraint already exists';
  END;
END $$;

-- ============================================================================
-- STEP 3: Fix typing_indicators RLS policies
-- ============================================================================
DO $$
DECLARE
  has_profile_id BOOLEAN;
BEGIN
  ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
  
  -- Drop all existing policies
  DROP POLICY IF EXISTS typing_indicators_select_member ON public.typing_indicators;
  DROP POLICY IF EXISTS typing_indicators_upsert_own ON public.typing_indicators;
  
  SELECT 
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_indicators' AND column_name = 'profile_id')
  INTO has_profile_id;
  
  IF has_profile_id THEN
    -- UPSERT policy with profile_id
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
    
    -- SELECT policy
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
    RAISE NOTICE '✅ Created typing_indicators policies with profile_id';
  ELSE
    -- Fallback: use user_id if profile_id doesn't exist
    CREATE POLICY typing_indicators_upsert_own
      ON public.typing_indicators
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.messaging_channel_members mcm
          WHERE mcm.channel_id = typing_indicators.channel_id
            AND mcm.profile_id = auth.uid()
            AND (mcm.left_at IS NULL)
        )
      );
    
    CREATE POLICY typing_indicators_select_member
      ON public.typing_indicators
      FOR SELECT
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.messaging_channel_members mcm
          WHERE mcm.channel_id = typing_indicators.channel_id
            AND mcm.profile_id = auth.uid()
            AND (mcm.left_at IS NULL)
        )
      );
    RAISE NOTICE '✅ Created typing_indicators policies with user_id (fallback)';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Fix messaging_messages RLS INSERT policy
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;
  
  -- Drop all existing INSERT policies
  DROP POLICY IF EXISTS messaging_messages_insert_member ON public.messaging_messages;
  DROP POLICY IF EXISTS "messaging_messages_insert_member" ON public.messaging_messages;
  DROP POLICY IF EXISTS "Members can post messages" ON public.messaging_messages;
  
  -- Create INSERT policy
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
-- STEP 5: Fix messaging_channel_members INSERT policy
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.messaging_channel_members ENABLE ROW LEVEL SECURITY;
  
  DROP POLICY IF EXISTS messaging_channel_members_insert_member ON public.messaging_channel_members;
  
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
-- VERIFICATION
-- ============================================================================
SELECT '✅ Fix complete! Check notices above for details.' as status;
