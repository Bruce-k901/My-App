-- ============================================================================
-- Migration: Add Review Fields to Stock Counts
-- Description: Adds fields for review workflow including rejection reason,
--              reviewer comments on items, and rejection tracking
-- Date: 2025-12-15
-- ============================================================================

-- ============================================================================
-- Add rejection fields to stock_counts
-- ============================================================================
DO $$
BEGIN
  -- Check if stockly schema and stock_counts table exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' AND table_name = 'stock_counts'
  ) THEN
    RAISE NOTICE 'stockly schema or stockly.stock_counts table does not exist - skipping stock_count_review_fields migration';
    RETURN;
  END IF;

  -- Add rejection_reason if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_counts' 
    AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE stockly.stock_counts
    ADD COLUMN rejection_reason text;
  END IF;

  -- Add rejected_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_counts' 
    AND column_name = 'rejected_by'
  ) THEN
    -- Only add foreign key if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      ALTER TABLE stockly.stock_counts
      ADD COLUMN rejected_by uuid REFERENCES public.profiles(id);
    ELSE
      ALTER TABLE stockly.stock_counts
      ADD COLUMN rejected_by uuid;
    END IF;
  END IF;

  -- Add rejected_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_counts' 
    AND column_name = 'rejected_at'
  ) THEN
    ALTER TABLE stockly.stock_counts
    ADD COLUMN rejected_at timestamptz;
  END IF;

  -- Update status constraint to include 'rejected'
  -- First, drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_counts' 
    AND constraint_name = 'stock_counts_status_check'
  ) THEN
    ALTER TABLE stockly.stock_counts
    DROP CONSTRAINT stock_counts_status_check;
  END IF;

  -- Add new constraint with 'rejected' status
  ALTER TABLE stockly.stock_counts
  ADD CONSTRAINT stock_counts_status_check 
  CHECK (status IN ('draft', 'in_progress', 'pending_review', 'approved', 'completed', 'cancelled', 'rejected', 'finalized', 'locked'));
END $$;

-- ============================================================================
-- Add reviewer_comment to stock_count_items
-- ============================================================================
DO $$
BEGIN
  -- Check if stockly schema and stock_count_items table exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' AND table_name = 'stock_count_items'
  ) THEN
    RAISE NOTICE 'stockly schema or stockly.stock_count_items table does not exist - skipping reviewer_comment column';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_count_items' 
    AND column_name = 'reviewer_comment'
  ) THEN
    ALTER TABLE stockly.stock_count_items
    ADD COLUMN reviewer_comment text;
  END IF;
END $$;

-- ============================================================================
-- Fix update_stock_count_summary trigger to handle is_counted boolean
-- ============================================================================
DO $$
BEGIN
  -- Check if stockly schema exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping update_stock_count_summary function';
    RETURN;
  END IF;

  DROP FUNCTION IF EXISTS update_stock_count_summary() CASCADE;

  EXECUTE $sql_func1$
    CREATE OR REPLACE FUNCTION update_stock_count_summary()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_schema_name TEXT;
      v_table_name TEXT;
      v_has_is_counted BOOLEAN;
      v_has_status_field BOOLEAN;
    BEGIN
      -- Determine which schema and table we're working with
      IF EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'stockly' AND table_name = 'stock_count_items') THEN
        v_schema_name := 'stockly';
        v_table_name := 'stock_count_items';
      ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'stock_count_items'
                    AND table_type = 'BASE TABLE') THEN
        v_schema_name := 'public';
        v_table_name := 'stock_count_items';
      ELSE
        RETURN NEW;
      END IF;

      -- Check if is_counted column exists
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = v_schema_name 
        AND table_name = v_table_name 
        AND column_name = 'is_counted'
      ) INTO v_has_is_counted;

      -- Check if status column exists
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = v_schema_name 
        AND table_name = v_table_name 
        AND column_name = 'status'
      ) INTO v_has_status_field;

      -- Update stock_counts summary based on which field exists
      IF v_has_is_counted THEN
        -- Use is_counted boolean (stockly schema)
        EXECUTE format('
          UPDATE %I.stock_counts
          SET 
            total_items = (
              SELECT COUNT(*) FROM %I.%I WHERE stock_count_id = $1.stock_count_id
            ),
            items_counted = (
              SELECT COUNT(*) FROM %I.%I 
              WHERE stock_count_id = $1.stock_count_id AND is_counted = true
            ),
            variance_count = (
              SELECT COUNT(*) FROM %I.%I 
              WHERE stock_count_id = $1.stock_count_id 
              AND is_counted = true 
              AND ABS(COALESCE(variance_quantity, 0)) > 0.001
            ),
            total_variance_value = (
              SELECT COALESCE(SUM(variance_value), 0) FROM %I.%I 
              WHERE stock_count_id = $1.stock_count_id AND is_counted = true
            ),
            updated_at = now()
          WHERE id = $1.stock_count_id',
          v_schema_name, v_schema_name, v_table_name,
          v_schema_name, v_table_name,
          v_schema_name, v_table_name,
          v_schema_name, v_table_name
        ) USING NEW;
      ELSIF v_has_status_field THEN
        -- Use status field (public schema)
        EXECUTE format('
          UPDATE %I.stock_counts
          SET 
            total_items = (
              SELECT COUNT(*) FROM %I.%I WHERE stock_count_id = $1.stock_count_id
            ),
            items_counted = (
              SELECT COUNT(*) FROM %I.%I 
              WHERE stock_count_id = $1.stock_count_id AND status = ''counted''
            ),
            variance_count = (
              SELECT COUNT(*) FROM %I.%I 
              WHERE stock_count_id = $1.stock_count_id 
              AND status = ''counted'' 
              AND ABS(COALESCE(variance_quantity, 0)) > 0.001
            ),
            total_variance_value = (
              SELECT COALESCE(SUM(variance_value), 0) FROM %I.%I 
              WHERE stock_count_id = $1.stock_count_id AND status = ''counted''
            ),
            updated_at = now()
          WHERE id = $1.stock_count_id',
          v_schema_name, v_schema_name, v_table_name,
          v_schema_name, v_table_name,
          v_schema_name, v_table_name,
          v_schema_name, v_table_name
        ) USING NEW;
      END IF;
      
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql_func1$;
END $$;

-- Recreate trigger
DO $$
DECLARE
  trigger_table_schema TEXT;
  trigger_table_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'stockly' AND table_name = 'stock_count_items') THEN
    trigger_table_schema := 'stockly';
    trigger_table_name := 'stock_count_items';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'stock_count_items'
                AND table_type = 'BASE TABLE') THEN
    trigger_table_schema := 'public';
    trigger_table_name := 'stock_count_items';
  END IF;
  
  IF trigger_table_schema IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_count_summary_trigger ON stockly.stock_count_items;
    DROP TRIGGER IF EXISTS update_count_summary_trigger ON public.stock_count_items;
    
    EXECUTE format('CREATE TRIGGER update_count_summary_trigger
      AFTER INSERT OR UPDATE ON %I.%I
      FOR EACH ROW
      EXECUTE FUNCTION update_stock_count_summary()',
      trigger_table_schema, trigger_table_name);
  END IF;
END $$;

-- ============================================================================
-- Create function to process approved stock counts
-- ============================================================================
DO $$
BEGIN
  -- Check if stockly schema and required tables exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' AND table_name = 'stock_counts'
  ) THEN
    RAISE NOTICE 'stockly schema or stockly.stock_counts table does not exist - skipping process_approved_stock_count function';
    RETURN;
  END IF;

  EXECUTE $sql_func2$
    CREATE OR REPLACE FUNCTION process_approved_stock_count(p_count_id uuid)
    RETURNS void AS $func$
    DECLARE
      v_count RECORD;
      v_item RECORD;
      v_site_id uuid;
      v_company_id uuid;
      v_existing_level_id uuid;
    BEGIN
      -- Get count details
      SELECT * INTO v_count
      FROM stockly.stock_counts
      WHERE id = p_count_id;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Stock count not found: %', p_count_id;
      END IF;
      
      IF v_count.status != 'approved' THEN
        RAISE EXCEPTION 'Stock count must be approved before processing. Current status: %', v_count.status;
      END IF;
      
      v_site_id := v_count.site_id;
      v_company_id := v_count.company_id;
      
      -- Process each counted item
      FOR v_item IN 
        SELECT * FROM stockly.stock_count_items
        WHERE stock_count_id = p_count_id
        AND is_counted = true
        AND counted_quantity IS NOT NULL
      LOOP
        -- Find or create stock level
        SELECT id INTO v_existing_level_id
        FROM stockly.stock_levels
        WHERE stock_item_id = v_item.stock_item_id
        AND site_id = v_site_id;
        
        IF v_existing_level_id IS NOT NULL THEN
          -- Update existing stock level
          UPDATE stockly.stock_levels
          SET 
            quantity = v_item.counted_quantity,
            last_count_date = v_count.count_date,
            last_count_quantity = v_item.counted_quantity,
            updated_at = now()
          WHERE id = v_existing_level_id;
        ELSE
          -- Create new stock level
          INSERT INTO stockly.stock_levels (
            stock_item_id,
            site_id,
            quantity,
            last_count_date,
            last_count_quantity,
            created_at,
            updated_at
          ) VALUES (
            v_item.stock_item_id,
            v_site_id,
            v_item.counted_quantity,
            v_count.count_date,
            v_item.counted_quantity,
            now(),
            now()
          );
        END IF;
        
        -- Create stock movement for variance if there is one
        IF ABS(COALESCE(v_item.variance_quantity, 0)) > 0.001 THEN
          INSERT INTO stockly.stock_movements (
            company_id,
            stock_item_id,
            site_id,
            movement_type,
            quantity,
            unit_cost,
            reference_type,
            reference_id,
            notes,
            created_at
          ) VALUES (
            v_company_id,
            v_item.stock_item_id,
            v_site_id,
            'count_adjustment',
            v_item.variance_quantity,
            v_item.unit_cost,
            'stock_count',
            p_count_id,
            format('Stock count adjustment from count: %s', v_count.count_number),
            now()
          );
        END IF;
      END LOOP;
    END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql_func2$;
END $$;
