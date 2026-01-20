-- ============================================================================
-- IMMEDIATE FIX: Fix RLS Policies for messaging_messages Table
-- Description: Drop and recreate RLS policies with correct column names
-- Run this directly in Supabase SQL Editor to fix the issue immediately
-- ============================================================================

-- Step 1: Drop all existing policies on messaging_messages
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

-- Step 2: Enable RLS
ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SELECT policy - users can view messages in channels they're members of
-- Use profile_id (the correct column after identity standardization)
CREATE POLICY "messaging_messages_select_member"
  ON public.messaging_messages
  FOR SELECT
  USING (
    (deleted_at IS NULL)
    AND EXISTS (
      SELECT 1 FROM public.messaging_channel_members mcm
      WHERE mcm.channel_id = messaging_messages.channel_id
        AND mcm.profile_id = auth.uid()
        AND (mcm.left_at IS NULL)
    )
  );

-- Step 4: Create INSERT policy - users can send messages if they're channel members
-- Use sender_profile_id (the correct column name)
CREATE POLICY "messaging_messages_insert_member"
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

-- Step 5: Create UPDATE policy - users can edit their own messages
CREATE POLICY "messaging_messages_update_sender"
  ON public.messaging_messages
  FOR UPDATE
  USING (sender_profile_id = auth.uid())
  WITH CHECK (sender_profile_id = auth.uid());

-- Step 6: Create DELETE policy (soft delete via UPDATE) - users can delete their own messages
CREATE POLICY "messaging_messages_delete_sender"
  ON public.messaging_messages
  FOR UPDATE
  USING (sender_profile_id = auth.uid())
  WITH CHECK (sender_profile_id = auth.uid() AND deleted_at IS NOT NULL);

-- Verify policies were created
SELECT 
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'messaging_messages'
ORDER BY cmd, policyname;
