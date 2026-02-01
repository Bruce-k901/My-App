-- Migration: Add pinned columns to messaging_channels table
-- This allows users to pin important conversations to the top
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if messaging_channels table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messaging_channels') THEN

    -- Add pinned columns to messaging_channels
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

    -- Create index for filtering pinned conversations
    CREATE INDEX IF NOT EXISTS idx_messaging_channels_pinned 
    ON messaging_channels (is_pinned, pinned_at DESC NULLS LAST);

    -- Add comment
    COMMENT ON COLUMN messaging_channels.is_pinned IS 'Whether this conversation is pinned to the top';
    COMMENT ON COLUMN messaging_channels.pinned_at IS 'When this conversation was pinned';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messaging_channels' AND column_name = 'pinned_by') THEN
      COMMENT ON COLUMN messaging_channels.pinned_by IS 'User who pinned this conversation';
    END IF;

    -- Update RLS policy to allow users to pin/unpin channels they're members of
    -- Only if messaging_channel_members table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messaging_channel_members') THEN
      -- First, drop existing update policy if it exists
      DROP POLICY IF EXISTS "Users can update their channels" ON messaging_channels;

      -- Create policy that allows channel members to update channel properties including is_pinned
      -- Check which column name exists (user_id or profile_id) and create policy accordingly
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'messaging_channel_members' 
          AND column_name = 'profile_id'
      ) THEN
        -- Use profile_id column
        CREATE POLICY "Users can update their channels" ON messaging_channels
        FOR UPDATE 
        USING (
          id IN (
            SELECT channel_id 
            FROM messaging_channel_members 
            WHERE profile_id = auth.uid() 
            AND left_at IS NULL
          )
        )
        WITH CHECK (
          id IN (
            SELECT channel_id 
            FROM messaging_channel_members 
            WHERE profile_id = auth.uid() 
            AND left_at IS NULL
          )
        );
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'messaging_channel_members' 
          AND column_name = 'user_id'
      ) THEN
        -- Use user_id column
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
      ELSE
        RAISE NOTICE 'No user_id or profile_id column found in messaging_channel_members - skipping policy creation';
      END IF;
    END IF;

    -- Reload schema
    NOTIFY pgrst, 'reload schema';

  ELSE
    RAISE NOTICE '⚠️ messaging_channels table does not exist yet - skipping pinned columns addition';
  END IF;
END $$;

