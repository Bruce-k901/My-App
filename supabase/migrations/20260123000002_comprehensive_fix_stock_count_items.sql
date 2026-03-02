-- ============================================================================
-- Migration: Comprehensive Fix for Stock Count Items
-- Description: Fixes view, triggers, and auto-creates stock_items when missing
-- Date: 2026-01-23
-- ============================================================================

BEGIN;

-- ============================================================================
-- VALIDATION: Check column alignment before proceeding
-- ============================================================================
DO $$
DECLARE
  v_missing_columns TEXT[];
  v_trigger_columns TEXT[] := ARRAY[
    'id', 'stock_count_id', 'stock_item_id', 'ingredient_id', 'library_type',
    'theoretical_closing', 'expected_quantity', 'expected_value',
    'counted_quantity', 'counted_value', 'variance_quantity', 'variance_value',
    'variance_percentage', 'variance_percent', 'unit_cost', 'is_counted',
    'status', 'needs_recount', 'notes', 'created_at', 'updated_at'
  ];
  v_ts_interface_columns TEXT[] := ARRAY[
    'id', 'stock_count_id', 'storage_area_id', 'ingredient_id', 'library_type',
    'counted_storage_area_id', 'item_type', 'opening_stock', 'stock_in',
    'sales', 'waste', 'transfers_in', 'transfers_out', 'theoretical_closing',
    'counted_quantity', 'variance_quantity', 'variance_percentage', 'variance_value',
    'unit_of_measurement', 'unit_cost', 'status', 'counted_at', 'notes', 'created_at'
  ];
  v_table_columns TEXT[];
  v_view_columns TEXT[];
  v_col TEXT;
BEGIN
  RAISE NOTICE '🔍 Starting column alignment validation...';
  
  -- Check base table columns
  SELECT array_agg(column_name ORDER BY ordinal_position)
  INTO v_table_columns
  FROM information_schema.columns
  WHERE table_schema = 'stockly'
    AND table_name = 'stock_count_items';
  
  IF v_table_columns IS NULL THEN
    RAISE EXCEPTION '❌ Base table stockly.stock_count_items does not exist!';
  END IF;
  
  RAISE NOTICE '✅ Base table exists with % columns', array_length(v_table_columns, 1);
  
  -- Check view columns (if view exists)
  -- First check if view exists
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'stock_count_items'
  ) THEN
    SELECT array_agg(column_name ORDER BY ordinal_position)
    INTO v_view_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stock_count_items';
  END IF;
  
  IF v_view_columns IS NOT NULL THEN
    RAISE NOTICE '✅ View exists with % columns', array_length(v_view_columns, 1);
    
    -- Check if trigger columns exist in view
    FOREACH v_col IN ARRAY v_trigger_columns
    LOOP
      IF NOT (v_col = ANY(v_view_columns)) THEN
        v_missing_columns := array_append(v_missing_columns, v_col);
      END IF;
    END LOOP;
    
    IF array_length(v_missing_columns, 1) > 0 THEN
      RAISE WARNING '⚠️ Missing columns in view: %', array_to_string(v_missing_columns, ', ');
    ELSE
      RAISE NOTICE '✅ All trigger columns exist in view';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ View does not exist yet (will be created)';
  END IF;
  
  -- Check required table columns
  IF NOT ('expected_quantity' = ANY(v_table_columns)) THEN
    RAISE EXCEPTION '❌ Required column expected_quantity missing from base table!';
  END IF;
  
  IF NOT ('variance_percent' = ANY(v_table_columns)) THEN
    RAISE NOTICE '⚠️ variance_percent missing from base table (will be added)';
  END IF;
  
  IF NOT ('needs_recount' = ANY(v_table_columns)) THEN
    RAISE NOTICE '⚠️ needs_recount missing from base table (will be added)';
  END IF;
  
  RAISE NOTICE '✅ Validation complete - proceeding with migration';
END $$;

-- ============================================================================
-- Step 0: Add missing total_variance_value column to stock_counts
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_counts' 
    AND column_name = 'total_variance_value'
  ) THEN
    ALTER TABLE stockly.stock_counts
    ADD COLUMN total_variance_value numeric(12,2) DEFAULT 0;
    
    -- Copy existing variance_value to total_variance_value for backward compatibility
    UPDATE stockly.stock_counts
    SET total_variance_value = COALESCE(variance_value, 0)
    WHERE total_variance_value IS NULL OR total_variance_value = 0;
    
    RAISE NOTICE '✅ Added total_variance_value column to stockly.stock_counts';
  ELSE
    RAISE NOTICE '✅ total_variance_value column already exists in stockly.stock_counts';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not add total_variance_value: %', SQLERRM;
END $$;

-- ============================================================================
-- Step 0.1: Fix stock_items library_type constraint to include first_aid_supplies_library
-- ============================================================================
DO $$
BEGIN
  -- Drop the old constraint if it exists
  ALTER TABLE stockly.stock_items
    DROP CONSTRAINT IF EXISTS stock_items_library_type_check;
  
  -- Add new constraint with all library types including first_aid_supplies_library
  ALTER TABLE stockly.stock_items
    ADD CONSTRAINT stock_items_library_type_check 
    CHECK (library_type IS NULL OR library_type IN (
      'ingredients_library',
      'chemicals_library',
      'ppe_library',
      'drinks_library',
      'disposables_library',
      'glassware_library',
      'packaging_library',
      'serving_equipment_library',
      'first_aid_supplies_library'
    ));
  
  RAISE NOTICE '✅ Updated stock_items library_type constraint to include first_aid_supplies_library';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not update stock_items constraint: %', SQLERRM;
END $$;

-- ============================================================================
-- Step 0.5: Ensure variance_percent, needs_recount, and counted_at columns exist in stockly.stock_count_items
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_count_items' 
    AND column_name = 'variance_percent'
  ) THEN
    ALTER TABLE stockly.stock_count_items
    ADD COLUMN variance_percent numeric(8,2) DEFAULT 0;
    
    RAISE NOTICE '✅ Added variance_percent column to stockly.stock_count_items';
  ELSE
    RAISE NOTICE '✅ variance_percent column already exists in stockly.stock_count_items';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_count_items' 
    AND column_name = 'needs_recount'
  ) THEN
    ALTER TABLE stockly.stock_count_items
    ADD COLUMN needs_recount boolean DEFAULT false;
    
    RAISE NOTICE '✅ Added needs_recount column to stockly.stock_count_items';
  ELSE
    RAISE NOTICE '✅ needs_recount column already exists in stockly.stock_count_items';
  END IF;
  
  -- Add counted_at if it doesn't exist (frontend sends it)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_count_items' 
    AND column_name = 'counted_at'
  ) THEN
    ALTER TABLE stockly.stock_count_items
    ADD COLUMN counted_at timestamptz;
    
    RAISE NOTICE '✅ Added counted_at column to stockly.stock_count_items';
  ELSE
    RAISE NOTICE '✅ counted_at column already exists in stockly.stock_count_items';
  END IF;
END $$;

-- ============================================================================
-- Step 1: Drop and recreate view with all required columns
-- ============================================================================
DROP VIEW IF EXISTS public.stock_count_items CASCADE;

CREATE VIEW public.stock_count_items AS
SELECT 
  sci.id,
  sci.stock_count_id,
  sci.stock_item_id,
  NULL::uuid AS storage_area_id,
  si.library_item_id AS ingredient_id,
  CASE 
    WHEN si.library_type = 'ingredients_library' THEN 'ingredients'::text
    WHEN si.library_type = 'packaging_library' THEN 'packaging'::text
    WHEN si.library_type = 'disposables_library' THEN 'foh'::text
    WHEN si.library_type = 'first_aid_supplies_library' THEN 'first_aid'::text
    WHEN si.library_type = 'ppe_library' THEN 'ppe'::text
    WHEN si.library_type = 'chemicals_library' THEN 'chemicals'::text
    ELSE NULL::text
  END AS library_type,
  NULL::uuid AS counted_storage_area_id,
  NULL::text AS item_type,
  NULL::numeric(10,2) AS opening_stock,
  0::numeric(10,2) AS stock_in,
  0::numeric(10,2) AS sales,
  0::numeric(10,2) AS waste,
  0::numeric(10,2) AS transfers_in,
  0::numeric(10,2) AS transfers_out,
  sci.expected_quantity,
  sci.expected_quantity AS theoretical_closing,
  sci.expected_value,
  sci.counted_quantity,
  sci.counted_value,
  sci.variance_quantity,
  CASE 
    WHEN sci.expected_quantity > 0 AND sci.variance_quantity IS NOT NULL THEN 
      (sci.variance_quantity / sci.expected_quantity * 100)::numeric(8,2)
    ELSE 0::numeric(8,2)
  END AS variance_percentage,
  sci.variance_percent,
  sci.variance_value,
  NULL::text AS unit_of_measurement,
  sci.unit_cost,
  sci.is_counted,
  CASE 
    WHEN sci.is_counted = true THEN 'counted'::text
    WHEN sci.counted_quantity IS NOT NULL THEN 'counted'::text
    ELSE 'pending'::text
  END AS status,
  sci.needs_recount,
  sci.counted_at,
  sci.notes,
  sci.created_at,
  sci.updated_at
FROM stockly.stock_count_items sci
LEFT JOIN stockly.stock_items si ON si.id = sci.stock_item_id;

-- ============================================================================
-- Step 2: Create helper function to get or create stock_item
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_or_create_stock_item(
  p_ingredient_id UUID,
  p_library_type TEXT,
  p_company_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_stock_item_id UUID;
  v_library_table_name TEXT;
  v_item_name TEXT;
  v_base_unit_id UUID;
  v_stockly_library_type TEXT;
BEGIN
  -- Map frontend library_type to stockly library_type
  v_stockly_library_type := CASE p_library_type
    WHEN 'ingredients' THEN 'ingredients_library'
    WHEN 'packaging' THEN 'packaging_library'
    WHEN 'foh' THEN 'disposables_library'
    WHEN 'first_aid' THEN 'first_aid_supplies_library'
    WHEN 'ppe' THEN 'ppe_library'
    WHEN 'chemicals' THEN 'chemicals_library'
    ELSE p_library_type
  END;

  -- First, try to find existing stock_item
  SELECT id INTO v_stock_item_id
  FROM stockly.stock_items
  WHERE library_item_id = p_ingredient_id
  AND library_type = v_stockly_library_type
  AND company_id = p_company_id
  LIMIT 1;

  -- If found, return it
  IF v_stock_item_id IS NOT NULL THEN
    RETURN v_stock_item_id;
  END IF;

  -- Get item name and details from library table
  v_library_table_name := v_stockly_library_type;
  
  -- Get name from the appropriate library table
  BEGIN
    EXECUTE format('
      SELECT 
        CASE 
          WHEN $1 = ''ingredients_library'' THEN ingredient_name
          WHEN $1 = ''packaging_library'' THEN item_name
          WHEN $1 = ''disposables_library'' THEN item_name
          WHEN $1 = ''first_aid_supplies_library'' THEN item_name
          WHEN $1 = ''ppe_library'' THEN item_name
          WHEN $1 = ''chemicals_library'' THEN product_name
          ELSE COALESCE(name, ''Unknown Item'')
        END
      FROM %I
      WHERE id = $2
      LIMIT 1',
      v_library_table_name
    ) INTO v_item_name
    USING v_stockly_library_type, p_ingredient_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- If query fails, use a default name
      v_item_name := 'Unknown Item';
  END;

  -- If we couldn't get the name, use a default
  IF v_item_name IS NULL THEN
    v_item_name := 'Unknown Item';
  END IF;

  -- Get a default base_unit_id (try 'ea' or 'each' first, otherwise get any unit)
  SELECT id INTO v_base_unit_id
  FROM public.uom
  WHERE (name = 'ea' OR name = 'each' OR name = 'unit' OR name = 'Unit')
  LIMIT 1;
  
  -- If still no unit, get any unit
  IF v_base_unit_id IS NULL THEN
    SELECT id INTO v_base_unit_id
    FROM public.uom
    LIMIT 1;
  END IF;

  -- Create new stock_item
  INSERT INTO stockly.stock_items (
    company_id,
    name,
    library_item_id,
    library_type,
    base_unit_id,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    p_company_id,
    v_item_name,
    p_ingredient_id,
    v_stockly_library_type,
    COALESCE(v_base_unit_id, (SELECT id FROM public.uom LIMIT 1)),
    TRUE,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_stock_item_id;

  RETURN v_stock_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Step 3: Update INSERT trigger to auto-create stock_items
-- ============================================================================
DROP FUNCTION IF EXISTS public.insert_stock_count_items() CASCADE;

CREATE OR REPLACE FUNCTION public.insert_stock_count_items()
RETURNS TRIGGER AS $$
DECLARE
  v_stock_item_id UUID;
  v_company_id UUID;
  v_variance_percent numeric(8,2);
  v_has_variance_percent BOOLEAN;
  -- Note: counted_value, expected_value, variance_quantity, variance_value are GENERATED columns
  -- They are automatically calculated and cannot be updated directly
BEGIN
  -- Get company_id from stock_count
  SELECT company_id INTO v_company_id
  FROM stockly.stock_counts
  WHERE id = NEW.stock_count_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Could not find company_id for stock_count_id %', NEW.stock_count_id;
  END IF;

  -- If NEW has ingredient_id, get or create stock_item
  IF NEW.ingredient_id IS NOT NULL THEN
    v_stock_item_id := public.get_or_create_stock_item(
      NEW.ingredient_id,
      COALESCE(NEW.library_type, 'ingredients'),
      v_company_id
    );
  ELSE
    v_stock_item_id := NEW.stock_item_id;
    IF v_stock_item_id IS NULL THEN
      RAISE EXCEPTION 'Either ingredient_id or stock_item_id must be provided';
    END IF;
  END IF;

  -- Calculate variance_percent if variance_percent column exists and we have variance data
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_count_items' 
    AND column_name = 'variance_percent'
  ) INTO v_has_variance_percent;

  IF v_has_variance_percent AND (NEW.variance_percentage IS NOT NULL OR NEW.variance_quantity IS NOT NULL) THEN
    v_variance_percent := CASE 
      WHEN NEW.variance_percentage IS NOT NULL THEN NEW.variance_percentage
      WHEN COALESCE(NEW.theoretical_closing, NEW.expected_quantity, 0) > 0 AND NEW.variance_quantity IS NOT NULL THEN 
        (NEW.variance_quantity / COALESCE(NEW.theoretical_closing, NEW.expected_quantity, 1) * 100)::numeric(8,2)
      ELSE NULL
    END;
  END IF;

  -- Insert ONLY required columns (without DEFAULTs) and columns with explicit values
  -- Let DEFAULTs handle columns with DEFAULT values (expected_value, is_counted, needs_recount, variance_quantity, etc.)
  INSERT INTO stockly.stock_count_items (
    id,
    stock_count_id,
    stock_item_id,
    expected_quantity,
    unit_cost,
    notes,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.stock_count_id,
    v_stock_item_id,
    COALESCE(NEW.theoretical_closing, NEW.expected_quantity, 0),
    NEW.unit_cost,
    NEW.notes,
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.updated_at, NOW())
  )
  RETURNING id INTO NEW.id;
  
  -- Note: expected_value is a GENERATED column (expected_quantity * unit_cost)
  -- We cannot update it directly - PostgreSQL calculates it automatically
  -- It will be recalculated when expected_quantity or unit_cost changes
  
  -- Update is_counted and needs_recount if needed
  IF NEW.is_counted IS NOT NULL OR NEW.status = 'counted' OR NEW.needs_recount IS NOT NULL THEN
    UPDATE stockly.stock_count_items SET
      is_counted = CASE 
        WHEN NEW.is_counted IS NOT NULL THEN NEW.is_counted
        WHEN NEW.status = 'counted' THEN true
        ELSE is_counted  -- Keep existing value
      END,
      needs_recount = CASE WHEN NEW.needs_recount IS NOT NULL THEN NEW.needs_recount ELSE needs_recount END,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  -- Now update counted columns ONLY if they were explicitly provided
  -- Note: counted_value, variance_quantity, and variance_value are GENERATED columns - they're auto-calculated
  -- We cannot and should not try to update them directly
  IF NEW.counted_quantity IS NOT NULL OR
     v_variance_percent IS NOT NULL THEN
    
    UPDATE stockly.stock_count_items SET
      counted_quantity = CASE WHEN NEW.counted_quantity IS NOT NULL THEN NEW.counted_quantity ELSE counted_quantity END,
      -- counted_value is GENERATED as (counted_quantity * unit_cost) - auto-calculated
      -- variance_quantity is GENERATED as (counted_quantity - expected_quantity) - auto-calculated
      -- variance_value is GENERATED as ((counted_quantity - expected_quantity) * unit_cost) - auto-calculated
      variance_percent = CASE WHEN v_variance_percent IS NOT NULL THEN v_variance_percent ELSE variance_percent END,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Step 4: Update UPDATE trigger
-- ============================================================================
DROP FUNCTION IF EXISTS public.update_stock_count_items() CASCADE;

CREATE OR REPLACE FUNCTION public.update_stock_count_items()
RETURNS TRIGGER AS $$
DECLARE
  v_stock_item_id UUID;
  v_library_type TEXT;
  v_company_id UUID;
  -- Note: counted_value, expected_value, variance_quantity, variance_value are GENERATED columns
  -- They are automatically calculated and cannot be updated directly
  v_db_counted_quantity_before numeric(12,3);
  v_db_variance_quantity_before numeric(12,3);
  v_db_variance_value_before numeric(12,2);
  v_db_counted_value_before numeric(12,2);
  v_db_is_counted_before boolean;
  v_db_counted_quantity_after numeric(12,3);
  v_db_variance_quantity_after numeric(12,3);
  v_db_variance_value_after numeric(12,2);
  v_db_counted_value_after numeric(12,2);
  v_db_is_counted_after boolean;
BEGIN
  -- DEBUG: Log what we're receiving
  RAISE NOTICE '=== UPDATE TRIGGER DEBUG START ===';
  RAISE NOTICE 'Item ID: %', NEW.id;
  RAISE NOTICE 'OLD.counted_quantity: %', OLD.counted_quantity;
  RAISE NOTICE 'NEW.counted_quantity: %', NEW.counted_quantity;
  RAISE NOTICE 'OLD.variance_quantity: % (GENERATED - will be recalculated)', OLD.variance_quantity;
  RAISE NOTICE 'NEW.variance_quantity: % (ignored - column is GENERATED)', NEW.variance_quantity;
  RAISE NOTICE 'OLD.variance_value: % (GENERATED - will be recalculated)', OLD.variance_value;
  RAISE NOTICE 'NEW.variance_value: % (ignored - column is GENERATED)', NEW.variance_value;
  RAISE NOTICE 'OLD.is_counted: %', OLD.is_counted;
  RAISE NOTICE 'NEW.is_counted: %', NEW.is_counted;
  RAISE NOTICE 'NEW.status: %', NEW.status;
  
  -- Get current values from database to compare
  -- Note: counted_value, variance_quantity, and variance_value are GENERATED columns
  SELECT counted_quantity, counted_value, variance_quantity, variance_value, is_counted 
  INTO v_db_counted_quantity_before, v_db_counted_value_before, v_db_variance_quantity_before, v_db_variance_value_before, v_db_is_counted_before
  FROM stockly.stock_count_items 
  WHERE id = NEW.id;
  
  RAISE NOTICE 'DB.counted_quantity (before update): %', v_db_counted_quantity_before;
  RAISE NOTICE 'DB.counted_value (before update): % (GENERATED)', v_db_counted_value_before;
  RAISE NOTICE 'DB.variance_quantity (before update): % (GENERATED)', v_db_variance_quantity_before;
  RAISE NOTICE 'DB.variance_value (before update): % (GENERATED)', v_db_variance_value_before;
  RAISE NOTICE 'DB.is_counted (before update): %', v_db_is_counted_before;
  
  -- Get company_id from stock_count
  SELECT company_id INTO v_company_id
  FROM stockly.stock_counts
  WHERE id = NEW.stock_count_id;

  -- If NEW has ingredient_id and it changed, get or create stock_item
  IF NEW.ingredient_id IS NOT NULL AND (OLD.ingredient_id IS NULL OR NEW.ingredient_id != OLD.ingredient_id) THEN
    v_stock_item_id := public.get_or_create_stock_item(
      NEW.ingredient_id,
      COALESCE(NEW.library_type, 'ingredients'),
      COALESCE(v_company_id, (SELECT company_id FROM stockly.stock_counts WHERE id = NEW.stock_count_id))
    );
  ELSE
    v_stock_item_id := NEW.stock_item_id;
  END IF;

  -- Note: counted_value is a GENERATED column (counted_quantity * unit_cost)
  -- We don't need to calculate it - PostgreSQL will do it automatically
  -- Just log that we're updating counted_quantity which will trigger the calculation
  IF NEW.counted_quantity IS NOT NULL THEN
    RAISE NOTICE 'Updating counted_quantity to %, counted_value will be auto-calculated', NEW.counted_quantity;
  END IF;

  -- CRITICAL: Only update columns that are explicitly provided in the UPDATE
  -- When updating through a view, columns not in the UPDATE statement are NULL in NEW
  -- We must preserve existing values for columns that aren't being updated
  UPDATE stockly.stock_count_items SET 
    stock_count_id = NEW.stock_count_id,
    stock_item_id = COALESCE(v_stock_item_id, stock_item_id),
    expected_quantity = COALESCE(NEW.theoretical_closing, NEW.expected_quantity, expected_quantity),
    -- CRITICAL: Only update if NEW has a value (not NULL), otherwise keep existing
    counted_quantity = CASE 
      WHEN NEW.counted_quantity IS NOT NULL THEN NEW.counted_quantity 
      ELSE counted_quantity 
    END,
    -- counted_value is GENERATED ALWAYS as (counted_quantity * unit_cost)
    -- expected_value is GENERATED ALWAYS as (expected_quantity * unit_cost)
    -- variance_quantity is GENERATED ALWAYS as (counted_quantity - expected_quantity)
    -- variance_value is GENERATED ALWAYS as ((counted_quantity - expected_quantity) * unit_cost)
    -- We cannot update these directly - PostgreSQL calculates them automatically
    -- So we skip them in the UPDATE - they'll be recalculated when counted_quantity/expected_quantity/unit_cost changes
    variance_percent = CASE 
      WHEN NEW.variance_percentage IS NOT NULL THEN NEW.variance_percentage
      -- Calculate from generated variance_quantity after update
      WHEN COALESCE(NEW.theoretical_closing, NEW.expected_quantity, 0) > 0 
           AND NEW.counted_quantity IS NOT NULL THEN 
        ((NEW.counted_quantity - COALESCE(NEW.theoretical_closing, NEW.expected_quantity, 0)) / COALESCE(NEW.theoretical_closing, NEW.expected_quantity, 1) * 100)::numeric(8,2)
      ELSE variance_percent
    END,
    unit_cost = CASE WHEN NEW.unit_cost IS NOT NULL THEN NEW.unit_cost ELSE unit_cost END,
    is_counted = COALESCE(
      CASE WHEN NEW.is_counted IS NOT NULL THEN NEW.is_counted ELSE NULL END,
      CASE WHEN NEW.status = 'counted' THEN true ELSE NULL END,
      is_counted
    ),
    needs_recount = CASE WHEN NEW.needs_recount IS NOT NULL THEN NEW.needs_recount ELSE needs_recount END,
    counted_at = CASE WHEN NEW.counted_at IS NOT NULL THEN NEW.counted_at::timestamptz ELSE counted_at END,
    notes = CASE WHEN NEW.notes IS NOT NULL THEN NEW.notes ELSE notes END,
    updated_at = COALESCE(NEW.updated_at, NOW())
  WHERE id = NEW.id;
  
  -- DEBUG: Verify what was actually set
  -- Note: counted_value, variance_quantity, and variance_value are GENERATED, so they'll be auto-calculated
  SELECT counted_quantity, counted_value, variance_quantity, variance_value, is_counted 
  INTO v_db_counted_quantity_after, v_db_counted_value_after, v_db_variance_quantity_after, v_db_variance_value_after, v_db_is_counted_after
  FROM stockly.stock_count_items 
  WHERE id = NEW.id;
  
  RAISE NOTICE 'DB.counted_quantity (after update): %', v_db_counted_quantity_after;
  RAISE NOTICE 'DB.counted_value (after update): % (GENERATED - auto-calculated)', v_db_counted_value_after;
  RAISE NOTICE 'DB.variance_quantity (after update): % (GENERATED - auto-calculated)', v_db_variance_quantity_after;
  RAISE NOTICE 'DB.variance_value (after update): % (GENERATED - auto-calculated)', v_db_variance_value_after;
  RAISE NOTICE 'DB.is_counted (after update): %', v_db_is_counted_after;
  
  -- Check if values were cleared
  IF v_db_counted_quantity_after IS NULL AND NEW.counted_quantity IS NOT NULL THEN
    RAISE WARNING '⚠️ counted_quantity was cleared! NEW had: %, but DB now has: NULL', NEW.counted_quantity;
  END IF;
  -- Note: variance_quantity and variance_value are GENERATED, so we don't check them
  
  -- Handle counted_at if provided (view exposes it but table might not have it)
  -- Note: counted_at is exposed in view but may not exist in base table
  -- We'll skip updating it if the column doesn't exist
  
  -- Note: expected_value is a GENERATED column (expected_quantity * unit_cost)
  -- We cannot update it directly - PostgreSQL calculates it automatically
  -- It will be recalculated when expected_quantity or unit_cost changes
  
  -- Handle counted_at if the column exists (it's in the view but may not be in base table)
  -- This is a read-only column in the view, so we ignore updates to it
  -- (counted_at is only in stock_count_lines, not stock_count_items)
  
  RAISE NOTICE '=== UPDATE TRIGGER DEBUG END ===';
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in update_stock_count_items trigger for item %: % (SQLSTATE: %). NEW.counted_quantity=%, NEW.is_counted=%. Note: variance_quantity and variance_value are GENERATED columns and cannot be updated directly.', 
      NEW.id, SQLERRM, SQLSTATE, NEW.counted_quantity, NEW.is_counted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Step 5: Create DELETE trigger
-- ============================================================================
DROP FUNCTION IF EXISTS public.delete_stock_count_items() CASCADE;

CREATE OR REPLACE FUNCTION public.delete_stock_count_items()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.stock_count_items
  WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Step 6: Create all triggers
-- ============================================================================
DROP TRIGGER IF EXISTS stock_count_items_insert_trigger ON public.stock_count_items;
DROP TRIGGER IF EXISTS stock_count_items_update_trigger ON public.stock_count_items;
DROP TRIGGER IF EXISTS stock_count_items_delete_trigger ON public.stock_count_items;

CREATE TRIGGER stock_count_items_insert_trigger
  INSTEAD OF INSERT ON public.stock_count_items
  FOR EACH ROW EXECUTE FUNCTION public.insert_stock_count_items();

CREATE TRIGGER stock_count_items_update_trigger
  INSTEAD OF UPDATE ON public.stock_count_items
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_count_items();

CREATE TRIGGER stock_count_items_delete_trigger
  INSTEAD OF DELETE ON public.stock_count_items
  FOR EACH ROW EXECUTE FUNCTION public.delete_stock_count_items();

-- ============================================================================
-- Step 7: Create trigger to auto-update items_counted when is_counted changes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_stock_count_items_counted()
RETURNS TRIGGER AS $$
DECLARE
  v_stock_count_id UUID;
  v_should_update BOOLEAN := false;
BEGIN
  -- Determine stock_count_id and whether we should update
  IF TG_OP = 'DELETE' THEN
    v_stock_count_id := OLD.stock_count_id;
    v_should_update := true; -- Always update on delete
  ELSIF TG_OP = 'INSERT' THEN
    v_stock_count_id := NEW.stock_count_id;
    -- Only update if the new item is marked as counted
    v_should_update := COALESCE(NEW.is_counted, false) = true;
  ELSIF TG_OP = 'UPDATE' THEN
    v_stock_count_id := NEW.stock_count_id;
    -- Only update if is_counted changed
    v_should_update := (OLD.is_counted IS DISTINCT FROM NEW.is_counted);
  END IF;
  
  -- Only update if needed
  IF v_should_update AND v_stock_count_id IS NOT NULL THEN
    UPDATE stockly.stock_counts
    SET 
      items_counted = (
        SELECT COUNT(*) 
        FROM stockly.stock_count_items 
        WHERE stock_count_id = v_stock_count_id
          AND is_counted = true
      ),
      updated_at = NOW()
    WHERE id = v_stock_count_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS stock_count_items_auto_update_counted ON stockly.stock_count_items;

CREATE TRIGGER stock_count_items_auto_update_counted
  AFTER INSERT OR UPDATE OR DELETE ON stockly.stock_count_items
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_stock_count_items_counted();

-- ============================================================================
-- FINAL VALIDATION: Verify all columns are aligned after migration
-- ============================================================================
DO $$
DECLARE
  v_view_columns TEXT[];
  v_table_columns TEXT[];
  v_required_columns TEXT[] := ARRAY[
    'id', 'stock_count_id', 'stock_item_id', 'ingredient_id', 'library_type',
    'expected_quantity', 'expected_value', 'theoretical_closing',
    'counted_quantity', 'counted_value', 'variance_quantity', 'variance_value',
    'variance_percentage', 'variance_percent', 'unit_cost', 'is_counted',
    'status', 'needs_recount', 'notes', 'created_at', 'updated_at'
  ];
  v_missing TEXT[];
  v_col TEXT;
BEGIN
  RAISE NOTICE '🔍 Final validation: Checking column alignment...';
  
  -- Get view columns
  SELECT array_agg(column_name ORDER BY ordinal_position)
  INTO v_view_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'stock_count_items';
  
  IF v_view_columns IS NULL THEN
    RAISE EXCEPTION '❌ View public.stock_count_items was not created!';
  END IF;
  
  -- Check all required columns exist in view
  FOREACH v_col IN ARRAY v_required_columns
  LOOP
    IF NOT (v_col = ANY(v_view_columns)) THEN
      v_missing := array_append(v_missing, v_col);
    END IF;
  END LOOP;
  
  IF array_length(v_missing, 1) > 0 THEN
    RAISE WARNING '⚠️ Missing columns in view: %', array_to_string(v_missing, ', ');
  ELSE
    RAISE NOTICE '✅ All required columns exist in view';
  END IF;
  
  -- Verify triggers exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'stock_count_items_insert_trigger'
  ) THEN
    RAISE WARNING '⚠️ INSERT trigger not found';
  ELSE
    RAISE NOTICE '✅ INSERT trigger exists';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'stock_count_items_update_trigger'
  ) THEN
    RAISE WARNING '⚠️ UPDATE trigger not found';
  ELSE
    RAISE NOTICE '✅ UPDATE trigger exists';
  END IF;
  
  RAISE NOTICE '✅ Migration validation complete!';
END $$;

COMMIT;
