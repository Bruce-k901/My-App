-- Add missing columns to notifications table - SIMPLE VERSION
-- Run each statement individually if you get errors, or run all at once

-- 1. Add due_date column
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS due_date date;

-- 2. Add priority column
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';

-- Add check constraint for priority (only if column was just added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_priority_check'
  ) THEN
    ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_priority_check 
    CHECK (priority IN ('low','medium','high','urgent'));
  END IF;
END $$;

-- 3. Add status column
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add check constraint for status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_status_check'
  ) THEN
    ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_status_check 
    CHECK (status IN ('active','archived'));
    
    -- Make status NOT NULL for new rows (set default for existing)
    ALTER TABLE public.notifications 
    ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

-- 4. Add severity column
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info';

-- Add check constraint for severity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_severity_check'
  ) THEN
    ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_severity_check 
    CHECK (severity IN ('info','warning','critical'));
    
    -- Make severity NOT NULL for new rows
    ALTER TABLE public.notifications 
    ALTER COLUMN severity SET NOT NULL;
  END IF;
END $$;

-- 5. Handle read column (check if 'seen' exists first)
DO $$
BEGIN
  -- If 'seen' exists but 'read' doesn't, rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'seen'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'read'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN seen TO read;
  -- Otherwise, add read column if it doesn't exist
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'read'
  ) THEN
    ALTER TABLE public.notifications 
    ADD COLUMN read boolean DEFAULT false;
  END IF;
END $$;

-- 6. Add email_sent column
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false;

-- 7. Add updated_at column
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 8. Add recipient_role column
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS recipient_role text;

-- Add check constraint for recipient_role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_recipient_role_check'
  ) THEN
    ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_recipient_role_check 
    CHECK (recipient_role IN ('staff','manager','admin') OR recipient_role IS NULL);
  END IF;
END $$;

-- 9. Create index on due_date
CREATE INDEX IF NOT EXISTS idx_notifications_due_date 
ON public.notifications(due_date);

-- Verification: Show all columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
ORDER BY ordinal_position;

