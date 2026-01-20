-- Add topic-based organization to conversations
-- This is a key Zenzap feature that helps organize chats by subject matter
-- Note: This migration will be skipped if conversations or messages tables don't exist yet

DO $$
BEGIN
  -- Only proceed if conversations table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    -- Add new columns to conversations table
    ALTER TABLE public.conversations 
    ADD COLUMN IF NOT EXISTS topic TEXT,
    ADD COLUMN IF NOT EXISTS topic_category TEXT CHECK (topic_category IN (
      'safety',
      'maintenance', 
      'operations',
      'hr',
      'compliance',
      'incidents',
      'general'
    )),
    ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS context_type TEXT CHECK (context_type IN (
      'site',
      'asset',
      'task',
      'team',
      'general'
    )),
    ADD COLUMN IF NOT EXISTS context_id UUID;

    -- Add indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_conversations_topic_category ON public.conversations(topic_category);
    CREATE INDEX IF NOT EXISTS idx_conversations_context ON public.conversations(context_type, context_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON public.conversations(is_pinned) WHERE is_pinned = TRUE;

    -- Add comments
    COMMENT ON COLUMN public.conversations.topic IS 'Free-text topic/subject for the conversation (Zenzap-style)';
    COMMENT ON COLUMN public.conversations.topic_category IS 'Predefined category for filtering conversations';
    COMMENT ON COLUMN public.conversations.context_type IS 'What this conversation is linked to (site, asset, task, etc.)';
    COMMENT ON COLUMN public.conversations.context_id IS 'ID of the linked entity';
    COMMENT ON COLUMN public.conversations.is_pinned IS 'Whether this conversation is pinned to the top';
  ELSE
    RAISE NOTICE '⚠️ conversations table does not exist yet - skipping column additions';
  END IF;

  -- Only proceed if messages table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    -- Add new columns to messages table for task conversion and workflow actions
    ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS is_task BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

    -- Add task_id column conditionally (only if tasks table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
      ALTER TABLE public.messages
      ADD COLUMN IF NOT EXISTS task_id UUID;

      -- Add foreign key constraint conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_task_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'messages'
      ) THEN
        ALTER TABLE public.messages
        ADD CONSTRAINT messages_task_id_fkey
        FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;
      END IF;
    ELSE
      -- Add column without foreign key if tasks table doesn't exist
      ALTER TABLE public.messages
      ADD COLUMN IF NOT EXISTS task_id UUID;
    END IF;

    -- Add indexes for messages
    CREATE INDEX IF NOT EXISTS idx_messages_is_task ON public.messages(is_task) WHERE is_task = TRUE;
    CREATE INDEX IF NOT EXISTS idx_messages_task_id ON public.messages(task_id) WHERE task_id IS NOT NULL;

    COMMENT ON COLUMN public.messages.is_task IS 'Whether this message has been converted to a task';
    COMMENT ON COLUMN public.messages.task_id IS 'Reference to the task created from this message';
    COMMENT ON COLUMN public.messages.is_system IS 'Whether this is a system-generated message';
  ELSE
    RAISE NOTICE '⚠️ messages table does not exist yet - skipping column additions';
  END IF;

  -- Update tasks table to link back to messages (if tasks table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS created_from_message_id UUID;

    -- Add foreign key constraint conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'tasks_created_from_message_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'tasks'
    ) THEN
      ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_created_from_message_id_fkey
      FOREIGN KEY (created_from_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;
    END IF;
    
    CREATE INDEX IF NOT EXISTS idx_tasks_created_from_message ON public.tasks(created_from_message_id) WHERE created_from_message_id IS NOT NULL;
  END IF;
END $$;

