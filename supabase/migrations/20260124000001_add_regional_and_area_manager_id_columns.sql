-- ============================================================================
-- Migration: Add regional_manager_id and area_manager_id columns
-- Description: Adds specific manager ID columns to regions and areas tables
--              for better integration with stock count approval system
-- Date: 2026-01-24
-- ============================================================================

DO $$
BEGIN
  -- Check if regions table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'regions'
  ) THEN
    RAISE NOTICE 'regions table does not exist - skipping migration';
    RETURN;
  END IF;

  -- Check if areas table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'areas'
  ) THEN
    RAISE NOTICE 'areas table does not exist - skipping migration';
    RETURN;
  END IF;

  -- ============================================================================
  -- Add regional_manager_id to regions table
  -- ============================================================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'regions' 
    AND column_name = 'regional_manager_id'
  ) THEN
    ALTER TABLE regions 
      ADD COLUMN regional_manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Added regional_manager_id column to regions table';
  END IF;

  -- Copy existing manager_id to regional_manager_id if regional_manager_id is NULL
  -- Only if manager_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'regions' 
    AND column_name = 'manager_id'
  ) THEN
    UPDATE regions 
    SET regional_manager_id = manager_id 
    WHERE manager_id IS NOT NULL 
      AND regional_manager_id IS NULL;
  END IF;

  -- ============================================================================
  -- Add area_manager_id to areas table
  -- ============================================================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'areas' 
    AND column_name = 'area_manager_id'
  ) THEN
    ALTER TABLE areas 
      ADD COLUMN area_manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Added area_manager_id column to areas table';
  END IF;

  -- Copy existing manager_id to area_manager_id if area_manager_id is NULL
  -- Only if manager_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'areas' 
    AND column_name = 'manager_id'
  ) THEN
    UPDATE areas 
    SET area_manager_id = manager_id 
    WHERE manager_id IS NOT NULL 
      AND area_manager_id IS NULL;
  END IF;

  -- ============================================================================
  -- Create indexes for better performance
  -- ============================================================================
  CREATE INDEX IF NOT EXISTS idx_regions_regional_manager_id 
    ON regions(regional_manager_id) 
    WHERE regional_manager_id IS NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_areas_area_manager_id 
    ON areas(area_manager_id) 
    WHERE area_manager_id IS NOT NULL;

  RAISE NOTICE 'Migration completed: Added regional_manager_id and area_manager_id columns';

END $$;

-- ============================================================================
-- Create triggers to keep manager_id and specific columns in sync
-- (Only if manager_id column exists)
-- ============================================================================

-- Create function to sync regional_manager_id and manager_id
-- This function will only work if manager_id column exists
CREATE OR REPLACE FUNCTION sync_regional_manager_id()
RETURNS TRIGGER AS $func$
BEGIN
  -- Only sync if manager_id column exists (checked at trigger creation time)
  IF NEW.regional_manager_id IS NOT NULL THEN
    NEW.manager_id := NEW.regional_manager_id;
  ELSIF NEW.manager_id IS NOT NULL THEN
    NEW.regional_manager_id := NEW.manager_id;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Create function to sync area_manager_id and manager_id
-- This function will only work if manager_id column exists
CREATE OR REPLACE FUNCTION sync_area_manager_id()
RETURNS TRIGGER AS $func$
BEGIN
  -- Only sync if manager_id column exists (checked at trigger creation time)
  IF NEW.area_manager_id IS NOT NULL THEN
    NEW.manager_id := NEW.area_manager_id;
  ELSIF NEW.manager_id IS NOT NULL THEN
    NEW.area_manager_id := NEW.manager_id;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Conditionally create triggers only if manager_id exists
DO $$
BEGIN
  -- Check if manager_id exists in regions, and create sync trigger if it does
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'regions' 
    AND column_name = 'manager_id'
  ) THEN
    -- Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS sync_regional_manager_id_trigger ON regions;
    
    -- Create trigger
    CREATE TRIGGER sync_regional_manager_id_trigger
      BEFORE INSERT OR UPDATE ON regions
      FOR EACH ROW
      EXECUTE FUNCTION sync_regional_manager_id();
  END IF;

  -- Check if manager_id exists in areas, and create sync trigger if it does
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'areas' 
    AND column_name = 'manager_id'
  ) THEN
    -- Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS sync_area_manager_id_trigger ON areas;
    
    -- Create trigger
    CREATE TRIGGER sync_area_manager_id_trigger
      BEFORE INSERT OR UPDATE ON areas
      FOR EACH ROW
      EXECUTE FUNCTION sync_area_manager_id();
  END IF;
END $$;
