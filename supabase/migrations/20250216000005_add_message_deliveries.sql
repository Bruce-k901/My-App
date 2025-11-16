-- ============================================================================
-- Migration: Add Message Deliveries Table
-- Description: Tracks when messages are delivered (seen) and read by recipients
-- ============================================================================

BEGIN;

-- Create message_deliveries table for tracking delivered status
CREATE TABLE IF NOT EXISTS public.message_deliveries (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_message_deliveries_message_id ON public.message_deliveries(message_id);
CREATE INDEX IF NOT EXISTS idx_message_deliveries_user_id ON public.message_deliveries(user_id);

-- Enable RLS
ALTER TABLE public.message_deliveries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see deliveries for messages in their conversations
CREATE POLICY message_deliveries_select_conversation
  ON public.message_deliveries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      JOIN public.messages m ON m.id = message_deliveries.message_id
      WHERE cp.conversation_id = m.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

-- Policy: Users can insert deliveries for messages they receive
CREATE POLICY message_deliveries_insert_own
  ON public.message_deliveries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_deliveries.message_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
        AND message_deliveries.user_id = auth.uid()
    )
  );

COMMIT;

