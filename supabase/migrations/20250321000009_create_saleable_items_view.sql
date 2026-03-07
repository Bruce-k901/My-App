-- ============================================================================
-- Migration: 20250321000009_create_saleable_items_view.sql
-- Description: Creates view combining all saleable items (ingredients + recipe outputs)
-- ============================================================================

-- Only create view if required tables exist
DO $$
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ingredients_library'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'recipe_outputs'
  ) THEN
    RAISE NOTICE 'ingredients_library or recipe_outputs tables do not exist - skipping saleable_items view creation';
    RETURN;
  END IF;

  -- Drop view if it exists
  DROP VIEW IF EXISTS saleable_items CASCADE;

  -- Create view
  EXECUTE $sql_view1$
    CREATE VIEW saleable_items AS
      -- Ingredients that are marked as saleable
      SELECT 
        id,
        company_id,
        ingredient_name as name,
        COALESCE(notes, '') as description,
        category,
        'ingredient'::TEXT as source_type,
        NULL::UUID as recipe_id,
        unit as base_unit,
        current_stock,
        par_level,
        sale_price,
        unit_cost as cost,
        stock_value,
        sku,
        allergens,
        is_saleable,
        created_at,
        updated_at
      FROM ingredients_library
      WHERE is_saleable = true
      
      UNION ALL
      
      -- Recipe outputs (products)
      SELECT 
        id,
        company_id,
        name,
        description,
        category,
        source_type,
        recipe_id,
        base_unit,
        current_stock,
        par_level,
        sale_price,
        COALESCE(calculated_cost, manual_cost) as cost,
        stock_value,
        sku,
        allergens,
        is_saleable,
        created_at,
        updated_at
      FROM recipe_outputs
      WHERE is_saleable = true;
  $sql_view1$;

  -- Add comment
  COMMENT ON VIEW saleable_items IS 'Combined view of all items that can be sold (ingredients marked as saleable + recipe outputs)';

  -- Grant permissions
  GRANT SELECT ON saleable_items TO authenticated;

END $$;

