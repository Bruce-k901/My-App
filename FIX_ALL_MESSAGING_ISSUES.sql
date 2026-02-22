-- ============================================================================
-- FIX: Fix message_deliveries and message_reads tables
-- These tables still have user_id but code is using profile_id
-- ============================================================================

-- Step 1: Fix message_deliveries table
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_deliveries') THEN
    -- Check if column needs to be renamed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'message_deliveries' 
        AND column_name = 'user_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'message_deliveries' 
        AND column_name = 'profile_id'
    ) THEN
      -- Drop all constraints that might reference user_id (primary key, unique, foreign key)
      FOR constraint_name_var IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'message_deliveries'::regclass
          AND contype IN ('p', 'u', 'f') -- p=primary, u=unique, f=foreign
      LOOP
        EXECUTE 'ALTER TABLE message_deliveries DROP CONSTRAINT IF EXISTS ' || constraint_name_var;
      END LOOP;
      
      -- Rename column
      ALTER TABLE message_deliveries 
        RENAME COLUMN user_id TO profile_id;
      
      -- Recreate primary key on correct columns (only if it doesn't exist)
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'message_deliveries_pkey'
          AND conrelid = 'message_deliveries'::regclass
      ) THEN
        ALTER TABLE message_deliveries
          ADD CONSTRAINT message_deliveries_pkey
          PRIMARY KEY (message_id, profile_id);
      END IF;
      
      -- Add new foreign key (only if it doesn't already exist)
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'message_deliveries_profile_id_fkey'
          AND conrelid = 'message_deliveries'::regclass
      ) THEN
        ALTER TABLE message_deliveries
          ADD CONSTRAINT message_deliveries_profile_id_fkey
          FOREIGN KEY (profile_id) 
          REFERENCES profiles(id) 
          ON DELETE CASCADE;
      END IF;
      
      -- Update index
      DROP INDEX IF EXISTS idx_message_deliveries_user_id;
      CREATE INDEX IF NOT EXISTS idx_message_deliveries_profile_id 
        ON message_deliveries(profile_id);
      
      RAISE NOTICE '✅ Renamed message_deliveries.user_id → profile_id';
    END IF;
  END IF;
END $$;

-- Step 2: Fix message_reads table
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_reads') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'message_reads' 
        AND column_name = 'user_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'message_reads' 
        AND column_name = 'profile_id'
    ) THEN
      -- Drop all constraints that might reference user_id
      FOR constraint_name_var IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'message_reads'::regclass
          AND contype IN ('p', 'u', 'f') -- p=primary, u=unique, f=foreign
      LOOP
        EXECUTE 'ALTER TABLE message_reads DROP CONSTRAINT IF EXISTS ' || constraint_name_var;
      END LOOP;
      
      -- Rename column
      ALTER TABLE message_reads 
        RENAME COLUMN user_id TO profile_id;
      
      -- Recreate primary key on correct columns (only if it doesn't exist)
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'message_reads_pkey'
          AND conrelid = 'message_reads'::regclass
      ) THEN
        ALTER TABLE message_reads
          ADD CONSTRAINT message_reads_pkey
          PRIMARY KEY (message_id, profile_id);
      END IF;
      
      -- Add new foreign key (only if it doesn't already exist)
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'message_reads_profile_id_fkey'
          AND conrelid = 'message_reads'::regclass
      ) THEN
        ALTER TABLE message_reads
          ADD CONSTRAINT message_reads_profile_id_fkey
          FOREIGN KEY (profile_id) 
          REFERENCES profiles(id) 
          ON DELETE CASCADE;
      END IF;
      
      RAISE NOTICE '✅ Renamed message_reads.user_id → profile_id';
    END IF;
  END IF;
END $$;

-- Step 3: Fix RLS policies for message_deliveries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_deliveries') THEN
    ALTER TABLE message_deliveries ENABLE ROW LEVEL SECURITY;
    
    -- Drop old policies
    DROP POLICY IF EXISTS message_deliveries_select_conversation ON message_deliveries;
    DROP POLICY IF EXISTS message_deliveries_insert_own ON message_deliveries;
    DROP POLICY IF EXISTS message_deliveries_select_member ON message_deliveries;
    
    -- Create new policies using profile_id (or user_id if profile_id doesn't exist yet)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'message_deliveries' 
        AND column_name = 'profile_id'
    ) THEN
      CREATE POLICY message_deliveries_select_member
        ON message_deliveries
        FOR SELECT
        USING (
          profile_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM messaging_messages mm
            JOIN messaging_channel_members mcm ON mcm.channel_id = mm.channel_id
            WHERE mm.id = message_deliveries.message_id
              AND mcm.profile_id = auth.uid()
          )
        );
      
      CREATE POLICY message_deliveries_insert_own
        ON message_deliveries
        FOR INSERT
        WITH CHECK (
          profile_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM messaging_messages mm
            JOIN messaging_channel_members mcm ON mcm.channel_id = mm.channel_id
            WHERE mm.id = message_deliveries.message_id
              AND mcm.profile_id = auth.uid()
          )
        );
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'message_deliveries' 
        AND column_name = 'user_id'
    ) THEN
      -- Fallback: use user_id if profile_id doesn't exist
      CREATE POLICY message_deliveries_select_member
        ON message_deliveries
        FOR SELECT
        USING (user_id = auth.uid());
      
      CREATE POLICY message_deliveries_insert_own
        ON message_deliveries
        FOR INSERT
        WITH CHECK (user_id = auth.uid());
    END IF;
    
    RAISE NOTICE '✅ Created RLS policies for message_deliveries';
  END IF;
END $$;

-- Step 4: Fix RLS policies for message_reads
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_reads') THEN
    ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
    
    -- Drop old policies
    DROP POLICY IF EXISTS message_reads_select_participant ON message_reads;
    DROP POLICY IF EXISTS message_reads_insert_own ON message_reads;
    DROP POLICY IF EXISTS message_reads_select_member ON message_reads;
    
    -- Create new policies using profile_id (or user_id if profile_id doesn't exist yet)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'message_reads' 
        AND column_name = 'profile_id'
    ) THEN
      CREATE POLICY message_reads_select_member
        ON message_reads
        FOR SELECT
        USING (
          profile_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM messaging_messages mm
            JOIN messaging_channel_members mcm ON mcm.channel_id = mm.channel_id
            WHERE mm.id = message_reads.message_id
              AND mcm.profile_id = auth.uid()
          )
        );
      
      CREATE POLICY message_reads_insert_own
        ON message_reads
        FOR INSERT
        WITH CHECK (
          profile_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM messaging_messages mm
            JOIN messaging_channel_members mcm ON mcm.channel_id = mm.channel_id
            WHERE mm.id = message_reads.message_id
              AND mcm.profile_id = auth.uid()
          )
        );
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'message_reads' 
        AND column_name = 'user_id'
    ) THEN
      -- Fallback: use user_id if profile_id doesn't exist
      CREATE POLICY message_reads_select_member
        ON message_reads
        FOR SELECT
        USING (user_id = auth.uid());
      
      CREATE POLICY message_reads_insert_own
        ON message_reads
        FOR INSERT
        WITH CHECK (user_id = auth.uid());
    END IF;
    
    RAISE NOTICE '✅ Created RLS policies for message_reads';
  END IF;
END $$;

-- Step 5: Verify notifications table has profile_id column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    -- Check if notifications table has profile_id or needs user_id renamed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'user_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'profile_id'
    ) THEN
      -- Drop foreign key first
      ALTER TABLE notifications
        DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
      
      -- Rename user_id to profile_id in notifications
      ALTER TABLE notifications 
        RENAME COLUMN user_id TO profile_id;
      
      -- Add new foreign key (only if it doesn't already exist)
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'notifications_profile_id_fkey'
          AND conrelid = 'notifications'::regclass
      ) THEN
        ALTER TABLE notifications
          ADD CONSTRAINT notifications_profile_id_fkey
          FOREIGN KEY (profile_id) 
          REFERENCES profiles(id) 
          ON DELETE CASCADE;
      END IF;
      
      RAISE NOTICE '✅ Renamed notifications.user_id → profile_id';
    END IF;
  END IF;
END $$;

-- Step 6: Verify column names
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('message_deliveries', 'message_reads', 'notifications')
  AND column_name IN ('user_id', 'profile_id')
ORDER BY table_name, column_name;
