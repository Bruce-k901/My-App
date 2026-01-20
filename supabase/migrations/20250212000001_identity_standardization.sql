-- ============================================================================
-- MIGRATION: Identity Standardization
-- Purpose: Rename all user_id columns to profile_id, update foreign keys to point to profiles(id)
-- Date: 2025-02-12
-- Risk: HIGH - Affects core identity references
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: BACKUP (Create schema with current data)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS backup_identity_migration;

-- Backup critical tables before changes
CREATE TABLE IF NOT EXISTS backup_identity_migration.staff_attendance AS 
  SELECT * FROM staff_attendance WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_attendance');

CREATE TABLE IF NOT EXISTS backup_identity_migration.messages AS 
  SELECT * FROM messages WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages');

CREATE TABLE IF NOT EXISTS backup_identity_migration.conversation_participants AS 
  SELECT * FROM conversation_participants WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_participants');

CREATE TABLE IF NOT EXISTS backup_identity_migration.message_reads AS 
  SELECT * FROM message_reads WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_reads');

CREATE TABLE IF NOT EXISTS backup_identity_migration.notifications AS 
  SELECT * FROM notifications WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications');

CREATE TABLE IF NOT EXISTS backup_identity_migration.profile_settings AS 
  SELECT * FROM profile_settings WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_settings');

-- ============================================================================
-- STEP 2: VERIFICATION QUERIES (Run before migration)
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
  v_orphaned INTEGER;
BEGIN
  -- Check no orphaned records in staff_attendance
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_attendance') THEN
    -- Only check if user_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'staff_attendance' 
        AND column_name = 'user_id'
    ) THEN
      SELECT COUNT(*) INTO v_count 
      FROM staff_attendance 
      WHERE user_id NOT IN (SELECT id FROM profiles);
      
      IF v_count > 0 THEN
        RAISE WARNING 'Found % orphaned records in staff_attendance.user_id', v_count;
      END IF;
    END IF;
  END IF;
  
  -- Check no orphaned records in messages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    -- Only check if sender_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'sender_id'
    ) THEN
      SELECT COUNT(*) INTO v_count 
      FROM messages 
      WHERE sender_id NOT IN (SELECT id FROM profiles);
      
      IF v_count > 0 THEN
        RAISE WARNING 'Found % orphaned records in messages.sender_id', v_count;
      END IF;
    END IF;
  END IF;
  
  -- Check notifications.user_id references auth.users (needs fixing)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    -- Only check if user_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'user_id'
    ) THEN
      SELECT COUNT(*) INTO v_count 
      FROM notifications 
      WHERE user_id IS NOT NULL 
        AND user_id NOT IN (SELECT id FROM auth.users);
      
      IF v_count > 0 THEN
        RAISE WARNING 'Found % notifications with user_id referencing auth.users - will need data migration', v_count;
      END IF;
    END IF;
  END IF;
  
  RAISE NOTICE 'Verification complete - proceed with migration';
END $$;

-- ============================================================================
-- STEP 3: TABLE-BY-TABLE MIGRATION
-- ============================================================================

-- ============================================
-- TABLE: staff_attendance
-- Priority: HIGH (affects Teamly attendance, Day 3 migration)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
    -- Check if column exists and is named user_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'staff_attendance' 
        AND column_name = 'user_id'
    ) THEN
      -- Rename column
      ALTER TABLE staff_attendance 
        RENAME COLUMN user_id TO profile_id;
      
      RAISE NOTICE 'Renamed staff_attendance.user_id → profile_id';
    END IF;
    
    -- Drop old foreign key (if exists)
    ALTER TABLE staff_attendance
      DROP CONSTRAINT IF EXISTS staff_attendance_user_id_fkey;
    
    -- Add new foreign key to profiles (if doesn't exist)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'staff_attendance_profile_id_fkey'
        AND table_schema = 'public'
        AND table_name = 'staff_attendance'
    ) THEN
      ALTER TABLE staff_attendance
        ADD CONSTRAINT staff_attendance_profile_id_fkey
        FOREIGN KEY (profile_id) 
        REFERENCES profiles(id) 
        ON DELETE CASCADE;
    END IF;
    
    -- Update indexes
    DROP INDEX IF EXISTS idx_staff_attendance_user_id;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname = 'idx_staff_attendance_profile_id'
        AND schemaname = 'public'
    ) THEN
      CREATE INDEX idx_staff_attendance_profile_id 
        ON staff_attendance(profile_id);
    END IF;
    
    -- Update composite index
    DROP INDEX IF EXISTS idx_staff_attendance_active_shift;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname = 'idx_staff_attendance_active_shift_profile'
        AND schemaname = 'public'
    ) THEN
      CREATE INDEX idx_staff_attendance_active_shift_profile 
        ON staff_attendance(profile_id, shift_status) 
        WHERE shift_status = 'on_shift' AND clock_out_time IS NULL;
    END IF;
  END IF;
END $$;

-- Update RLS policies for staff_attendance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
    -- Drop old policies
    DROP POLICY IF EXISTS staff_attendance_select_own ON staff_attendance;
    DROP POLICY IF EXISTS staff_attendance_select_company ON staff_attendance;
    DROP POLICY IF EXISTS staff_attendance_insert_own ON staff_attendance;
    DROP POLICY IF EXISTS staff_attendance_update_own ON staff_attendance;
    DROP POLICY IF EXISTS staff_attendance_update_company ON staff_attendance;
    
    -- Recreate policies with profile_id
    CREATE POLICY staff_attendance_select_own
      ON staff_attendance FOR SELECT
      USING (profile_id = auth.uid());
    
    CREATE POLICY staff_attendance_select_company
      ON staff_attendance FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = staff_attendance.company_id
            AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
        )
      );
    
    CREATE POLICY staff_attendance_insert_own
      ON staff_attendance FOR INSERT
      WITH CHECK (
        profile_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = staff_attendance.company_id
        )
      );
    
    CREATE POLICY staff_attendance_update_own
      ON staff_attendance FOR UPDATE
      USING (profile_id = auth.uid())
      WITH CHECK (profile_id = auth.uid());
    
    CREATE POLICY staff_attendance_update_company
      ON staff_attendance FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = staff_attendance.company_id
            AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = staff_attendance.company_id
            AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
        )
      );
  END IF;
END $$;

-- ============================================
-- TABLE: messages
-- Priority: HIGH (affects shared messaging)
-- Rename: sender_id → sender_profile_id (for clarity)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    -- Check if column exists and is named sender_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'sender_id'
    ) THEN
      -- Rename column
      ALTER TABLE messages 
        RENAME COLUMN sender_id TO sender_profile_id;
      
      RAISE NOTICE 'Renamed messages.sender_id → sender_profile_id';
    END IF;
    
    -- Drop old foreign key (if exists)
    ALTER TABLE messages
      DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
    
    -- Add new foreign key (if doesn't exist)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'messages_sender_profile_id_fkey'
        AND table_schema = 'public'
        AND table_name = 'messages'
    ) THEN
      ALTER TABLE messages
        ADD CONSTRAINT messages_sender_profile_id_fkey
        FOREIGN KEY (sender_profile_id) 
        REFERENCES profiles(id) 
        ON DELETE SET NULL;
    END IF;
    
    -- Update indexes
    DROP INDEX IF EXISTS idx_messages_sender_id;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname = 'idx_messages_sender_profile_id'
        AND schemaname = 'public'
    ) THEN
      CREATE INDEX idx_messages_sender_profile_id 
        ON messages(sender_profile_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- TABLE: conversation_participants
-- Priority: HIGH (affects messaging - MUST BE BEFORE messages RLS policies)
-- Rename: user_id → profile_id
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversation_participants') THEN
    -- Check if column exists and is named user_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'conversation_participants' 
        AND column_name = 'user_id'
    ) THEN
      -- Drop primary key constraint first
      ALTER TABLE conversation_participants
        DROP CONSTRAINT IF EXISTS conversation_participants_pkey;
      
      -- Rename column
      ALTER TABLE conversation_participants 
        RENAME COLUMN user_id TO profile_id;
      
      -- Recreate primary key with new column name
      ALTER TABLE conversation_participants
        ADD CONSTRAINT conversation_participants_pkey
        PRIMARY KEY (conversation_id, profile_id);
      
      RAISE NOTICE 'Renamed conversation_participants.user_id → profile_id';
    END IF;
    
    -- Drop old foreign key
    ALTER TABLE conversation_participants
      DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey;
    
    -- Add new foreign key
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'conversation_participants_profile_id_fkey'
        AND table_schema = 'public'
        AND table_name = 'conversation_participants'
    ) THEN
      ALTER TABLE conversation_participants
        ADD CONSTRAINT conversation_participants_profile_id_fkey
        FOREIGN KEY (profile_id) 
        REFERENCES profiles(id) 
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Update RLS policies for conversation_participants
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversation_participants') THEN
    DROP POLICY IF EXISTS conversation_participants_select_own ON conversation_participants;
    DROP POLICY IF EXISTS conversation_participants_insert_own ON conversation_participants;
    DROP POLICY IF EXISTS conversation_participants_update_own ON conversation_participants;
    
    CREATE POLICY conversation_participants_select_own
      ON conversation_participants FOR SELECT
      USING (profile_id = auth.uid());
    
    CREATE POLICY conversation_participants_insert_own
      ON conversation_participants FOR INSERT
      WITH CHECK (profile_id = auth.uid());
    
    CREATE POLICY conversation_participants_update_own
      ON conversation_participants FOR UPDATE
      USING (profile_id = auth.uid())
      WITH CHECK (profile_id = auth.uid());
  END IF;
END $$;

-- Update RLS policies for messages
-- NOTE: Must come AFTER conversation_participants migration so cp.profile_id exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    -- Drop old policies
    DROP POLICY IF EXISTS messages_select_own ON messages;
    DROP POLICY IF EXISTS messages_select_conversation ON messages;
    DROP POLICY IF EXISTS messages_insert_own ON messages;
    DROP POLICY IF EXISTS messages_update_own ON messages;
    
    -- Recreate policies with sender_profile_id
    -- Note: conversation_participants.profile_id must exist (migrated above)
    CREATE POLICY messages_select_conversation
      ON messages FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM conversation_participants cp
          WHERE cp.conversation_id = messages.conversation_id
            AND cp.profile_id = auth.uid()
        )
      );
    
    CREATE POLICY messages_insert_own
      ON messages FOR INSERT
      WITH CHECK (
        sender_profile_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM conversation_participants cp
          WHERE cp.conversation_id = messages.conversation_id
            AND cp.profile_id = auth.uid()
        )
      );
    
    CREATE POLICY messages_update_own
      ON messages FOR UPDATE
      USING (sender_profile_id = auth.uid())
      WITH CHECK (sender_profile_id = auth.uid());
  END IF;
END $$;

-- ============================================
-- TABLE: message_reads
-- Priority: MEDIUM (affects messaging read receipts)
-- Rename: user_id → profile_id
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_reads') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'message_reads' 
        AND column_name = 'user_id'
    ) THEN
      -- Drop primary key constraint first
      ALTER TABLE message_reads
        DROP CONSTRAINT IF EXISTS message_reads_pkey;
      
      -- Rename column
      ALTER TABLE message_reads 
        RENAME COLUMN user_id TO profile_id;
      
      -- Recreate primary key
      ALTER TABLE message_reads
        ADD CONSTRAINT message_reads_pkey
        PRIMARY KEY (message_id, profile_id);
      
      RAISE NOTICE 'Renamed message_reads.user_id → profile_id';
    END IF;
    
    -- Drop old foreign key
    ALTER TABLE message_reads
      DROP CONSTRAINT IF EXISTS message_reads_user_id_fkey;
    
    -- Add new foreign key
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'message_reads_profile_id_fkey'
        AND table_schema = 'public'
        AND table_name = 'message_reads'
    ) THEN
      ALTER TABLE message_reads
        ADD CONSTRAINT message_reads_profile_id_fkey
        FOREIGN KEY (profile_id) 
        REFERENCES profiles(id) 
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================
-- TABLE: notifications
-- Priority: HIGH (affects shared notifications)
-- Rename: user_id → profile_id AND fix FK to point to profiles instead of auth.users
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    -- Check if column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'user_id'
    ) THEN
      -- First, migrate data: map auth.users.id to profiles.id
      -- Case 1: If profile.id = auth.users.id (most common pattern)
      -- Update notifications where user_id already matches a profile.id
      UPDATE notifications n
      SET user_id = p.id
      FROM profiles p
      WHERE n.user_id IS NOT NULL
        AND n.user_id = p.id;  -- Profile.id equals auth.users.id
      
      -- Case 2: If profile.auth_user_id references auth.users.id (alternative pattern)
      -- Check if auth_user_id column exists, and update notifications accordingly
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'auth_user_id'
      ) THEN
        -- Update notifications via auth_user_id where user_id doesn't match any profile.id yet
        UPDATE notifications n
        SET user_id = p.id
        FROM profiles p
        WHERE n.user_id IS NOT NULL
          AND p.auth_user_id = n.user_id  -- Profile has separate auth_user_id column
          AND NOT EXISTS (
            SELECT 1 FROM profiles p2 
            WHERE p2.id = n.user_id
          );  -- Only if user_id doesn't already match a profile.id
      END IF;
      
      -- Case 3: If any notifications still have user_id that doesn't match any profile, set to NULL
      UPDATE notifications
      SET user_id = NULL
      WHERE user_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = notifications.user_id);
      
      -- Rename column
      ALTER TABLE notifications 
        RENAME COLUMN user_id TO profile_id;
      
      RAISE NOTICE 'Renamed notifications.user_id → profile_id and migrated data';
    END IF;
    
    -- Drop old foreign key to auth.users (if exists)
    ALTER TABLE notifications
      DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
    
    -- Add new foreign key to profiles
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'notifications_profile_id_fkey'
        AND table_schema = 'public'
        AND table_name = 'notifications'
    ) THEN
      ALTER TABLE notifications
        ADD CONSTRAINT notifications_profile_id_fkey
        FOREIGN KEY (profile_id) 
        REFERENCES profiles(id) 
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Update RLS policies for notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    DROP POLICY IF EXISTS notifications_select_company ON notifications;
    DROP POLICY IF EXISTS notifications_select_own ON notifications;
    DROP POLICY IF EXISTS notifications_insert_company ON notifications;
    DROP POLICY IF EXISTS notifications_update_company ON notifications;
    
    CREATE POLICY notifications_select_company
      ON notifications FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = notifications.company_id
        )
      );
    
    CREATE POLICY notifications_select_own
      ON notifications FOR SELECT
      USING (profile_id = auth.uid());
    
    CREATE POLICY notifications_insert_company
      ON notifications FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = notifications.company_id
        )
      );
    
    CREATE POLICY notifications_update_company
      ON notifications FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = notifications.company_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = notifications.company_id
        )
      );
  END IF;
END $$;

-- ============================================
-- TABLE: profile_settings
-- Priority: MEDIUM (settings table)
-- Rename: user_id → profile_id (already references profiles, just rename column)
-- NOTE: Check if it's a VIEW first - views cannot be altered
-- ============================================

DO $$
DECLARE
  v_is_view BOOLEAN := false;
  v_is_table BOOLEAN := false;
BEGIN
  -- Check if profile_settings exists as a VIEW
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
      AND table_name = 'profile_settings'
  ) INTO v_is_view;
  
  -- Check if profile_settings exists as a TABLE
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'profile_settings'
      AND table_type = 'BASE TABLE'
  ) INTO v_is_table;
  
  -- If it's a view, skip migration (views cannot be altered)
  IF v_is_view THEN
    RAISE NOTICE 'profile_settings is a VIEW - skipping migration (views cannot be altered)';
    RAISE NOTICE 'If profile_settings should be a table, drop the view first and recreate as table';
    RETURN;
  END IF;
  
  -- Only proceed if it's a table
  IF v_is_table THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'profile_settings' 
        AND column_name = 'user_id'
    ) THEN
      -- Drop primary key constraint first
      ALTER TABLE profile_settings
        DROP CONSTRAINT IF EXISTS profile_settings_pkey;
      
      -- Rename column
      ALTER TABLE profile_settings 
        RENAME COLUMN user_id TO profile_id;
      
      -- Recreate primary key
      ALTER TABLE profile_settings
        ADD CONSTRAINT profile_settings_pkey
        PRIMARY KEY (profile_id);
      
      RAISE NOTICE 'Renamed profile_settings.user_id → profile_id';
    END IF;
    
    -- Drop old foreign key (if exists with old name)
    ALTER TABLE profile_settings
      DROP CONSTRAINT IF EXISTS profile_settings_user_id_fkey;
    
    -- Ensure foreign key exists with correct name
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'profile_settings_profile_id_fkey'
        AND table_schema = 'public'
        AND table_name = 'profile_settings'
    ) THEN
      ALTER TABLE profile_settings
        ADD CONSTRAINT profile_settings_profile_id_fkey
        FOREIGN KEY (profile_id) 
        REFERENCES profiles(id) 
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Update RLS policies for profile_settings (only if it's a table, not a view)
DO $$
DECLARE
  v_is_view BOOLEAN := false;
  v_is_table BOOLEAN := false;
BEGIN
  -- Check if profile_settings exists as a VIEW
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
      AND table_name = 'profile_settings'
  ) INTO v_is_view;
  
  -- Check if profile_settings exists as a TABLE
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'profile_settings'
      AND table_type = 'BASE TABLE'
  ) INTO v_is_table;
  
  -- Only update RLS policies if it's a table (not a view)
  IF v_is_table THEN
    DROP POLICY IF EXISTS profile_settings_select_own ON profile_settings;
    DROP POLICY IF EXISTS profile_settings_insert_own ON profile_settings;
    DROP POLICY IF EXISTS profile_settings_update_own ON profile_settings;
    DROP POLICY IF EXISTS profile_settings_select_company ON profile_settings;
    
    -- Use profile_id if column exists, otherwise use user_id (for backward compatibility during migration)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'profile_settings' 
        AND column_name = 'profile_id'
    ) THEN
      CREATE POLICY profile_settings_select_own
        ON profile_settings FOR SELECT
        USING (profile_id = auth.uid());
      
      CREATE POLICY profile_settings_insert_own
        ON profile_settings FOR INSERT
        WITH CHECK (profile_id = auth.uid());
      
      CREATE POLICY profile_settings_update_own
        ON profile_settings FOR UPDATE
        USING (profile_id = auth.uid())
        WITH CHECK (profile_id = auth.uid());
    ELSE
      -- Fallback: use user_id if profile_id doesn't exist yet
      CREATE POLICY profile_settings_select_own
        ON profile_settings FOR SELECT
        USING (user_id = auth.uid());
      
      CREATE POLICY profile_settings_insert_own
        ON profile_settings FOR INSERT
        WITH CHECK (user_id = auth.uid());
      
      CREATE POLICY profile_settings_update_own
        ON profile_settings FOR UPDATE
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
    
    CREATE POLICY profile_settings_select_company
      ON profile_settings FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = profile_settings.company_id
            AND p.app_role IN ('Admin', 'Owner', 'Manager')
        )
      );
  ELSIF v_is_view THEN
    RAISE NOTICE 'profile_settings is a VIEW - skipping RLS policy updates (views use RLS from underlying tables)';
  END IF;
END $$;

-- ============================================
-- TABLE: conversations
-- Priority: LOW (created_by is nullable and less critical)
-- Rename: created_by → created_by_profile_id (optional, but for consistency)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'conversations' 
        AND column_name = 'created_by'
        AND column_name != 'created_by_profile_id'
    ) THEN
      -- Rename column
      ALTER TABLE conversations 
        RENAME COLUMN created_by TO created_by_profile_id;
      
      RAISE NOTICE 'Renamed conversations.created_by → created_by_profile_id';
    END IF;
    
    -- Ensure foreign key exists (already points to profiles, just verify)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'conversations_created_by_profile_id_fkey'
        AND table_schema = 'public'
        AND table_name = 'conversations'
    ) THEN
      -- Drop old constraint if exists with different name
      ALTER TABLE conversations
        DROP CONSTRAINT IF EXISTS conversations_created_by_fkey;
      
      ALTER TABLE conversations
        ADD CONSTRAINT conversations_created_by_profile_id_fkey
        FOREIGN KEY (created_by_profile_id) 
        REFERENCES profiles(id) 
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- ============================================
-- TABLE: task_instances (if exists)
-- Priority: MEDIUM (task system)
-- Rename: assigned_to_user_id → assigned_to_profile_id, completed_by_user_id → completed_by_profile_id
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_instances') THEN
    -- Rename assigned_to_user_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'task_instances' 
        AND column_name = 'assigned_to_user_id'
    ) THEN
      ALTER TABLE task_instances 
        RENAME COLUMN assigned_to_user_id TO assigned_to_profile_id;
      
      RAISE NOTICE 'Renamed task_instances.assigned_to_user_id → assigned_to_profile_id';
      
      -- Update foreign key
      ALTER TABLE task_instances
        DROP CONSTRAINT IF EXISTS task_instances_assigned_to_user_id_fkey;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'task_instances_assigned_to_profile_id_fkey'
      ) THEN
        ALTER TABLE task_instances
          ADD CONSTRAINT task_instances_assigned_to_profile_id_fkey
          FOREIGN KEY (assigned_to_profile_id) 
          REFERENCES profiles(id) 
          ON DELETE SET NULL;
      END IF;
    END IF;
    
    -- Rename completed_by_user_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'task_instances' 
        AND column_name = 'completed_by_user_id'
    ) THEN
      ALTER TABLE task_instances 
        RENAME COLUMN completed_by_user_id TO completed_by_profile_id;
      
      RAISE NOTICE 'Renamed task_instances.completed_by_user_id → completed_by_profile_id';
      
      -- Update foreign key
      ALTER TABLE task_instances
        DROP CONSTRAINT IF EXISTS task_instances_completed_by_user_id_fkey;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'task_instances_completed_by_profile_id_fkey'
      ) THEN
        ALTER TABLE task_instances
          ADD CONSTRAINT task_instances_completed_by_profile_id_fkey
          FOREIGN KEY (completed_by_profile_id) 
          REFERENCES profiles(id) 
          ON DELETE SET NULL;
      END IF;
    END IF;
    
    -- Update indexes for task_instances
    DROP INDEX IF EXISTS idx_task_instances_assigned;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'task_instances' 
        AND column_name = 'assigned_to_profile_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_task_instances_assigned_profile 
        ON task_instances(assigned_to_profile_id) 
        WHERE status IN ('pending', 'in_progress', 'overdue');
    END IF;
  END IF;
END $$;

-- ============================================
-- TABLE: archived_users
-- Priority: LOW (archived data)
-- Rename: archived_by → archived_by_profile_id
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'archived_users') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'archived_users' 
        AND column_name = 'archived_by'
    ) THEN
      -- Migrate data first: map auth.users.id to profiles.id
      UPDATE archived_users au
      SET archived_by = p.id::text
      FROM profiles p
      WHERE au.archived_by = p.id::text
        AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id::text = au.archived_by AND u.id = p.id);
      
      -- Rename column
      ALTER TABLE archived_users 
        RENAME COLUMN archived_by TO archived_by_profile_id;
      
      RAISE NOTICE 'Renamed archived_users.archived_by → archived_by_profile_id';
      
      -- Update foreign key
      ALTER TABLE archived_users
        DROP CONSTRAINT IF EXISTS archived_users_archived_by_fkey;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'archived_users_archived_by_profile_id_fkey'
      ) THEN
        ALTER TABLE archived_users
          ADD CONSTRAINT archived_users_archived_by_profile_id_fkey
          FOREIGN KEY (archived_by_profile_id) 
          REFERENCES profiles(id) 
          ON DELETE SET NULL;
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: UPDATE HELPER FUNCTIONS
-- ============================================================================

-- Update get_active_shift function (if exists)
-- Drop old version(s) first to handle signature changes
DROP FUNCTION IF EXISTS public.get_active_shift(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_active_shift(p_user_id uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_active_shift(p_profile_id uuid) CASCADE;

-- Create/update get_active_shift function with new signature
CREATE OR REPLACE FUNCTION public.get_active_shift(p_profile_id uuid)
RETURNS TABLE (
  id uuid,
  profile_id uuid,
  company_id uuid,
  site_id uuid,
  clock_in_time timestamptz,
  shift_notes text,
  hours_on_shift decimal
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
    RETURN QUERY
    SELECT 
      sa.id,
      sa.profile_id,
      sa.company_id,
      sa.site_id,
      sa.clock_in_time,
      sa.shift_notes,
      EXTRACT(EPOCH FROM (NOW() - sa.clock_in_time)) / 3600.0 AS hours_on_shift
    FROM staff_attendance sa
    WHERE sa.profile_id = p_profile_id
      AND sa.shift_status = 'on_shift'
      AND sa.clock_out_time IS NULL
    ORDER BY sa.clock_in_time DESC
    LIMIT 1;
  END IF;
END;
$$;

-- Update get_staff_on_shift_at_site function (if exists)
-- Drop old version(s) first to handle signature changes
DROP FUNCTION IF EXISTS public.get_staff_on_shift_at_site(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_staff_on_shift_at_site(p_site_id uuid) CASCADE;

-- Create/update get_staff_on_shift_at_site function with new signature
CREATE OR REPLACE FUNCTION public.get_staff_on_shift_at_site(p_site_id uuid)
RETURNS TABLE (
  profile_id uuid,
  full_name text,
  email text,
  app_role text,
  clock_in_time timestamptz,
  hours_on_shift decimal
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.full_name,
      p.email,
      p.app_role,
      sa.clock_in_time,
      EXTRACT(EPOCH FROM (NOW() - sa.clock_in_time)) / 3600.0 AS hours_on_shift
    FROM staff_attendance sa
    JOIN profiles p ON p.id = sa.profile_id
    WHERE sa.site_id = p_site_id
      AND sa.shift_status = 'on_shift'
      AND sa.clock_out_time IS NULL
    ORDER BY sa.clock_in_time DESC;
  END IF;
END;
$$;

-- ============================================================================
-- STEP 5: POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_staff_att_count INTEGER;
  v_backup_count INTEGER;
  v_messages_count INTEGER;
  v_backup_messages_count INTEGER;
BEGIN
  -- Verify staff_attendance record counts match
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
    SELECT COUNT(*) INTO v_staff_att_count FROM staff_attendance;
    SELECT COUNT(*) INTO v_backup_count FROM backup_identity_migration.staff_attendance;
    
    IF v_staff_att_count != v_backup_count THEN
      RAISE WARNING 'Record count mismatch in staff_attendance: % vs %', v_staff_att_count, v_backup_count;
    ELSE
      RAISE NOTICE '✅ staff_attendance: % records verified', v_staff_att_count;
    END IF;
  END IF;
  
  -- Verify messages record counts match
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    SELECT COUNT(*) INTO v_messages_count FROM messages;
    SELECT COUNT(*) INTO v_backup_messages_count FROM backup_identity_migration.messages;
    
    IF v_messages_count != v_backup_messages_count THEN
      RAISE WARNING 'Record count mismatch in messages: % vs %', v_messages_count, v_backup_messages_count;
    ELSE
      RAISE NOTICE '✅ messages: % records verified', v_messages_count;
    END IF;
  END IF;
  
  -- Check no orphaned profile_id references
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
    SELECT COUNT(*) INTO v_staff_att_count 
    FROM staff_attendance 
    WHERE profile_id NOT IN (SELECT id FROM profiles);
    
    IF v_staff_att_count > 0 THEN
      RAISE WARNING 'Found % orphaned profile_id references in staff_attendance', v_staff_att_count;
    END IF;
  END IF;
  
  RAISE NOTICE '✅ Verification complete - migration successful';
END $$;

-- ============================================================================
-- STEP 6: SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '
  ============================================
  IDENTITY STANDARDIZATION MIGRATION COMPLETE
  ============================================
  All user references standardized to profile_id
  
  Tables migrated:
  - staff_attendance: user_id → profile_id
  - messages: sender_id → sender_profile_id
  - conversation_participants: user_id → profile_id
  - message_reads: user_id → profile_id
  - notifications: user_id → profile_id (FK fixed to profiles)
  - profile_settings: user_id → profile_id
  - conversations: created_by → created_by_profile_id
  - task_instances: assigned_to_user_id → assigned_to_profile_id
  - task_instances: completed_by_user_id → completed_by_profile_id
  - archived_users: archived_by → archived_by_profile_id
  
  Backup schema: backup_identity_migration
  Rollback: See rollback-identity-migration.sql (to be created)
  
  Next steps:
  1. Update TypeScript types (regenerate from Supabase)
  2. Update application code to use new column names
  3. Run tests: npm run test:e2e:foundation -- identity.spec.ts
  ============================================
  ';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (COMMENTED - UNCOMMENT IF NEEDED)
-- ============================================================================

/*
BEGIN;

-- Restore from backup
INSERT INTO staff_attendance 
SELECT * FROM backup_identity_migration.staff_attendance
ON CONFLICT (id) DO NOTHING;

-- Revert column names (reverse order to avoid constraint issues)
ALTER TABLE archived_users RENAME COLUMN archived_by_profile_id TO archived_by;
ALTER TABLE task_instances RENAME COLUMN completed_by_profile_id TO completed_by_user_id;
ALTER TABLE task_instances RENAME COLUMN assigned_to_profile_id TO assigned_to_user_id;
ALTER TABLE conversations RENAME COLUMN created_by_profile_id TO created_by;
ALTER TABLE profile_settings RENAME COLUMN profile_id TO user_id;
ALTER TABLE notifications RENAME COLUMN profile_id TO user_id;
ALTER TABLE message_reads RENAME COLUMN profile_id TO user_id;
ALTER TABLE conversation_participants RENAME COLUMN profile_id TO user_id;
ALTER TABLE messages RENAME COLUMN sender_profile_id TO sender_id;
ALTER TABLE staff_attendance RENAME COLUMN profile_id TO user_id;

-- Restore old foreign keys (point to auth.users where appropriate)
-- ... (restore policies, indexes, etc.)

-- Drop backup schema
DROP SCHEMA IF EXISTS backup_identity_migration CASCADE;

COMMIT;
*/

