    -- Add topic column to messaging_messages table for per-message topic tagging
    -- This allows users to tag individual messages with topics instead of entire conversations

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

