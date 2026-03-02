-- ============================================================================
-- Migration: Fix RLS Policies for messaging_messages Table
-- Description: Updates RLS policies to use sender_profile_id instead of sender_id/user_id
--              and profile_id for messaging_channel_members references
-- Note: This migration will be skipped if messaging_messages table doesn't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if messaging_messages table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messaging_messages') THEN
    
    -- Enable RLS if not already enabled
    ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;

    -- ============================================================================
    -- Drop all existing policies that might use old column names
    -- ============================================================================
    DROP POLICY IF EXISTS "Members can post messages" ON public.messaging_messages;
    DROP POLICY IF EXISTS "Users can edit own messages" ON public.messaging_messages;
    DROP POLICY IF EXISTS "Users can view messages in channels" ON public.messaging_messages;
    DROP POLICY IF EXISTS "messaging_messages_insert_member" ON public.messaging_messages;
    DROP POLICY IF EXISTS "messaging_messages_select_member" ON public.messaging_messages;
    DROP POLICY IF EXISTS "messaging_messages_update_sender" ON public.messaging_messages;
    DROP POLICY IF EXISTS "messaging_messages_delete_sender" ON public.messaging_messages;
    DROP POLICY IF EXISTS messages_insert_participant ON public.messaging_messages;
    DROP POLICY IF EXISTS messages_select_participant ON public.messaging_messages;
    DROP POLICY IF EXISTS messages_update_sender ON public.messaging_messages;
    DROP POLICY IF EXISTS messages_delete_sender ON public.messaging_messages;

    -- ============================================================================
    -- CREATE NEW POLICIES USING CORRECT COLUMN NAMES
    -- ============================================================================

    -- SELECT: Users can view messages in channels they're members of
    -- Use dynamic SQL to handle both profile_id and user_id columns
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'messaging_channel_members'
    ) THEN
      -- Check which columns exist in messaging_channel_members
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messaging_channel_members' 
        AND column_name = 'profile_id'
      ) THEN
        -- Use profile_id (new column)
        CREATE POLICY "messaging_messages_select_member"
          ON public.messaging_messages
          FOR SELECT
          USING (
            deleted_at IS NULL
            AND EXISTS (
              SELECT 1 FROM public.messaging_channel_members mcm
              WHERE mcm.channel_id = messaging_messages.channel_id
                AND mcm.profile_id = auth.uid()
                AND mcm.left_at IS NULL
            )
          );
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messaging_channel_members' 
        AND column_name = 'user_id'
      ) THEN
        -- Use user_id (old column - backward compatibility)
        CREATE POLICY "messaging_messages_select_member"
          ON public.messaging_messages
          FOR SELECT
          USING (
            deleted_at IS NULL
            AND EXISTS (
              SELECT 1 FROM public.messaging_channel_members mcm
              WHERE mcm.channel_id = messaging_messages.channel_id
                AND mcm.user_id = auth.uid()
                AND mcm.left_at IS NULL
            )
          );
      END IF;
    END IF;

    -- INSERT: Users can send messages to channels they're members of
    -- Check if messaging_messages has sender_profile_id column (correct column name)
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
      -- Use sender_profile_id and profile_id (correct columns after identity standardization)
      CREATE POLICY "messaging_messages_insert_member"
        ON public.messaging_messages
        FOR INSERT
        WITH CHECK (
          sender_profile_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM public.messaging_channel_members mcm
            WHERE mcm.channel_id = messaging_messages.channel_id
              AND mcm.profile_id = auth.uid()
              AND mcm.left_at IS NULL
          )
        );
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
      -- Fallback: Use old column names if migration hasn't happened yet
      CREATE POLICY "messaging_messages_insert_member"
        ON public.messaging_messages
        FOR INSERT
        WITH CHECK (
          sender_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM public.messaging_channel_members mcm
            WHERE mcm.channel_id = messaging_messages.channel_id
              AND mcm.user_id = auth.uid()
              AND mcm.left_at IS NULL
          )
        );
    END IF;

    -- UPDATE: Users can update their own messages
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messaging_messages' 
      AND column_name = 'sender_profile_id'
    ) THEN
      CREATE POLICY "messaging_messages_update_sender"
        ON public.messaging_messages
        FOR UPDATE
        USING (sender_profile_id = auth.uid())
        WITH CHECK (sender_profile_id = auth.uid());
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messaging_messages' 
      AND column_name = 'sender_id'
    ) THEN
      CREATE POLICY "messaging_messages_update_sender"
        ON public.messaging_messages
        FOR UPDATE
        USING (sender_id = auth.uid())
        WITH CHECK (sender_id = auth.uid());
    END IF;

    -- DELETE/Soft Delete: Users can soft-delete their own messages
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messaging_messages' 
      AND column_name = 'sender_profile_id'
    ) THEN
      CREATE POLICY "messaging_messages_delete_sender"
        ON public.messaging_messages
        FOR UPDATE
        USING (sender_profile_id = auth.uid())
        WITH CHECK (sender_profile_id = auth.uid() AND deleted_at IS NOT NULL);
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messaging_messages' 
      AND column_name = 'sender_id'
    ) THEN
      CREATE POLICY "messaging_messages_delete_sender"
        ON public.messaging_messages
        FOR UPDATE
        USING (sender_id = auth.uid())
        WITH CHECK (sender_id = auth.uid() AND deleted_at IS NOT NULL);
    END IF;

    RAISE NOTICE '✅ messaging_messages RLS policies updated successfully';
  ELSE
    RAISE NOTICE '⚠️ messaging_messages table does not exist yet - skipping RLS policy fixes';
  END IF;
END $$;
