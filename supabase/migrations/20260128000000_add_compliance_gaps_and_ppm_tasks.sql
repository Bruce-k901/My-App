-- ============================================================================
-- Migration: Add Compliance Gap Detection & PPM Service Tasks
-- Description: Adds requires_expiry to global_documents and creates trigger
--              for PPM service auto-completion
-- Date: 2026-01-28
-- ============================================================================

-- ============================================================================
-- 1. Add requires_expiry column to global_documents
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'global_documents') THEN
    -- Add requires_expiry column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'global_documents' 
      AND column_name = 'requires_expiry'
    ) THEN
      ALTER TABLE global_documents
      ADD COLUMN requires_expiry BOOLEAN DEFAULT TRUE;

      -- Update existing records that don't need expiry
      -- Note: This may fail if audit triggers have issues, but column will still be added
      BEGIN
        UPDATE global_documents
        SET requires_expiry = FALSE
        WHERE category IN ('policy', 'procedure', 'guideline')
          OR name ILIKE '%policy%'
          OR name ILIKE '%procedure%'
          OR name ILIKE '%guideline%';
        
        RAISE NOTICE '✅ Updated existing records to set requires_expiry = FALSE where appropriate';
      EXCEPTION
        WHEN OTHERS THEN
          -- If update fails (e.g., due to trigger issues), that's okay
          -- The column is added with default TRUE, which is correct for most documents
          -- Existing records can be updated manually if needed
          RAISE NOTICE '⚠️ Could not bulk-update existing records (trigger constraint), but column added successfully. Existing records default to requires_expiry = TRUE.';
      END;

      RAISE NOTICE '✅ Added requires_expiry column to global_documents';
    ELSE
      RAISE NOTICE '⚠️ requires_expiry column already exists in global_documents';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ global_documents table does not exist - skipping';
  END IF;
END $$;

-- ============================================================================
-- 2. Ensure ppm_service_events table exists with required structure
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
    -- Create ppm_service_events table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ppm_service_events') THEN
      CREATE TABLE IF NOT EXISTS ppm_service_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ppm_id UUID, -- Links to ppm_schedule if it exists
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
        service_date DATE NOT NULL,
        notes TEXT,
        file_url TEXT,
        status TEXT DEFAULT 'completed',
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
        created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_ppm_service_events_asset ON ppm_service_events(asset_id);
      CREATE INDEX IF NOT EXISTS idx_ppm_service_events_date ON ppm_service_events(service_date);
      CREATE INDEX IF NOT EXISTS idx_ppm_service_events_company ON ppm_service_events(company_id);

      RAISE NOTICE '✅ Created ppm_service_events table';
    ELSE
      RAISE NOTICE '⚠️ ppm_service_events table already exists';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ assets table does not exist - skipping ppm_service_events creation';
  END IF;
END $$;

-- ============================================================================
-- 3. Create trigger function for auto-completing PPM tasks when service is logged
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_ppm_service_logged()
RETURNS TRIGGER AS $$
DECLARE
  v_task RECORD;
  v_asset RECORD;
  v_next_service_date DATE;
BEGIN
  -- Get asset info
  SELECT * INTO v_asset 
  FROM assets 
  WHERE id = NEW.asset_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Calculate next service date if frequency is set
  IF v_asset.ppm_frequency_months IS NOT NULL THEN
    v_next_service_date := NEW.service_date + (v_asset.ppm_frequency_months || ' months')::INTERVAL;
  END IF;
  
  -- Find matching PPM task
  SELECT * INTO v_task
  FROM checklist_tasks
  WHERE task_data->>'target_record_id' = NEW.asset_id::TEXT
    AND task_data->>'task_type' IN ('ppm_service_due', 'ppm_service_overdue')
    AND status IN ('pending', 'in_progress')
  LIMIT 1;
  
  IF FOUND THEN
    -- Update asset with next service date
    UPDATE assets
    SET 
      last_service_date = NEW.service_date,
      next_service_date = v_next_service_date,
      ppm_status = 'up_to_date',
      updated_at = NOW()
    WHERE id = NEW.asset_id;
    
    -- Complete task
    UPDATE checklist_tasks
    SET 
      status = 'completed',
      completed_at = NOW(),
      completed_by = NEW.created_by,
      completion_notes = format('PPM service logged on %s', NEW.service_date)
    WHERE id = v_task.id;
    
    -- Notify site manager if assigned
    IF v_task.assigned_to_user_id IS NOT NULL THEN
      INSERT INTO notifications (
        company_id,
        profile_id,
        type,
        title,
        message,
        link,
        task_id,
        priority
      ) VALUES (
        NEW.company_id,
        v_task.assigned_to_user_id,
        'task_completed',
        'PPM Service Completed',
        format('%s - PPM service logged', v_asset.name),
        format('/dashboard/assets/%s', NEW.asset_id),
        v_task.id,
        'low'
      )
      ON CONFLICT DO NOTHING; -- Prevent duplicate notifications
    END IF;
  ELSE
    -- Even if no task found, update the asset
    UPDATE assets
    SET 
      last_service_date = NEW.service_date,
      next_service_date = v_next_service_date,
      ppm_status = 'up_to_date',
      updated_at = NOW()
    WHERE id = NEW.asset_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_ppm_service_logged'
  ) THEN
    CREATE TRIGGER on_ppm_service_logged
    AFTER INSERT ON ppm_service_events
    FOR EACH ROW
    EXECUTE FUNCTION handle_ppm_service_logged();
    
    RAISE NOTICE '✅ Created on_ppm_service_logged trigger';
  ELSE
    RAISE NOTICE '⚠️ on_ppm_service_logged trigger already exists';
  END IF;
END $$;
