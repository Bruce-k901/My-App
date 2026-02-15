-- ============================================================================
-- Migration: Revise Stock Counts to Library-Based System
-- Description: Changes stock counts from storage-area-based to library-based.
--              Users select libraries (Ingredients, Packaging, FOH) instead of
--              storage areas. Storage areas are recorded DURING counting.
-- Date: 2025-02-11
-- ============================================================================

DO $$
DECLARE
  is_view BOOLEAN;
  is_table BOOLEAN;
  actual_table_schema TEXT;
  actual_table_name TEXT;
  counts_is_view BOOLEAN;
  counts_is_table BOOLEAN;
  counts_table_schema TEXT;
  counts_table_name TEXT;
BEGIN
  -- Only proceed if stock_counts table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'stock_counts') THEN

    -- ============================================================================
    -- DROP OLD TABLE (no longer needed)
    -- ============================================================================
    DROP TABLE IF EXISTS stock_count_areas CASCADE;

    -- ============================================================================
    -- MODIFY STOCK_COUNT_ITEMS
    -- Check if it's a view or table, and handle accordingly
    -- ============================================================================
    BEGIN
      -- Check if public.stock_count_items is a view
      SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' AND table_name = 'stock_count_items'
      ) INTO is_view;
      
      -- Check if public.stock_count_items is a table
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'stock_count_items'
        AND table_type = 'BASE TABLE'
      ) INTO is_table;
      
      -- Determine the actual table schema and name
      IF is_view THEN
        -- It's a view, so the actual table is likely in stockly schema
        actual_table_schema := 'stockly';
        actual_table_name := 'stock_count_items';
      ELSIF is_table THEN
        -- It's a table in public schema
        actual_table_schema := 'public';
        actual_table_name := 'stock_count_items';
      ELSE
        -- Check if stockly.stock_count_items exists
        IF EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'stockly' AND table_name = 'stock_count_items') THEN
          actual_table_schema := 'stockly';
          actual_table_name := 'stock_count_items';
        ELSE
          -- Table doesn't exist, skip modifications
          actual_table_schema := NULL;
        END IF;
      END IF;
      
      -- Only proceed if we found a table to modify
      IF actual_table_schema IS NOT NULL THEN
        -- Make storage_area_id nullable (items don't need pre-assigned areas)
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = actual_table_schema
          AND table_name = actual_table_name
          AND column_name = 'storage_area_id'
          AND is_nullable = 'NO'
        ) THEN
          EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN storage_area_id DROP NOT NULL', 
                        actual_table_schema, actual_table_name);
        END IF;

        -- Add new columns
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = actual_table_schema
          AND table_name = actual_table_name
          AND column_name = 'library_type'
        ) THEN
          EXECUTE format('ALTER TABLE %I.%I ADD COLUMN library_type text CHECK (library_type IN (''ingredients'', ''packaging'', ''foh''))',
                        actual_table_schema, actual_table_name);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = actual_table_schema
          AND table_name = actual_table_name
          AND column_name = 'counted_storage_area_id'
        ) THEN
          EXECUTE format('ALTER TABLE %I.%I ADD COLUMN counted_storage_area_id uuid',
                        actual_table_schema, actual_table_name);
          
          -- Add foreign key constraint if storage_areas exists
          IF EXISTS (SELECT 1 FROM information_schema.tables 
                     WHERE (table_schema = 'public' AND table_name = 'storage_areas')
                        OR (table_schema = 'stockly' AND table_name = 'storage_areas')) THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables 
                       WHERE table_schema = 'public' AND table_name = 'storage_areas') THEN
              EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT stock_count_items_counted_storage_area_id_fkey FOREIGN KEY (counted_storage_area_id) REFERENCES public.storage_areas(id) ON DELETE SET NULL',
                            actual_table_schema, actual_table_name);
            ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                          WHERE table_schema = 'stockly' AND table_name = 'storage_areas') THEN
              EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT stock_count_items_counted_storage_area_id_fkey FOREIGN KEY (counted_storage_area_id) REFERENCES stockly.storage_areas(id) ON DELETE SET NULL',
                            actual_table_schema, actual_table_name);
            END IF;
          END IF;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = actual_table_schema
          AND table_name = actual_table_name
          AND column_name = 'item_type'
        ) THEN
          EXECUTE format('ALTER TABLE %I.%I ADD COLUMN item_type text',
                        actual_table_schema, actual_table_name);
        END IF;

        -- Create indexes
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_stock_count_items_library ON %I.%I(library_type)',
                      actual_table_schema, actual_table_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_stock_count_items_counted_area ON %I.%I(counted_storage_area_id)',
                      actual_table_schema, actual_table_name);
        
        -- If it was a view, recreate it to include new columns
        IF is_view THEN
          DROP VIEW IF EXISTS public.stock_count_items CASCADE;
          EXECUTE format('CREATE VIEW public.stock_count_items AS SELECT * FROM %I.%I',
                        actual_table_schema, actual_table_name);
        END IF;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error modifying stock_count_items: %', SQLERRM;
    END;

    -- ============================================================================
    -- MODIFY STOCK_COUNTS
    -- Check if it's a view or table, and handle accordingly
    -- ============================================================================
    BEGIN
      -- Check if public.stock_counts is a view
      SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' AND table_name = 'stock_counts'
      ) INTO counts_is_view;
      
      -- Check if public.stock_counts is a table
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'stock_counts'
        AND table_type = 'BASE TABLE'
      ) INTO counts_is_table;
      
      -- Determine the actual table schema and name
      IF counts_is_view THEN
        -- It's a view, so the actual table is likely in stockly schema
        counts_table_schema := 'stockly';
        counts_table_name := 'stock_counts';
      ELSIF counts_is_table THEN
        -- It's a table in public schema
        counts_table_schema := 'public';
        counts_table_name := 'stock_counts';
      ELSE
        -- Check if stockly.stock_counts exists
        IF EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'stockly' AND table_name = 'stock_counts') THEN
          counts_table_schema := 'stockly';
          counts_table_name := 'stock_counts';
        ELSE
          -- Table doesn't exist, skip modifications
          counts_table_schema := NULL;
        END IF;
      END IF;
      
      -- Only proceed if we found a table to modify
      IF counts_table_schema IS NOT NULL THEN
        -- Add name column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = counts_table_schema
          AND table_name = counts_table_name
          AND column_name = 'name'
        ) THEN
          EXECUTE format('ALTER TABLE %I.%I ADD COLUMN name text',
                        counts_table_schema, counts_table_name);
        END IF;
        
        -- Add libraries_included column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = counts_table_schema
          AND table_name = counts_table_name
          AND column_name = 'libraries_included'
        ) THEN
          EXECUTE format('ALTER TABLE %I.%I ADD COLUMN libraries_included text[]',
                        counts_table_schema, counts_table_name);
        END IF;
        
        -- If it was a view, recreate it to include new columns
        IF counts_is_view THEN
          DROP VIEW IF EXISTS public.stock_counts CASCADE;
          EXECUTE format('CREATE VIEW public.stock_counts AS SELECT * FROM %I.%I',
                        counts_table_schema, counts_table_name);
        END IF;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error modifying stock_counts: %', SQLERRM;
    END;

  END IF;
END $$;

-- ============================================================================
-- UPDATE SUMMARY FUNCTION (must be outside DO block)
-- ============================================================================
DROP FUNCTION IF EXISTS update_stock_count_summary() CASCADE;

CREATE OR REPLACE FUNCTION update_stock_count_summary()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'stock_count_items') THEN
    UPDATE stock_counts
    SET 
      total_items = (
        SELECT COUNT(*) FROM stock_count_items WHERE stock_count_id = NEW.stock_count_id
      ),
      items_counted = (
        SELECT COUNT(*) FROM stock_count_items 
        WHERE stock_count_id = NEW.stock_count_id AND status = 'counted'
      ),
      variance_count = (
        SELECT COUNT(*) FROM stock_count_items 
        WHERE stock_count_id = NEW.stock_count_id 
        AND status = 'counted' 
        AND ABS(variance_quantity) > 0
      ),
      total_variance_value = (
        SELECT COALESCE(SUM(variance_value), 0) FROM stock_count_items 
        WHERE stock_count_id = NEW.stock_count_id AND status = 'counted'
      )
    WHERE id = NEW.stock_count_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on the actual table (not the view)
DO $$
DECLARE
  trigger_table_schema TEXT;
  trigger_table_name TEXT;
BEGIN
  -- Determine the actual table (not view) to attach trigger to
  -- Check if stockly.stock_count_items exists (the underlying table)
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'stockly' AND table_name = 'stock_count_items') THEN
    trigger_table_schema := 'stockly';
    trigger_table_name := 'stock_count_items';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'stock_count_items'
                AND table_type = 'BASE TABLE') THEN
    trigger_table_schema := 'public';
    trigger_table_name := 'stock_count_items';
  ELSE
    trigger_table_schema := NULL;
  END IF;
  
  -- Only create trigger if we found the actual table
  IF trigger_table_schema IS NOT NULL THEN
    -- Drop trigger if it exists (on either schema)
    DROP TRIGGER IF EXISTS update_count_summary_trigger ON stockly.stock_count_items;
    DROP TRIGGER IF EXISTS update_count_summary_trigger ON public.stock_count_items;
    
    -- Create trigger on the actual table
    EXECUTE format('CREATE TRIGGER update_count_summary_trigger
      AFTER INSERT OR UPDATE ON %I.%I
      FOR EACH ROW
      EXECUTE FUNCTION update_stock_count_summary()',
      trigger_table_schema, trigger_table_name);
  END IF;
END $$;

-- ============================================================================
-- COMMENTS (using dynamic SQL since COMMENT ON can't be conditional)
-- ============================================================================
DO $$
BEGIN
  -- Add comments if columns exist (using dynamic SQL)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'stock_count_items' 
             AND column_name = 'library_type') THEN
    EXECUTE 'COMMENT ON COLUMN stock_count_items.library_type IS ''Which library this item came from: ingredients, packaging, or foh''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'stock_count_items' 
             AND column_name = 'counted_storage_area_id') THEN
    EXECUTE 'COMMENT ON COLUMN stock_count_items.counted_storage_area_id IS ''Where this item was actually found during counting''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'stock_count_items' 
             AND column_name = 'storage_area_id') THEN
    EXECUTE 'COMMENT ON COLUMN stock_count_items.storage_area_id IS ''Pre-assigned storage area from item library (may be null)''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'stock_counts' 
             AND column_name = 'libraries_included') THEN
    EXECUTE 'COMMENT ON COLUMN stock_counts.libraries_included IS ''Array of libraries included in this count: ingredients, packaging, foh''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'stock_counts' 
             AND column_name = 'name') THEN
    EXECUTE 'COMMENT ON COLUMN stock_counts.name IS ''Human-readable name for the stock count''';
  END IF;
END $$;

-- ============================================================================
-- UPDATE VIEW TRIGGER FUNCTIONS (if they exist) to handle new columns
-- ============================================================================
-- Note: This updates the trigger functions to handle name and libraries_included
-- columns. These functions are defined in 06-stockly-public-views.sql
-- This update ensures compatibility with the new schema
DO $$
DECLARE
  has_name_col BOOLEAN := FALSE;
  has_libraries_col BOOLEAN := FALSE;
  insert_sql TEXT;
  update_sql TEXT;
  name_col_sql TEXT;
  libraries_col_sql TEXT;
  name_val_sql TEXT;
  libraries_val_sql TEXT;
  name_set_sql TEXT;
  libraries_set_sql TEXT;
BEGIN
  -- Check if columns exist in stockly.stock_counts
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' AND table_name = 'stock_counts' AND column_name = 'name'
  ) INTO has_name_col;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' AND table_name = 'stock_counts' AND column_name = 'libraries_included'
  ) INTO has_libraries_col;
  
  -- Only update if trigger functions exist and columns exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_stock_counts' AND pronamespace = 'public'::regnamespace) 
     AND has_name_col AND has_libraries_col THEN
    
    -- Build SQL fragments for conditional columns
    name_col_sql := CASE WHEN has_name_col THEN 'name, ' ELSE '' END;
    libraries_col_sql := CASE WHEN has_libraries_col THEN 'libraries_included, ' ELSE '' END;
    name_val_sql := CASE WHEN has_name_col THEN 'NEW.name, ' ELSE '' END;
    libraries_val_sql := CASE WHEN has_libraries_col THEN 'NEW.libraries_included, ' ELSE '' END;
    name_set_sql := CASE WHEN has_name_col THEN 'name = NEW.name, ' ELSE '' END;
    libraries_set_sql := CASE WHEN has_libraries_col THEN 'libraries_included = NEW.libraries_included, ' ELSE '' END;
    
    -- Update insert function
    DROP FUNCTION IF EXISTS public.insert_stock_counts() CASCADE;
    
    insert_sql := format('
      CREATE OR REPLACE FUNCTION public.insert_stock_counts()
      RETURNS TRIGGER AS $func$
      BEGIN
        INSERT INTO stockly.stock_counts (
          id, company_id, site_id, count_date, status, notes, created_at, updated_at,
          %s%s count_number, count_type, categories, storage_areas,
          total_items, items_counted, counted_items, variance_count, variance_value,
          started_at, started_by, completed_at, completed_by, reviewed_by, reviewed_at
        )
        VALUES (
          COALESCE(NEW.id, gen_random_uuid()),
          NEW.company_id,
          NEW.site_id,
          NEW.count_date,
          COALESCE(NEW.status, ''draft''),
          NEW.notes,
          COALESCE(NEW.created_at, NOW()),
          NOW(),
          %s%s NEW.count_number,
          COALESCE(NEW.count_type, ''full''),
          NEW.categories,
          NEW.storage_areas,
          COALESCE(NEW.total_items, 0),
          COALESCE(NEW.items_counted, 0),
          COALESCE(NEW.counted_items, 0),
          COALESCE(NEW.variance_count, 0),
          COALESCE(NEW.variance_value, 0),
          NEW.started_at,
          NEW.started_by,
          NEW.completed_at,
          NEW.completed_by,
          NEW.reviewed_by,
          NEW.reviewed_at
        );
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql SECURITY DEFINER;
    ', name_col_sql, libraries_col_sql, name_val_sql, libraries_val_sql);
    
    EXECUTE insert_sql;

    -- Update update function
    DROP FUNCTION IF EXISTS public.update_stock_counts() CASCADE;
    
    update_sql := format('
      CREATE OR REPLACE FUNCTION public.update_stock_counts()
      RETURNS TRIGGER AS $func$
      BEGIN
        UPDATE stockly.stock_counts SET 
          company_id = NEW.company_id,
          site_id = NEW.site_id,
          %s%s count_number = NEW.count_number,
          count_date = NEW.count_date,
          count_type = NEW.count_type,
          status = NEW.status,
          categories = NEW.categories,
          storage_areas = NEW.storage_areas,
          total_items = NEW.total_items,
          items_counted = NEW.items_counted,
          counted_items = NEW.counted_items,
          variance_count = NEW.variance_count,
          variance_value = NEW.variance_value,
          started_at = NEW.started_at,
          started_by = NEW.started_by,
          completed_at = NEW.completed_at,
          completed_by = NEW.completed_by,
          reviewed_by = NEW.reviewed_by,
          reviewed_at = NEW.reviewed_at,
          notes = NEW.notes,
          updated_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql SECURITY DEFINER;
    ', name_set_sql, libraries_set_sql);
    
    EXECUTE update_sql;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not update stock_counts trigger functions: %', SQLERRM;
END $$;

