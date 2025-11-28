-- ============================================================================
-- Fix Notifications Table Schema
-- Adds missing columns needed for task notifications
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add missing columns
-- ============================================================================

-- Add severity column (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'severity'
  ) THEN
    ALTER TABLE notifications ADD COLUMN severity text;
    -- Set default values for existing rows
    UPDATE notifications SET severity = 'info' WHERE severity IS NULL;
    -- Add NOT NULL constraint
    ALTER TABLE notifications ALTER COLUMN severity SET NOT NULL;
    -- Add check constraint
    ALTER TABLE notifications ADD CONSTRAINT notifications_severity_check 
      CHECK (severity IN ('info', 'warning', 'critical'));
    RAISE NOTICE '✅ Added severity column';
  ELSE
    RAISE NOTICE 'severity column already exists';
  END IF;
END $$;

-- Add task_id column (if missing) - needed for task notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'task_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN task_id UUID REFERENCES checklist_tasks(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON notifications(task_id) WHERE task_id IS NOT NULL;
    RAISE NOTICE '✅ Added task_id column';
  ELSE
    RAISE NOTICE 'task_id column already exists';
  END IF;
END $$;

-- Add push_sent column (if missing) - optional, for push notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'push_sent'
  ) THEN
    ALTER TABLE notifications ADD COLUMN push_sent BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_notifications_push_pending ON notifications(push_sent, created_at) WHERE push_sent = false;
    RAISE NOTICE '✅ Added push_sent column';
  ELSE
    RAISE NOTICE 'push_sent column already exists';
  END IF;
END $$;

-- Add conversation_id column (if missing) - for message notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'conversation_id'
  ) THEN
    -- Check if conversations table exists before adding foreign key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
      ALTER TABLE notifications ADD COLUMN conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;
      CREATE INDEX IF NOT EXISTS idx_notifications_conversation_id ON notifications(conversation_id) WHERE conversation_id IS NOT NULL;
      RAISE NOTICE '✅ Added conversation_id column';
    ELSE
      ALTER TABLE notifications ADD COLUMN conversation_id UUID;
      RAISE NOTICE '✅ Added conversation_id column (no FK - conversations table does not exist)';
    END IF;
  ELSE
    RAISE NOTICE 'conversation_id column already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Update notification type constraint to include task_ready and task_late
-- ============================================================================

DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  
  -- Add new constraint with all notification types
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
      'incident',
      'temperature',
      'task',
      'task_ready',      -- Task ready to complete (1hr before)
      'task_late',      -- Task is late (1hr after)
      'maintenance',
      'digest',
      'ppm_due_soon',
      'ppm_overdue',
      'ppm_completed',
      'message',        -- New message received
      'message_mention' -- Mentioned in message
    ));
  
  RAISE NOTICE '✅ Updated notification type constraint';
END $$;

-- ============================================================================
-- STEP 3: Verify the changes
-- ============================================================================

-- Show all columns now
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
  AND column_name IN ('severity', 'task_id', 'push_sent', 'conversation_id', 'type')
ORDER BY 
  CASE column_name
    WHEN 'severity' THEN 1
    WHEN 'task_id' THEN 2
    WHEN 'push_sent' THEN 3
    WHEN 'conversation_id' THEN 4
    WHEN 'type' THEN 5
  END;

-- Show constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.notifications'::regclass
  AND conname = 'notifications_type_check';

COMMIT;

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 
  'Schema Update Complete' as status,
  'All required columns have been added to notifications table' as message;
