-- ============================================================================
-- COMPLETE FIX FOR MESSAGING RLS ISSUES
-- This script:
-- 1. Fixes typing_indicators unique constraint (for ON CONFLICT to work)
-- 2. Fixes messaging_messages RLS policies (matches actual column names)
-- 3. Fixes typing_indicators RLS policies (matches actual table structure)
-- ============================================================================

-- ============================================================================
-- STEP 1: FIX typing_indicators UNIQUE CONSTRAINT
-- ============================================================================
-- The ON CONFLICT error happens because the unique constraint doesn't match
-- the actual table structure (channel_id vs conversation_id)

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'typing_indicators'
  ) THEN
    -- Check what columns actually exist
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'typing_indicators' 
      AND column_name = 'channel_id'
    ) THEN
      -- Table uses channel_id (new structure)
      -- Drop old primary key if it exists on conversation_id
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'typing_indicators_pkey'
        AND table_schema = 'public'
        AND table_name = 'typing_indicators'
      ) THEN
        -- Check if the constraint is on the wrong columns
        IF EXISTS (
          SELECT 1 FROM information_schema.constraint_column_usage
          WHERE constraint_name = 'typing_indicators_pkey'
          AND table_schema = 'public'
          AND column_name = 'conversation_id'
        ) THEN
          -- Drop old constraint
          ALTER TABLE public.typing_indicators DROP CONSTRAINT typing_indicators_pkey;
          RAISE NOTICE 'Dropped old primary key on (conversation_id, user_id)';
        END IF;
      END IF;
      
      -- Add correct unique constraint if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'typing_indicators_channel_user_unique'
        AND table_schema = 'public'
        AND table_name = 'typing_indicators'
      ) THEN
        ALTER TABLE public.typing_indicators
        ADD CONSTRAINT typing_indicators_channel_user_unique 
        UNIQUE (channel_id, user_id);
        
        RAISE NOTICE 'Added unique constraint on (channel_id, user_id)';
      END IF;
      
      -- Also ensure primary key exists if needed
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'typing_indicators_pkey'
        AND table_schema = 'public'
        AND table_name = 'typing_indicators'
      ) THEN
        ALTER TABLE public.typing_indicators
        ADD PRIMARY KEY (channel_id, user_id);
        
        RAISE NOTICE 'Added primary key on (channel_id, user_id)';
      END IF;
      
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'typing_indicators' 
      AND column_name = 'conversation_id'
    ) THEN
      -- Table uses conversation_id (old structure)
      -- Ensure unique constraint exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'typing_indicators_pkey'
        AND table_schema = 'public'
        AND table_name = 'typing_indicators'
      ) THEN
        ALTER TABLE public.typing_indicators
        ADD PRIMARY KEY (conversation_id, user_id);
        
        RAISE NOTICE 'Added primary key on (conversation_id, user_id)';
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: FIX messaging_messages RLS POLICIES
-- ============================================================================
-- Check actual column names and create correct policies

DO $$
BEGIN
  -- Enable RLS
  ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;
  
  -- Drop all existing INSERT policies
  DROP POLICY IF EXISTS messaging_messages_insert_member ON public.messaging_messages;
  DROP POLICY IF EXISTS "messaging_messages_insert_member" ON public.messaging_messages;
  DROP POLICY IF EXISTS "Members can post messages" ON public.messaging_messages;
  DROP POLICY IF EXISTS messages_insert_participant ON public.messaging_messages;
  DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.messaging_messages;
  
  -- Check actual column structure and create correct policy
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_messages' 
    AND column_name = 'sender_profile_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_channel_members' 
    AND column_name = 'profile_id'
  ) THEN
    -- Use sender_profile_id and profile_id (correct columns)
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
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_channel_members' 
    AND column_name = 'profile_id'
  ) THEN
    -- Use sender_id with profile_id (mixed schema)
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
    
    RAISE NOTICE 'Created messaging_messages INSERT policy with sender_id (fallback)';
    
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_messages' 
    AND column_name = 'sender_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_channel_members' 
    AND column_name = 'user_id'
  ) THEN
    -- Use sender_id with user_id (old schema)
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
    
    RAISE NOTICE 'Created messaging_messages INSERT policy with sender_id and user_id (old schema)';
  ELSE
    RAISE NOTICE 'Could not determine correct column structure for messaging_messages INSERT policy';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: FIX typing_indicators RLS POLICIES
-- ============================================================================
-- Update policies to match actual table structure (channel_id vs conversation_id)

DO $$
BEGIN
  -- Enable RLS
  ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
  
  -- Drop all existing policies
  DROP POLICY IF EXISTS typing_indicators_select_participant ON public.typing_indicators;
  DROP POLICY IF EXISTS typing_indicators_upsert_own ON public.typing_indicators;
  DROP POLICY IF EXISTS "typing_indicators_upsert_own" ON public.typing_indicators;
  
  -- Check if table uses channel_id (new structure)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'typing_indicators' 
    AND column_name = 'channel_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_channel_members' 
    AND column_name = 'profile_id'
  ) THEN
    -- Use channel_id with messaging_channel_members (new structure)
    
    -- SELECT policy: Users can view typing indicators in channels they're members of
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
    
    -- UPSERT policy: Users can update their own typing status
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
    
    RAISE NOTICE 'Created typing_indicators policies with channel_id and profile_id';
    
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'typing_indicators' 
    AND column_name = 'channel_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_channel_members' 
    AND column_name = 'user_id'
  ) THEN
    -- Use channel_id with user_id (mixed schema)
    
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
    
    RAISE NOTICE 'Created typing_indicators policies with channel_id and user_id';
    
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'typing_indicators' 
    AND column_name = 'conversation_id'
  ) THEN
    -- Use conversation_id (old structure with conversation_participants)
    
    CREATE POLICY typing_indicators_select_participant
      ON public.typing_indicators
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.conversation_participants cp
          WHERE cp.conversation_id = typing_indicators.conversation_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
      );
    
    CREATE POLICY typing_indicators_upsert_own
      ON public.typing_indicators
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.conversation_participants cp
          WHERE cp.conversation_id = typing_indicators.conversation_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
      );
    
    RAISE NOTICE 'Created typing_indicators policies with conversation_id (old structure)';
  ELSE
    RAISE NOTICE 'Could not determine correct structure for typing_indicators policies';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the fixes worked:

-- Check typing_indicators constraints
SELECT 
  constraint_name, 
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'typing_indicators'
AND table_schema = 'public';

-- Check messaging_messages RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_messages'
AND schemaname = 'public';

-- Check typing_indicators RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'typing_indicators'
AND schemaname = 'public';

-- Check actual column names
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('messaging_messages', 'typing_indicators', 'messaging_channel_members')
ORDER BY table_name, ordinal_position;
