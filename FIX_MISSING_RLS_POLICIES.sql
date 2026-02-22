-- ============================================================================
-- Fix missing RLS policies for messaging_messages and typing_indicators
-- ============================================================================

-- Check what policies exist
SELECT 
  'Existing Policies' as check_type,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('messaging_messages', 'typing_indicators')
ORDER BY tablename, policyname;

-- ============================================================================
-- Fix messaging_messages RLS policies
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies
  DROP POLICY IF EXISTS messaging_messages_insert_member ON public.messaging_messages;
  DROP POLICY IF EXISTS messaging_messages_select_member ON public.messaging_messages;
  DROP POLICY IF EXISTS messaging_messages_update_sender ON public.messaging_messages;
  DROP POLICY IF EXISTS messaging_messages_delete_sender ON public.messaging_messages;
  DROP POLICY IF EXISTS "Platform admins can view all messages" ON public.messaging_messages;
  DROP POLICY IF EXISTS "Users can view channel messages" ON public.messaging_messages;
  
  -- INSERT: Users can insert messages if they're a member of the channel
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
  
  -- SELECT: Users can view messages in channels they're members of
  CREATE POLICY messaging_messages_select_member
    ON public.messaging_messages
    FOR SELECT
    USING (
      deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.messaging_channel_members mcm
        WHERE mcm.channel_id = messaging_messages.channel_id
          AND mcm.profile_id = auth.uid()
          AND (mcm.left_at IS NULL)
      )
    );
  
  -- UPDATE: Users can update their own messages
  CREATE POLICY messaging_messages_update_sender
    ON public.messaging_messages
    FOR UPDATE
    USING (sender_profile_id = auth.uid())
    WITH CHECK (sender_profile_id = auth.uid());
  
  -- UPDATE for soft delete: Users can mark their own messages as deleted
  CREATE POLICY messaging_messages_delete_sender
    ON public.messaging_messages
    FOR UPDATE
    USING (
      sender_profile_id = auth.uid()
      AND deleted_at IS NOT NULL
    )
    WITH CHECK (
      sender_profile_id = auth.uid()
      AND deleted_at IS NOT NULL
    );
  
  RAISE NOTICE '✅ Created messaging_messages RLS policies';
END $$;

-- ============================================================================
-- Fix typing_indicators RLS policies
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies
  DROP POLICY IF EXISTS typing_indicators_select_member ON public.typing_indicators;
  DROP POLICY IF EXISTS typing_indicators_upsert_own ON public.typing_indicators;
  
  -- SELECT: Users can see typing indicators in channels they're members of
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
  
  -- ALL (INSERT/UPDATE/DELETE): Users can manage their own typing indicators if they're channel members
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

-- Verification
SELECT 
  '✅ Policies created' as status,
  'Run VERIFY_RLS_POLICIES.sql to confirm' as next_step;
