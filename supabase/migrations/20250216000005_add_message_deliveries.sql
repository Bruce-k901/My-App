-- ============================================================================
-- Migration: Add Message Deliveries Table
-- Description: Tracks when messages are delivered (seen) and read by recipients
-- Note: This migration will be skipped if messages or profiles tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Create message_deliveries table for tracking delivered status
    CREATE TABLE IF NOT EXISTS public.message_deliveries (
      message_id UUID NOT NULL,
      user_id UUID NOT NULL,
      delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (message_id, user_id)
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'message_deliveries_message_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'message_deliveries'
    ) THEN
      ALTER TABLE public.message_deliveries 
      ADD CONSTRAINT message_deliveries_message_id_fkey 
      FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'message_deliveries_user_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'message_deliveries'
    ) THEN
      ALTER TABLE public.message_deliveries 
      ADD CONSTRAINT message_deliveries_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

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
  ELSE
    RAISE NOTICE '⚠️ messages or profiles tables do not exist yet - skipping message_deliveries table creation';
  END IF;
END $$;

