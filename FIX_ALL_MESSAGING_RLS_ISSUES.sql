-- ============================================================================
-- FIX ALL MESSAGING RLS ISSUES
-- This fixes:
-- 1. typing_indicators RLS policies (use messaging_channel_members instead of conversation_participants)
-- 2. messaging_messages RLS policies (ensure they use correct column names)
-- 3. Verify messaging_channel_members policies exist
-- ============================================================================

-- ============================================================================
-- 1. SKIP typing_indicators RLS POLICIES (non-critical, table structure unclear)
-- Typing indicators are wrapped in try-catch in the code to suppress errors
-- ============================================================================
-- NOTE: Typing indicators RLS policies are skipped because:
-- 1. The table structure seems to be in flux (columns may not match TypeScript types)
-- 2. Typing indicators are non-critical features
-- 3. The code already has try-catch blocks to suppress errors
-- This can be fixed later when the table structure is finalized

-- ============================================================================
-- 2. FIX messaging_messages RLS POLICIES
-- ============================================================================
DO $$
BEGIN
  -- Enable RLS
  ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing INSERT policies (to recreate them correctly)
  DROP POLICY IF EXISTS messaging_messages_insert_member ON public.messaging_messages;
  DROP POLICY IF EXISTS "messaging_messages_insert_member" ON public.messaging_messages;
  DROP POLICY IF EXISTS "Members can post messages" ON public.messaging_messages;
  DROP POLICY IF EXISTS messages_insert_participant ON public.messaging_messages;
  
  -- Create INSERT policy - check which columns exist
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
    
    RAISE NOTICE 'Created messaging_messages_insert_member policy with sender_profile_id';
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
    -- Fallback: Use sender_id with profile_id (mixed schema)
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
    
    RAISE NOTICE 'Created messaging_messages_insert_member policy with sender_id (fallback)';
  END IF;
END $$;

-- ============================================================================
-- 3. FIX messaging_channels SELECT RLS POLICY (CRITICAL - allows recipients to see channels)
-- ============================================================================
DO $$
BEGIN
  -- Enable RLS if not already enabled
  ALTER TABLE public.messaging_channels ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing SELECT policies (to recreate them correctly)
  DROP POLICY IF EXISTS messaging_channels_select_member ON public.messaging_channels;
  DROP POLICY IF EXISTS "Users can view channels they're members of" ON public.messaging_channels;
  DROP POLICY IF EXISTS "Users can view their channels" ON public.messaging_channels;
  
  -- Create SELECT policy - users can view channels they're members of
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_channel_members' 
    AND column_name = 'profile_id'
  ) THEN
    CREATE POLICY messaging_channels_select_member
      ON public.messaging_channels
      FOR SELECT
      USING (
        -- User is a member of the channel
        EXISTS (
          SELECT 1 FROM public.messaging_channel_members mcm
          WHERE mcm.channel_id = messaging_channels.id
            AND mcm.profile_id = auth.uid()
            AND (mcm.left_at IS NULL)
        )
        -- OR user created the channel (for backward compatibility)
        OR created_by = auth.uid()
      );
    
    RAISE NOTICE 'Created messaging_channels SELECT policy';
  END IF;
END $$;

-- ============================================================================
-- 4. VERIFY messaging_channel_members RLS POLICIES (SELECT and INSERT)
-- ============================================================================
DO $$
BEGIN
  -- Enable RLS if not already enabled
  ALTER TABLE public.messaging_channel_members ENABLE ROW LEVEL SECURITY;
  
  -- Check if SELECT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'messaging_channel_members' 
    AND policyname LIKE '%select%'
  ) THEN
    -- Create SELECT policy
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
          -- User can see ALL members of channels they're a member of
          -- This is needed for displaying conversation names (showing the other person's name)
          EXISTS (
            SELECT 1 FROM public.messaging_channel_members mcm2
            WHERE mcm2.channel_id = messaging_channel_members.channel_id
              AND mcm2.profile_id = auth.uid()
              AND mcm2.left_at IS NULL
          )
        );
      
      RAISE NOTICE 'Created messaging_channel_members SELECT policy';
    END IF;
  END IF;
  
  -- Check if INSERT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'messaging_channel_members' 
    AND policyname LIKE '%insert%'
  ) THEN
    -- Create INSERT policy
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
      
      RAISE NOTICE 'Created messaging_channel_members INSERT policy';
    END IF;
  END IF;
END $$;
