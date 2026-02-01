-- Migration: Setup topics and pinning for messaging_channels
-- This ensures all required columns exist and sets default topics for existing channels
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if messaging_channels table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messaging_channels') THEN

    -- Add topic column if missing (for display topic with emoji)
    ALTER TABLE messaging_channels 
    ADD COLUMN IF NOT EXISTS topic TEXT;

    -- Add topic_category if missing (for filtering)
    ALTER TABLE messaging_channels 
    ADD COLUMN IF NOT EXISTS topic_category TEXT CHECK (topic_category IN (
      'safety',
      'maintenance', 
      'operations',
      'hr',
      'compliance',
      'incidents',
      'general'
    ));

    -- Add pinning columns if missing
    ALTER TABLE messaging_channels 
    ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

    -- Add pinned_by column conditionally (only if profiles exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      -- Check if column already exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messaging_channels' 
        AND column_name = 'pinned_by'
      ) THEN
        ALTER TABLE messaging_channels 
        ADD COLUMN pinned_by UUID;
        
        -- Add foreign key constraint
        ALTER TABLE messaging_channels
        ADD CONSTRAINT messaging_channels_pinned_by_fkey
        FOREIGN KEY (pinned_by) REFERENCES profiles(id);
      END IF;
    END IF;

    -- Set default topic_category for existing channels that don't have one
    UPDATE messaging_channels
    SET topic_category = 'general'
    WHERE topic_category IS NULL;

    -- Set default topic for existing channels that don't have one
    UPDATE messaging_channels
    SET topic = '💬 General'
    WHERE topic IS NULL;

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_messaging_channels_topic_category 
    ON messaging_channels(topic_category);

    CREATE INDEX IF NOT EXISTS idx_messaging_channels_topic 
    ON messaging_channels(topic) WHERE topic IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_messaging_channels_pinned 
    ON messaging_channels (is_pinned, pinned_at DESC NULLS LAST);

    -- Update RLS policy to allow users to pin/unpin channels they're members of
    -- Only if messaging_channel_members table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messaging_channel_members') THEN
      DROP POLICY IF EXISTS "Users can update their channels" ON messaging_channels;

      CREATE POLICY "Users can update their channels" ON messaging_channels
      FOR UPDATE 
      USING (
        id IN (
          SELECT channel_id 
          FROM messaging_channel_members 
          WHERE user_id = auth.uid() 
          AND left_at IS NULL
        )
      )
      WITH CHECK (
        id IN (
          SELECT channel_id 
          FROM messaging_channel_members 
          WHERE user_id = auth.uid() 
          AND left_at IS NULL
        )
      );
    END IF;

    -- Add comments
    COMMENT ON COLUMN messaging_channels.topic IS 'Display topic with emoji (e.g., 🛡️ Safety)';
    COMMENT ON COLUMN messaging_channels.topic_category IS 'Category for filtering (safety, maintenance, etc.)';
    COMMENT ON COLUMN messaging_channels.is_pinned IS 'Whether this conversation is pinned to the top';
    COMMENT ON COLUMN messaging_channels.pinned_at IS 'When this conversation was pinned';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messaging_channels' AND column_name = 'pinned_by') THEN
      COMMENT ON COLUMN messaging_channels.pinned_by IS 'User who pinned this conversation';
    END IF;

    -- Reload schema
    NOTIFY pgrst, 'reload schema';

  ELSE
    RAISE NOTICE '⚠️ messaging_channels table does not exist yet - skipping topics and pinning setup';
  END IF;
END $$;

