-- ============================================================================
-- Migration: Add key and value columns to profile_settings
-- Description: Converts profile_settings to support key-value storage for handover data
-- Date: 2026-01-24
-- ============================================================================

DO $$
BEGIN
  -- Check if profile_settings table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profile_settings'
  ) THEN
    RAISE NOTICE 'profile_settings table does not exist - skipping migration';
    RETURN;
  END IF;

  -- Add key column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profile_settings' 
    AND column_name = 'key'
  ) THEN
    ALTER TABLE profile_settings 
      ADD COLUMN key TEXT;
    
    RAISE NOTICE 'Added key column to profile_settings table';
  END IF;

  -- Add value column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profile_settings' 
    AND column_name = 'value'
  ) THEN
    ALTER TABLE profile_settings 
      ADD COLUMN value JSONB;
    
    RAISE NOTICE 'Added value column to profile_settings table';
  END IF;

  -- Create unique constraint on (key, company_id) if it doesn't exist
  -- This allows multiple companies to have the same key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name = 'profile_settings' 
    AND constraint_name = 'profile_settings_key_company_id_unique'
  ) THEN
    -- Only add constraint if key column exists and has data or is nullable
    ALTER TABLE profile_settings 
      ADD CONSTRAINT profile_settings_key_company_id_unique 
      UNIQUE (key, company_id);
    
    RAISE NOTICE 'Added unique constraint on (key, company_id)';
  END IF;

  -- Create index on key for faster lookups
  CREATE INDEX IF NOT EXISTS idx_profile_settings_key 
    ON profile_settings(key) 
    WHERE key IS NOT NULL;

  -- Create index on company_id + key for faster company-specific lookups
  CREATE INDEX IF NOT EXISTS idx_profile_settings_company_key 
    ON profile_settings(company_id, key) 
    WHERE key IS NOT NULL;

  RAISE NOTICE 'Migration completed: Added key and value columns to profile_settings';

END $$;
