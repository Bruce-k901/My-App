-- ============================================================================
-- FINAL FIX FOR MESSAGING RLS ISSUES
-- This script properly detects column names and fixes all issues
-- ============================================================================

-- ============================================================================
-- STEP 1: FIX typing_indicators UNIQUE CONSTRAINT
-- ============================================================================
DO $$
DECLARE
  has_channel_id BOOLEAN;
  has_conversation_id BOOLEAN;
  has_profile_id BOOLEAN;
  has_user_id BOOLEAN;
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'typing_indicators'
  ) THEN
    -- Check what columns exist
    SELECT 
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_indicators' AND column_name = 'channel_id'),
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_indicators' AND column_name = 'conversation_id'),
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_indicators' AND column_name = 'profile_id'),
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_indicators' AND column_name = 'user_id')
    INTO has_channel_id, has_conversation_id, has_profile_id, has_user_id;
    
    RAISE NOTICE 'typing_indicators columns: channel_id=%, conversation_id=%, profile_id=%, user_id=%', 
      has_channel_id, has_conversation_id, has_profile_id, has_user_id;
    
    -- Drop old primary key if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'typing_indicators_pkey'
      AND table_schema = 'public'
      AND table_name = 'typing_indicators'
    ) THEN
      ALTER TABLE public.typing_indicators DROP CONSTRAINT typing_indicators_pkey;
      RAISE NOTICE 'Dropped old primary key';
    END IF;
    
    -- Drop old unique constraint if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'typing_indicators_channel_user_unique'
      AND table_schema = 'public'
      AND table_name = 'typing_indicators'
    ) THEN
      ALTER TABLE public.typing_indicators DROP CONSTRAINT typing_indicators_channel_user_unique;
      RAISE NOTICE 'Dropped old unique constraint';
    END IF;
    
    -- Add correct primary key and unique constraint based on actual columns
    IF has_channel_id AND has_profile_id THEN
      -- New structure: channel_id + profile_id
      ALTER TABLE public.typing_indicators
      ADD PRIMARY KEY (channel_id, profile_id);
      RAISE NOTICE 'Added primary key on (channel_id, profile_id)';
    ELSIF has_channel_id AND has_user_id THEN
      -- Mixed structure: channel_id + user_id
      ALTER TABLE public.typing_indicators
      ADD PRIMARY KEY (channel_id, user_id);
      RAISE NOTICE 'Added primary key on (channel_id, user_id)';
    ELSIF has_conversation_id AND has_profile_id THEN
      -- Old structure with profile_id: conversation_id + profile_id
      ALTER TABLE public.typing_indicators
      ADD PRIMARY KEY (conversation_id, profile_id);
      RAISE NOTICE 'Added primary key on (conversation_id, profile_id)';
    ELSIF has_conversation_id AND has_user_id THEN
      -- Old structure: conversation_id + user_id
      ALTER TABLE public.typing_indicators
      ADD PRIMARY KEY (conversation_id, user_id);
      RAISE NOTICE 'Added primary key on (conversation_id, user_id)';
    ELSE
      RAISE NOTICE 'Could not determine typing_indicators structure';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: FIX messaging_messages RLS POLICIES
-- ============================================================================
DO $$
DECLARE
  has_sender_profile_id BOOLEAN;
  has_sender_id BOOLEAN;
  has_profile_id BOOLEAN;
  has_user_id BOOLEAN;
BEGIN
  -- Enable RLS
  ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;
  
  -- Drop all existing INSERT policies
  DROP POLICY IF EXISTS messaging_messages_insert_member ON public.messaging_messages;
  DROP POLICY IF EXISTS "messaging_messages_insert_member" ON public.messaging_messages;
  DROP POLICY IF EXISTS "Members can post messages" ON public.messaging_messages;
  DROP POLICY IF EXISTS messages_insert_participant ON public.messaging_messages;
  DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.messaging_messages;
  
  -- Check actual column structure
  SELECT 
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messaging_messages' AND column_name = 'sender_profile_id'),
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messaging_messages' AND column_name = 'sender_id'),
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messaging_channel_members' AND column_name = 'profile_id'),
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messaging_channel_members' AND column_name = 'user_id')
  INTO has_sender_profile_id, has_sender_id, has_profile_id, has_user_id;
  
  RAISE NOTICE 'messaging_messages: sender_profile_id=%, sender_id=%', has_sender_profile_id, has_sender_id;
  RAISE NOTICE 'messaging_channel_members: profile_id=%, user_id=%', has_profile_id, has_user_id;
  
  -- Create INSERT policy based on actual columns
  IF has_sender_profile_id AND has_profile_id THEN
    -- Best case: sender_profile_id + profile_id
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
    RAISE NOTICE 'Created INSERT policy with sender_profile_id + profile_id';
    
  ELSIF has_sender_profile_id AND has_user_id THEN
    -- Mixed: sender_profile_id + user_id
    CREATE POLICY messaging_messages_insert_member
      ON public.messaging_messages
      FOR INSERT
      WITH CHECK (
        (sender_profile_id = auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.messaging_channel_members mcm
          WHERE mcm.channel_id = messaging_messages.channel_id
            AND mcm.user_id = auth.uid()
            AND (mcm.left_at IS NULL)
        )
      );
    RAISE NOTICE 'Created INSERT policy with sender_profile_id + user_id';
    
  ELSIF has_sender_id AND has_profile_id THEN
    -- Mixed: sender_id + profile_id
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
    RAISE NOTICE 'Created INSERT policy with sender_id + profile_id';
    
  ELSIF has_sender_id AND has_user_id THEN
    -- Old schema: sender_id + user_id
    CREATE POLICY messaging_messages_insert_member
      ON public.messaging_messages
      FOR INSERT
      WITH CHECK (
        (sender_id = auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.messaging_channel_members mcm
          WHERE mcm.channel_id = messaging_messages.channel_id
            AND mcm.user_id = auth.uid()
            AND (mcm.left_at IS NULL)
        )
      );
    RAISE NOTICE 'Created INSERT policy with sender_id + user_id (old schema)';
  ELSE
    RAISE NOTICE 'Could not determine messaging_messages structure for INSERT policy';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: FIX typing_indicators RLS POLICIES
-- ============================================================================
DO $$
DECLARE
  has_channel_id BOOLEAN;
  has_conversation_id BOOLEAN;
  has_profile_id BOOLEAN;
  has_user_id BOOLEAN;
  mcm_has_profile_id BOOLEAN;
  mcm_has_user_id BOOLEAN;
BEGIN
  -- Enable RLS
  ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
  
  -- Drop all existing policies
  DROP POLICY IF EXISTS typing_indicators_select_participant ON public.typing_indicators;
  DROP POLICY IF EXISTS typing_indicators_select_member ON public.typing_indicators;
  DROP POLICY IF EXISTS typing_indicators_upsert_own ON public.typing_indicators;
  DROP POLICY IF EXISTS "typing_indicators_upsert_own" ON public.typing_indicators;
  
  -- Check actual column structure
  SELECT 
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_indicators' AND column_name = 'channel_id'),
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_indicators' AND column_name = 'conversation_id'),
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_indicators' AND column_name = 'profile_id'),
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_indicators' AND column_name = 'user_id'),
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messaging_channel_members' AND column_name = 'profile_id'),
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messaging_channel_members' AND column_name = 'user_id')
  INTO has_channel_id, has_conversation_id, has_profile_id, has_user_id, mcm_has_profile_id, mcm_has_user_id;
  
  RAISE NOTICE 'typing_indicators: channel_id=%, conversation_id=%, profile_id=%, user_id=%', 
    has_channel_id, has_conversation_id, has_profile_id, has_user_id;
  RAISE NOTICE 'messaging_channel_members: profile_id=%, user_id=%', mcm_has_profile_id, mcm_has_user_id;
  
  -- Create policies based on actual structure
  IF has_channel_id AND has_profile_id AND mcm_has_profile_id THEN
    -- New structure: channel_id + profile_id with messaging_channel_members.profile_id
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
    RAISE NOTICE 'Created typing_indicators policies with channel_id + profile_id';
    
  ELSIF has_channel_id AND has_profile_id AND mcm_has_user_id THEN
    -- Mixed: channel_id + profile_id with messaging_channel_members.user_id
    CREATE POLICY typing_indicators_select_member
      ON public.typing_indicators
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.messaging_channel_members mcm
          WHERE mcm.channel_id = typing_indicators.channel_id
            AND mcm.user_id = auth.uid()
            AND (mcm.left_at IS NULL)
        )
      );
    
    CREATE POLICY typing_indicators_upsert_own
      ON public.typing_indicators
      FOR ALL
      USING (profile_id = auth.uid())
      WITH CHECK (
        profile_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.messaging_channel_members mcm
          WHERE mcm.channel_id = typing_indicators.channel_id
            AND mcm.user_id = auth.uid()
            AND (mcm.left_at IS NULL)
        )
      );
    RAISE NOTICE 'Created typing_indicators policies with channel_id + profile_id (mixed)';
    
  ELSIF has_channel_id AND has_user_id AND mcm_has_profile_id THEN
    -- Mixed: channel_id + user_id with messaging_channel_members.profile_id
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
    RAISE NOTICE 'Created typing_indicators policies with channel_id + user_id (mixed)';
    
  ELSIF has_channel_id AND has_user_id AND mcm_has_user_id THEN
    -- Old structure: channel_id + user_id with messaging_channel_members.user_id
    CREATE POLICY typing_indicators_select_member
      ON public.typing_indicators
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.messaging_channel_members mcm
          WHERE mcm.channel_id = typing_indicators.channel_id
            AND mcm.user_id = auth.uid()
            AND (mcm.left_at IS NULL)
        )
      );
    
    CREATE POLICY typing_indicators_upsert_own
      ON public.typing_indicators
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.messaging_channel_members mcm
          WHERE mcm.channel_id = typing_indicators.channel_id
            AND mcm.user_id = auth.uid()
            AND (mcm.left_at IS NULL)
        )
      );
    RAISE NOTICE 'Created typing_indicators policies with channel_id + user_id (old)';
  ELSE
    RAISE NOTICE 'Could not determine typing_indicators structure for policies';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: FIX messaging_channel_members UNIQUE CONSTRAINT
-- ============================================================================
DO $$
DECLARE
  has_profile_id BOOLEAN;
  has_user_id BOOLEAN;
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_channel_members'
  ) THEN
    -- Check what columns exist
    SELECT 
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messaging_channel_members' AND column_name = 'profile_id'),
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messaging_channel_members' AND column_name = 'user_id')
    INTO has_profile_id, has_user_id;
    
    RAISE NOTICE 'messaging_channel_members: profile_id=%, user_id=%', has_profile_id, has_user_id;
    
    -- Drop old unique constraint if it exists on wrong columns
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'messaging_channel_members_channel_user_unique'
      AND table_schema = 'public'
      AND table_name = 'messaging_channel_members'
    ) THEN
      ALTER TABLE public.messaging_channel_members DROP CONSTRAINT messaging_channel_members_channel_user_unique;
      RAISE NOTICE 'Dropped old unique constraint';
    END IF;
    
    -- Add correct unique constraint for upsert to work
    IF has_profile_id THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messaging_channel_members_channel_profile_unique'
        AND table_schema = 'public'
        AND table_name = 'messaging_channel_members'
      ) THEN
        ALTER TABLE public.messaging_channel_members
        ADD CONSTRAINT messaging_channel_members_channel_profile_unique 
        UNIQUE (channel_id, profile_id);
        RAISE NOTICE 'Added unique constraint on (channel_id, profile_id)';
      END IF;
    ELSIF has_user_id THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messaging_channel_members_channel_user_unique'
        AND table_schema = 'public'
        AND table_name = 'messaging_channel_members'
      ) THEN
        ALTER TABLE public.messaging_channel_members
        ADD CONSTRAINT messaging_channel_members_channel_user_unique 
        UNIQUE (channel_id, user_id);
        RAISE NOTICE 'Added unique constraint on (channel_id, user_id)';
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: VERIFY messaging_channel_members INSERT POLICY
-- ============================================================================
DO $$
DECLARE
  has_profile_id BOOLEAN;
  has_user_id BOOLEAN;
BEGIN
  -- Enable RLS
  ALTER TABLE public.messaging_channel_members ENABLE ROW LEVEL SECURITY;
  
  -- Check if INSERT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'messaging_channel_members' 
    AND policyname LIKE '%insert%'
  ) THEN
    -- Check column structure
    SELECT 
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messaging_channel_members' AND column_name = 'profile_id'),
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messaging_channel_members' AND column_name = 'user_id')
    INTO has_profile_id, has_user_id;
    
    IF has_profile_id THEN
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
    ELSIF has_user_id THEN
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
            WHERE p.id = messaging_channel_members.user_id
              AND p.company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
              )
          )
        );
      RAISE NOTICE 'Created messaging_channel_members INSERT policy with user_id';
    END IF;
  ELSE
    RAISE NOTICE 'messaging_channel_members INSERT policy already exists';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Fix complete! Check the notices above for what was created.' as status;
