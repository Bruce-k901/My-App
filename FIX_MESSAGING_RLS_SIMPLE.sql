-- ============================================================================
-- SIMPLE FIX FOR MESSAGING RLS ISSUES
-- This script fixes the most common issues without complex detection
-- ============================================================================

-- ============================================================================
-- STEP 1: FIX typing_indicators - Add unique constraint for profile_id
-- ============================================================================
DO $$
BEGIN
  -- Drop old constraints if they exist
  ALTER TABLE public.typing_indicators DROP CONSTRAINT IF EXISTS typing_indicators_pkey;
  ALTER TABLE public.typing_indicators DROP CONSTRAINT IF EXISTS typing_indicators_channel_user_unique;
  ALTER TABLE public.typing_indicators DROP CONSTRAINT IF EXISTS typing_indicators_channel_profile_unique;
  
  -- Add primary key on (channel_id, profile_id) if profile_id exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'typing_indicators' 
    AND column_name = 'profile_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'typing_indicators' 
    AND column_name = 'channel_id'
  ) THEN
    ALTER TABLE public.typing_indicators
    ADD PRIMARY KEY (channel_id, profile_id);
    RAISE NOTICE 'Added primary key on (channel_id, profile_id)';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: FIX messaging_channel_members - Add unique constraint for upsert
-- ============================================================================
DO $$
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE public.messaging_channel_members DROP CONSTRAINT IF EXISTS messaging_channel_members_channel_profile_unique;
  ALTER TABLE public.messaging_channel_members DROP CONSTRAINT IF EXISTS messaging_channel_members_channel_user_unique;
  
  -- Add unique constraint on (channel_id, profile_id) if profile_id exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_channel_members' 
    AND column_name = 'profile_id'
  ) THEN
    ALTER TABLE public.messaging_channel_members
    ADD CONSTRAINT messaging_channel_members_channel_profile_unique 
    UNIQUE (channel_id, profile_id);
    RAISE NOTICE 'Added unique constraint on messaging_channel_members (channel_id, profile_id)';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: FIX messaging_messages RLS - Create INSERT policy
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;
  
  -- Drop all existing INSERT policies
  DROP POLICY IF EXISTS messaging_messages_insert_member ON public.messaging_messages;
  DROP POLICY IF EXISTS "messaging_messages_insert_member" ON public.messaging_messages;
  DROP POLICY IF EXISTS "Members can post messages" ON public.messaging_messages;
  
  -- Create INSERT policy - try sender_profile_id first, fallback to sender_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_messages' 
    AND column_name = 'sender_profile_id'
  ) THEN
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
    RAISE NOTICE 'Created messaging_messages INSERT policy with sender_profile_id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_messages' 
    AND column_name = 'sender_id'
  ) THEN
    CREATE POLICY messaging_messages_insert_member
      ON public.messaging_messages
      FOR INSERT
      WITH CHECK (
        (sender_id = auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.messaging_channel_members mcm
          WHERE mcm.channel_id = messaging_messages.channel_id
            AND mcm.profile_id = auth.uid()
            AND (mcm.left_at IS NULL)
        )
      );
    RAISE NOTICE 'Created messaging_messages INSERT policy with sender_id';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: FIX typing_indicators RLS - Create policies
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
  
  -- Drop all existing policies
  DROP POLICY IF EXISTS typing_indicators_select_member ON public.typing_indicators;
  DROP POLICY IF EXISTS typing_indicators_upsert_own ON public.typing_indicators;
  
  -- Create policies - use profile_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'typing_indicators' 
    AND column_name = 'profile_id'
  ) THEN
    -- SELECT policy
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
    
    -- UPSERT policy
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
    RAISE NOTICE 'Created typing_indicators policies with profile_id';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: FIX messaging_channel_members INSERT policy
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.messaging_channel_members ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing INSERT policy
  DROP POLICY IF EXISTS messaging_channel_members_insert_member ON public.messaging_channel_members;
  
  -- Create INSERT policy - use profile_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_channel_members' 
    AND column_name = 'profile_id'
  ) THEN
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
    RAISE NOTICE 'Created messaging_channel_members INSERT policy with profile_id';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Fix complete! Check notices above.' as status;
