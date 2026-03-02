-- Migration: 20260201_fix_recipe_schema_issues.sql
-- Date: 2026-02-01
-- Description: Comprehensive fix for recipe_ingredients schema migration issues
--              where stock_item_id was renamed to ingredient_id but dependent
--              objects were not updated.
--
-- Root Cause: The recipe_ingredients table was migrated from stock_item_id to
--             ingredient_id, but several functions, triggers, views, and constraints
--             were not updated to reflect this change.
--
-- Issues Fixed:
--   1. log_recipe_full_snapshot() - Referenced ri.stock_item_id in JSON building
--   2. recipe_audit_log constraint - Missing 'data_snapshot' event type
--   3. insert_recipe_ingredients() - Used RETURNING * which caused column mismatch
--   4. calculate_item_usage() - Referenced ri.stock_item_id in recipe JOIN
--   5. recipe_modifiers - Still had stock_item_id column (renamed to ingredient_id)

-- ============================================================================
-- FIX 1: log_recipe_full_snapshot function
-- ============================================================================
-- Problem: Function referenced ri.stock_item_id when building JSON snapshot
-- Error: "column ri.stock_item_id does not exist"

CREATE OR REPLACE FUNCTION stockly.log_recipe_full_snapshot()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_snapshot JSONB;
    v_ingredients JSONB;
BEGIN
    v_user_id := COALESCE(
        NEW.updated_by,
        NEW.created_by,
        auth.uid(),
        '00000000-0000-0000-0000-000000000000'::uuid
    );

    -- Build ingredients snapshot - FIXED: using ingredient_id instead of stock_item_id
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', ri.id,
            'ingredient_id', ri.ingredient_id,
            'sub_recipe_id', ri.sub_recipe_id,
            'quantity', ri.quantity,
            'unit_id', ri.unit_id,
            'unit_cost', ri.unit_cost,
            'line_cost', ri.line_cost
        )
    ), '[]'::jsonb) INTO v_ingredients
    FROM stockly.recipe_ingredients ri
    WHERE ri.recipe_id = NEW.id;

    -- Build full snapshot
    v_snapshot := jsonb_build_object(
        'recipe', row_to_json(NEW)::jsonb,
        'ingredients', v_ingredients,
        'captured_at', NOW()
    );

    -- Only log significant updates (not just timestamp changes)
    IF TG_OP = 'UPDATE' AND (
        NEW.name IS DISTINCT FROM OLD.name OR
        NEW.description IS DISTINCT FROM OLD.description OR
        NEW.is_active IS DISTINCT FROM OLD.is_active OR
        NEW.is_archived IS DISTINCT FROM OLD.is_archived OR
        NEW.sell_price IS DISTINCT FROM OLD.sell_price OR
        NEW.total_cost IS DISTINCT FROM OLD.total_cost
    ) THEN
        INSERT INTO stockly.recipe_audit_log (
            company_id,
            recipe_id,
            event_type,
            change_summary,
            changed_by,
            full_snapshot,
            data_version
        ) VALUES (
            NEW.company_id,
            NEW.id,
            'data_snapshot',
            'Recipe data changed (version ' || COALESCE(NEW.data_version, 1) || ')',
            v_user_id,
            v_snapshot,
            NEW.data_version
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIX 2: recipe_audit_log event_type constraint
-- ============================================================================
-- Problem: 'data_snapshot' was not in allowed event types
-- Error: "new row for relation recipe_audit_log violates check constraint"

ALTER TABLE stockly.recipe_audit_log
DROP CONSTRAINT IF EXISTS recipe_audit_log_event_type_check;

ALTER TABLE stockly.recipe_audit_log
ADD CONSTRAINT recipe_audit_log_event_type_check
CHECK (event_type = ANY (ARRAY[
  'created'::text,
  'ingredient_added'::text,
  'ingredient_removed'::text,
  'ingredient_quantity_changed'::text,
  'ingredient_supplier_changed'::text,
  'allergen_changed'::text,
  'shelf_life_changed'::text,
  'storage_changed'::text,
  'status_changed'::text,
  'version_created'::text,
  'name_changed'::text,
  'data_snapshot'::text
]));

-- ============================================================================
-- FIX 3: insert_recipe_ingredients function
-- ============================================================================
-- Problem: Used "RETURNING * INTO NEW" which returned table columns but view has
--          different structure (includes JOINed columns from ingredients_library, uom, etc.)
-- Error: "returned row structure does not match the structure of the triggering table"
--        "Returned type numeric(5,3) does not match expected type uuid in column 6"

CREATE OR REPLACE FUNCTION public.insert_recipe_ingredients()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO stockly.recipe_ingredients (
    id, recipe_id, ingredient_id, sub_recipe_id, quantity, unit_id,
    sort_order, line_cost, unit_cost, yield_factor, gross_quantity,
    preparation_notes, is_optional, company_id, created_at, updated_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()), NEW.recipe_id, NEW.ingredient_id,
    NEW.sub_recipe_id, NEW.quantity, NEW.unit_id, COALESCE(NEW.sort_order, 0),
    NEW.line_cost, NEW.unit_cost, NEW.yield_factor, NEW.gross_quantity,
    NEW.preparation_notes, COALESCE(NEW.is_optional, false), NEW.company_id,
    COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW())
  ) RETURNING id INTO v_id;

  -- Set the ID on NEW so it's returned to the client
  NEW.id := v_id;
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- FIX 4: calculate_item_usage function (stockly schema)
-- ============================================================================
-- Problem: Referenced ri.stock_item_id in recipe JOIN, but recipe_ingredients
--          now uses ingredient_id and references ingredients_library, not stock_items
-- Note: This function is for Stockly stock tracking. Since recipes now use a
--       separate ingredients_library system, the recipe sales portion is disabled.
--       Wastage and transfers still work correctly as they use stock_items directly.

DROP FUNCTION IF EXISTS stockly.calculate_item_usage(uuid, integer);

CREATE FUNCTION stockly.calculate_item_usage(
    p_stock_item_id UUID,
    p_days INTEGER
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $function$
DECLARE
    v_total_usage NUMERIC := 0;
    v_waste_usage NUMERIC := 0;
    v_transfer_usage NUMERIC := 0;
BEGIN
    -- NOTE: Sales via recipes no longer tracked here
    -- Recipes now use ingredients_library (ingredient_id), not stock_items
    -- Would need ingredients_library.linked_stock_item_id to reconnect these

    -- Usage from wastage
    SELECT COALESCE(SUM(wll.quantity), 0)
    INTO v_waste_usage
    FROM stockly.waste_log_lines wll
    JOIN stockly.waste_logs wl ON wl.id = wll.waste_log_id
    WHERE wll.stock_item_id = p_stock_item_id
    AND wl.waste_date >= CURRENT_DATE - p_days;

    -- Usage from transfers
    SELECT COALESCE(SUM(sti.quantity), 0)
    INTO v_transfer_usage
    FROM stockly.stock_transfer_items sti
    JOIN stockly.stock_transfers st ON st.id = sti.transfer_id
    WHERE sti.stock_item_id = p_stock_item_id
    AND st.transfer_date >= CURRENT_DATE - p_days
    AND st.status = 'completed';

    v_total_usage := v_waste_usage + v_transfer_usage;

    RETURN ROUND(v_total_usage / NULLIF(p_days, 0), 3);
END;
$function$;

-- ============================================================================
-- FIX 5: recipe_modifiers table and view
-- ============================================================================
-- Problem: Still had stock_item_id column while recipe_ingredients uses ingredient_id
-- Note: Table was empty so safe to rename without data migration

-- Drop the view first (required before renaming table column)
DROP VIEW IF EXISTS public.recipe_modifiers;

-- Drop the old constraint
ALTER TABLE stockly.recipe_modifiers
DROP CONSTRAINT IF EXISTS modifier_source;

-- Rename the column in the underlying table (only if stock_item_id exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
      AND table_name = 'recipe_modifiers'
      AND column_name = 'stock_item_id'
  ) THEN
    ALTER TABLE stockly.recipe_modifiers
    RENAME COLUMN stock_item_id TO ingredient_id;
  END IF;
END $$;

-- Add the updated constraint (only if ingredient_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
      AND table_name = 'recipe_modifiers'
      AND column_name = 'ingredient_id'
  ) THEN
    -- Drop constraint if exists first
    ALTER TABLE stockly.recipe_modifiers
    DROP CONSTRAINT IF EXISTS modifier_source;

    ALTER TABLE stockly.recipe_modifiers
    ADD CONSTRAINT modifier_source CHECK (
      (modifier_recipe_id IS NOT NULL AND ingredient_id IS NULL) OR
      (modifier_recipe_id IS NULL AND ingredient_id IS NOT NULL)
    );
  END IF;
END $$;

-- Recreate the view
CREATE VIEW public.recipe_modifiers AS
SELECT
  id,
  recipe_id,
  name,
  modifier_recipe_id,
  ingredient_id,
  quantity,
  unit,
  additional_cost,
  price_adjustment,
  modifier_group,
  is_default,
  max_quantity,
  display_order,
  is_active,
  created_at
FROM stockly.recipe_modifiers;

-- ============================================================================
-- VERIFICATION QUERIES (run these to confirm fixes)
-- ============================================================================

-- Check no recipe functions still reference stock_item_id incorrectly:
-- SELECT proname FROM pg_proc
-- WHERE prosrc ILIKE '%ri.stock_item_id%'
--   AND prosrc NOT ILIKE '%-- NOT ri.stock_item_id%';

-- Check recipe_ingredients view has ingredient_id:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'recipe_ingredients' AND table_schema = 'public'
-- AND column_name IN ('ingredient_id', 'stock_item_id');

-- Check recipe_modifiers has ingredient_id:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'recipe_modifiers' AND table_schema = 'stockly'
-- AND column_name IN ('ingredient_id', 'stock_item_id');

-- ============================================================================
-- NOTES ON ARCHITECTURE
-- ============================================================================
--
-- The system now has two separate item tracking systems:
--
-- 1. STOCKLY SYSTEM (for inventory management):
--    - stock_items table
--    - Uses stock_item_id throughout
--    - For: stock_levels, stock_movements, waste_log_lines, deliveries, orders
--
-- 2. RECIPE SYSTEM (for recipe costing):
--    - ingredients_library table
--    - Uses ingredient_id throughout
--    - For: recipe_ingredients, recipe_modifiers
--
-- Bridge between systems:
--    - stock_count_items has both ingredient_id (view) and stock_item_id (table)
--    - get_or_create_stock_item() function converts between them
--    - This allows counting ingredients that become stock items
--
-- Future consideration:
--    - May want to add ingredients_library.linked_stock_item_id to reconnect
--      recipe ingredient usage tracking with Stockly inventory
