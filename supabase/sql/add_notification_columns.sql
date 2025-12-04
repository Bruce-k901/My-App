-- Add missing columns to notifications table if they don't exist
-- This migration safely adds columns needed for reminders and task notifications

DO $$
BEGIN
  -- Add due_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'due_date'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN due_date date;
    RAISE NOTICE 'Added due_date column to notifications table';
  ELSE
    RAISE NOTICE 'Column due_date already exists in notifications table';
  END IF;

  -- Add priority column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent'));
    RAISE NOTICE 'Added priority column to notifications table';
  ELSE
    RAISE NOTICE 'Column priority already exists in notifications table';
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived'));
    RAISE NOTICE 'Added status column to notifications table';
  ELSE
    RAISE NOTICE 'Column status already exists in notifications table';
  END IF;

  -- Add severity column if it doesn't exist (required for reminders)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'severity'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical'));
    RAISE NOTICE 'Added severity column to notifications table';
  ELSE
    RAISE NOTICE 'Column severity already exists in notifications table';
  END IF;

  -- Add read column if it doesn't exist (might be named 'seen' in some schemas)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'read'
  ) THEN
    -- Check if 'seen' column exists instead
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'seen'
    ) THEN
      -- Rename seen to read for consistency
      ALTER TABLE public.notifications RENAME COLUMN seen TO read;
      RAISE NOTICE 'Renamed seen column to read in notifications table';
    ELSE
      ALTER TABLE public.notifications ADD COLUMN read boolean DEFAULT false;
      RAISE NOTICE 'Added read column to notifications table';
    END IF;
  ELSE
    RAISE NOTICE 'Column read already exists in notifications table';
  END IF;

  -- Add email_sent column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'email_sent'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN email_sent boolean DEFAULT false;
    RAISE NOTICE 'Added email_sent column to notifications table';
  ELSE
    RAISE NOTICE 'Column email_sent already exists in notifications table';
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN updated_at timestamptz DEFAULT now();
    RAISE NOTICE 'Added updated_at column to notifications table';
  ELSE
    RAISE NOTICE 'Column updated_at already exists in notifications table';
  END IF;

  -- Add recipient_role column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'recipient_role'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN recipient_role text CHECK (recipient_role IN ('staff','manager','admin'));
    RAISE NOTICE 'Added recipient_role column to notifications table';
  ELSE
    RAISE NOTICE 'Column recipient_role already exists in notifications table';
  END IF;

  -- Create index on due_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'notifications' 
    AND indexname = 'idx_notifications_due_date'
  ) THEN
    CREATE INDEX idx_notifications_due_date ON public.notifications(due_date);
    RAISE NOTICE 'Created index on due_date column';
  END IF;

END $$;

