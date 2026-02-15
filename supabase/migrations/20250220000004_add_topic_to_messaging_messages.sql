-- Add topic column to messaging_messages table for per-message topic tagging
-- This allows users to tag individual messages with topics instead of entire conversations
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if messaging_messages table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messaging_messages') THEN

    ALTER TABLE messaging_messages
    ADD COLUMN IF NOT EXISTS topic TEXT CHECK (topic IN (
      'safety',
      'maintenance',
      'operations',
      'hr',
      'compliance',
      'incidents',
      'general'
    ));

    -- Create index for efficient topic filtering
    CREATE INDEX IF NOT EXISTS idx_messaging_messages_topic 
    ON messaging_messages(topic) 
    WHERE topic IS NOT NULL;

    -- Add comment
    COMMENT ON COLUMN messaging_messages.topic IS 'Topic tag for this message (safety, maintenance, operations, hr, compliance, incidents, general). Allows filtering messages across all conversations by topic.';

  ELSE
    RAISE NOTICE '⚠️ messaging_messages table does not exist yet - skipping topic column addition';
  END IF;
END $$;

