-- Migration: Auto-update last_message_at when messages are inserted
-- This ensures conversations are sorted by latest activity
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if both tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messaging_messages')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messaging_channels') THEN

    -- Create function to update channel's last_message_at
    CREATE OR REPLACE FUNCTION update_channel_last_message()
    RETURNS TRIGGER AS $function$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messaging_channels') THEN
        UPDATE messaging_channels
        SET last_message_at = NEW.created_at
        WHERE id = NEW.channel_id;
      END IF;
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    -- Create trigger to auto-update on message insert
    DROP TRIGGER IF EXISTS messaging_messages_update_channel ON messaging_messages;
    CREATE TRIGGER messaging_messages_update_channel
    AFTER INSERT ON messaging_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_channel_last_message();

    -- Add index for fast sorting by last_message_at
    CREATE INDEX IF NOT EXISTS idx_messaging_channels_last_message 
    ON messaging_channels (last_message_at DESC NULLS LAST);

    -- Add comment
    COMMENT ON FUNCTION update_channel_last_message() IS 'Automatically updates messaging_channels.last_message_at when a new message is inserted';

  ELSE
    RAISE NOTICE '⚠️ messaging_messages or messaging_channels tables do not exist yet - skipping trigger creation';
  END IF;
END $$;

