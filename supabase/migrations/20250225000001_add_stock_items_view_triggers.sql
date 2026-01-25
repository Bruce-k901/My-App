-- ============================================================================
-- Migration: 20250225000001_add_stock_items_view_triggers.sql
-- Description: Add INSTEAD OF INSERT/UPDATE triggers for stock_items view
-- This allows inserts/updates to work through the public.stock_items view
-- ============================================================================

-- ============================================================================
-- CHECK TABLE STRUCTURE AND RECREATE VIEW
-- ============================================================================
-- First, verify stockly.stock_items exists
DO $$
BEGIN
  -- Check if required table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_items'
  ) THEN
    RAISE NOTICE 'stockly.stock_items table does not exist - skipping stock_items view triggers migration';
    RETURN;
  END IF;

  -- Drop and recreate the view - use SELECT * to automatically include all columns
  -- This ensures all columns from the underlying table are included
  DROP VIEW IF EXISTS public.stock_items CASCADE;

  EXECUTE $sql_view1$
    CREATE VIEW public.stock_items AS
    SELECT * FROM stockly.stock_items;
  $sql_view1$;

  -- Grant permissions
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;

  -- Set security invoker (allows RLS to work properly)
  ALTER VIEW public.stock_items SET (security_invoker = true);

  -- ============================================================================
  -- INSERT TRIGGER FOR STOCK ITEMS VIEW
  -- ============================================================================

  EXECUTE $sql_func1$
    CREATE OR REPLACE FUNCTION public.insert_stock_items()
    RETURNS TRIGGER AS $func$
    BEGIN
      INSERT INTO stockly.stock_items (
        id,
        company_id,
        canonical_item_id,
        name,
        description,
        sku,
        barcode,
        category_id,
        stock_unit,
        purchase_unit,
        recipe_unit,
        purchase_to_stock_ratio,
        recipe_to_stock_ratio,
        last_cost,
        average_cost,
        default_vat_rate,
        par_level,
        reorder_point,
        reorder_quantity,
        default_storage_area_id,
        is_active,
        created_at,
        updated_at,
        library_item_id,
        library_type,
        shelf_life_days,
        is_perishable,
        avg_daily_usage,
        days_until_reorder,
        usage_calculated_at,
        safety_stock_days,
        allergens,
        pack_size,
        pack_cost
      ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.company_id,
        NEW.canonical_item_id,
        NEW.name,
        NEW.description,
        NEW.sku,
        NEW.barcode,
        NEW.category_id,
        COALESCE(NEW.stock_unit, 'ea'),
        NEW.purchase_unit,
        NEW.recipe_unit,
        NEW.purchase_to_stock_ratio,
        NEW.recipe_to_stock_ratio,
        NEW.last_cost,
        NEW.average_cost,
        COALESCE(NEW.default_vat_rate, 0),
        NEW.par_level,
        NEW.reorder_point,
        NEW.reorder_quantity,
        NEW.default_storage_area_id,
        COALESCE(NEW.is_active, TRUE),
        COALESCE(NEW.created_at, NOW()),
        COALESCE(NEW.updated_at, NOW()),
        NEW.library_item_id,
        NEW.library_type,
        NEW.shelf_life_days,
        COALESCE(NEW.is_perishable, FALSE),
        COALESCE(NEW.avg_daily_usage, 0),
        NEW.days_until_reorder,
        NEW.usage_calculated_at,
        COALESCE(NEW.safety_stock_days, 2),
        NEW.allergens,
        NEW.pack_size,
        NEW.pack_cost
      );
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql_func1$;

  -- Drop existing trigger if it exists
  DROP TRIGGER IF EXISTS stock_items_insert_trigger ON public.stock_items;

  -- Create INSTEAD OF INSERT trigger
  CREATE TRIGGER stock_items_insert_trigger
    INSTEAD OF INSERT ON public.stock_items
    FOR EACH ROW EXECUTE FUNCTION public.insert_stock_items();

  -- ============================================================================
  -- UPDATE TRIGGER FOR STOCK ITEMS VIEW
  -- ============================================================================

  EXECUTE $sql_func2$
    CREATE OR REPLACE FUNCTION public.update_stock_items()
    RETURNS TRIGGER AS $func$
    BEGIN
      UPDATE stockly.stock_items SET 
        company_id = NEW.company_id,
        canonical_item_id = NEW.canonical_item_id,
        name = NEW.name,
        description = NEW.description,
        sku = NEW.sku,
        barcode = NEW.barcode,
        category_id = NEW.category_id,
        stock_unit = NEW.stock_unit,
        purchase_unit = NEW.purchase_unit,
        recipe_unit = NEW.recipe_unit,
        purchase_to_stock_ratio = NEW.purchase_to_stock_ratio,
        recipe_to_stock_ratio = NEW.recipe_to_stock_ratio,
        last_cost = NEW.last_cost,
        average_cost = NEW.average_cost,
        default_vat_rate = NEW.default_vat_rate,
        par_level = NEW.par_level,
        reorder_point = NEW.reorder_point,
        reorder_quantity = NEW.reorder_quantity,
        default_storage_area_id = NEW.default_storage_area_id,
        is_active = NEW.is_active,
        library_item_id = NEW.library_item_id,
        library_type = NEW.library_type,
        shelf_life_days = NEW.shelf_life_days,
        is_perishable = NEW.is_perishable,
        avg_daily_usage = NEW.avg_daily_usage,
        days_until_reorder = NEW.days_until_reorder,
        usage_calculated_at = NEW.usage_calculated_at,
        safety_stock_days = NEW.safety_stock_days,
        allergens = NEW.allergens,
        pack_size = NEW.pack_size,
        pack_cost = NEW.pack_cost,
        updated_at = COALESCE(NEW.updated_at, NOW())
      WHERE id = NEW.id;
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql_func2$;

  -- Drop existing trigger if it exists
  DROP TRIGGER IF EXISTS stock_items_update_trigger ON public.stock_items;

  -- Create INSTEAD OF UPDATE trigger
  CREATE TRIGGER stock_items_update_trigger
    INSTEAD OF UPDATE ON public.stock_items
    FOR EACH ROW EXECUTE FUNCTION public.update_stock_items();

  -- ============================================================================
  -- REFRESH POSTGREST SCHEMA CACHE
  -- ============================================================================
  -- Notify PostgREST to reload schema cache so it recognizes the triggers and columns
  NOTIFY pgrst, 'reload schema';

  -- Also use alternative notification method
  PERFORM pg_notify('pgrst', 'reload schema');

END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify triggers exist:
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'public' 
--   AND event_object_table = 'stock_items'
--   AND action_timing = 'INSTEAD OF';
