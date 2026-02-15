-- ============================================================================
-- Fix Foreign Key Constraints for message_deliveries and message_reads
-- Description: Updates foreign key constraints to reference messaging_messages 
--              instead of messages table, and fixes column names (user_id → profile_id)
-- 
-- Run this SQL directly in your Supabase SQL editor or via psql
-- ============================================================================

DO $$
BEGIN
  -- Fix message_deliveries: Rename user_id to profile_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'message_deliveries' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.message_deliveries 
    RENAME COLUMN user_id TO profile_id;
    
    -- Drop old foreign key constraint if exists
    ALTER TABLE public.message_deliveries 
    DROP CONSTRAINT IF EXISTS message_deliveries_user_id_fkey;
    
    -- Add new foreign key constraint for profile_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'message_deliveries_profile_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'message_deliveries'
    ) THEN
      ALTER TABLE public.message_deliveries 
      ADD CONSTRAINT message_deliveries_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Recreate primary key with new column name
    ALTER TABLE public.message_deliveries 
    DROP CONSTRAINT IF EXISTS message_deliveries_pkey;
    
    ALTER TABLE public.message_deliveries 
    ADD CONSTRAINT message_deliveries_pkey 
    PRIMARY KEY (message_id, profile_id);
    
    -- Recreate index with new column name
    DROP INDEX IF EXISTS idx_message_deliveries_user_id;
    CREATE INDEX IF NOT EXISTS idx_message_deliveries_profile_id ON public.message_deliveries(profile_id);
    
    RAISE NOTICE '✅ Renamed message_deliveries.user_id → profile_id';
  END IF;

  -- Fix message_deliveries foreign key constraint to reference messaging_messages
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'message_deliveries_message_id_fkey' 
    AND table_schema = 'public' 
    AND table_name = 'message_deliveries'
  ) THEN
    -- Drop the old constraint
    ALTER TABLE public.message_deliveries 
    DROP CONSTRAINT message_deliveries_message_id_fkey;
    
    -- Add new constraint pointing to messaging_messages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messaging_messages') THEN
      ALTER TABLE public.message_deliveries 
      ADD CONSTRAINT message_deliveries_message_id_fkey 
      FOREIGN KEY (message_id) REFERENCES public.messaging_messages(id) ON DELETE CASCADE;
      
      RAISE NOTICE '✅ Fixed message_deliveries.message_id foreign key to reference messaging_messages';
    ELSE
      RAISE NOTICE '⚠️ messaging_messages table does not exist - cannot fix foreign key';
    END IF;
  END IF;

  -- Fix message_reads: Rename user_id to profile_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'message_reads' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.message_reads 
    RENAME COLUMN user_id TO profile_id;
    
    -- Drop old foreign key constraint if exists
    ALTER TABLE public.message_reads 
    DROP CONSTRAINT IF EXISTS message_reads_user_id_fkey;
    
    -- Add new foreign key constraint for profile_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'message_reads_profile_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'message_reads'
    ) THEN
      ALTER TABLE public.message_reads 
      ADD CONSTRAINT message_reads_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Recreate primary key with new column name
    ALTER TABLE public.message_reads 
    DROP CONSTRAINT IF EXISTS message_reads_pkey;
    
    ALTER TABLE public.message_reads 
    ADD CONSTRAINT message_reads_pkey 
    PRIMARY KEY (message_id, profile_id);
    
    -- Recreate index with new column name
    DROP INDEX IF EXISTS idx_message_reads_user_id;
    CREATE INDEX IF NOT EXISTS idx_message_reads_profile_id ON public.message_reads(profile_id);
    
    RAISE NOTICE '✅ Renamed message_reads.user_id → profile_id';
  END IF;

  -- Fix message_reads foreign key constraint to reference messaging_messages
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'message_reads_message_id_fkey' 
    AND table_schema = 'public' 
    AND table_name = 'message_reads'
  ) THEN
    -- Drop the old constraint
    ALTER TABLE public.message_reads 
    DROP CONSTRAINT message_reads_message_id_fkey;
    
    -- Add new constraint pointing to messaging_messages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messaging_messages') THEN
      ALTER TABLE public.message_reads 
      ADD CONSTRAINT message_reads_message_id_fkey 
      FOREIGN KEY (message_id) REFERENCES public.messaging_messages(id) ON DELETE CASCADE;
      
      RAISE NOTICE '✅ Fixed message_reads.message_id foreign key to reference messaging_messages';
    ELSE
      RAISE NOTICE '⚠️ messaging_messages table does not exist - cannot fix foreign key';
    END IF;
  END IF;
END $$;
