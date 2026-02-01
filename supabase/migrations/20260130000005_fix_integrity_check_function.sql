-- ============================================================================
-- Fix: check_recipe_data_integrity function
-- Date: 2026-01-30
-- Description: Fixes GROUP BY TRUE syntax error in integrity check function
-- ============================================================================

-- Replace the function with fixed version using CTE pattern
CREATE OR REPLACE FUNCTION check_recipe_data_integrity(p_company_id UUID DEFAULT NULL)
RETURNS TABLE (
    check_name TEXT,
    severity TEXT,
    issue_count INTEGER,
    details JSONB
) AS $$
BEGIN
    -- Check 1: Active recipes with no ingredients (stockly)
    RETURN QUERY
    WITH recipe_issues AS (
        SELECT r.id, r.name
        FROM stockly.recipes r
        LEFT JOIN stockly.recipe_ingredients ri ON ri.recipe_id = r.id
        WHERE r.is_active = true
        AND r.is_archived = false
        AND ri.id IS NULL
        AND (p_company_id IS NULL OR r.company_id = p_company_id)
    )
    SELECT
        'active_recipes_no_ingredients'::TEXT,
        'warning'::TEXT,
        COUNT(*)::INTEGER,
        COALESCE(jsonb_agg(jsonb_build_object(
            'recipe_id', x.id,
            'name', x.name
        )), '[]'::jsonb)
    FROM recipe_issues x;

    -- Check 2: Recipes with NULL method_steps (public)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipes') THEN
        RETURN QUERY
        WITH null_method AS (
            SELECT r.id, r.name
            FROM public.recipes r
            WHERE r.is_active = true
            AND r.method_steps IS NULL
            AND (p_company_id IS NULL OR r.company_id = p_company_id)
        )
        SELECT
            'null_method_steps'::TEXT,
            'error'::TEXT,
            COUNT(*)::INTEGER,
            COALESCE(jsonb_agg(jsonb_build_object(
                'recipe_id', x.id,
                'name', x.name
            )), '[]'::jsonb)
        FROM null_method x;
    END IF;

    -- Check 3: Recipes with empty method_steps array (public)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipes') THEN
        RETURN QUERY
        WITH empty_method AS (
            SELECT r.id, r.name, r.recipe_type
            FROM public.recipes r
            WHERE r.is_active = true
            AND r.method_steps = '[]'::jsonb
            AND (p_company_id IS NULL OR r.company_id = p_company_id)
        )
        SELECT
            'empty_method_steps'::TEXT,
            'warning'::TEXT,
            COUNT(*)::INTEGER,
            COALESCE(jsonb_agg(jsonb_build_object(
                'recipe_id', x.id,
                'name', x.name,
                'recipe_type', x.recipe_type
            )), '[]'::jsonb)
        FROM empty_method x;
    END IF;

    -- Check 4: Ingredients with zero or negative quantity
    RETURN QUERY
    WITH invalid_qty AS (
        SELECT ri.id, ri.recipe_id, ri.quantity
        FROM stockly.recipe_ingredients ri
        JOIN stockly.recipes r ON r.id = ri.recipe_id
        WHERE ri.quantity <= 0
        AND (p_company_id IS NULL OR r.company_id = p_company_id)
    )
    SELECT
        'invalid_ingredient_quantity'::TEXT,
        'error'::TEXT,
        COUNT(*)::INTEGER,
        COALESCE(jsonb_agg(jsonb_build_object(
            'ingredient_id', x.id,
            'recipe_id', x.recipe_id,
            'quantity', x.quantity
        )), '[]'::jsonb)
    FROM invalid_qty x;

    -- Check 5: Ingredients with NULL stock_item_id AND NULL sub_recipe_id
    RETURN QUERY
    WITH orphan_ing AS (
        SELECT ri.id, ri.recipe_id
        FROM stockly.recipe_ingredients ri
        JOIN stockly.recipes r ON r.id = ri.recipe_id
        WHERE ri.stock_item_id IS NULL AND ri.sub_recipe_id IS NULL
        AND (p_company_id IS NULL OR r.company_id = p_company_id)
    )
    SELECT
        'orphan_ingredients'::TEXT,
        'error'::TEXT,
        COUNT(*)::INTEGER,
        COALESCE(jsonb_agg(jsonb_build_object(
            'ingredient_id', x.id,
            'recipe_id', x.recipe_id
        )), '[]'::jsonb)
    FROM orphan_ing x;

    -- Check 6: Recipes updated but not re-costed in 24 hours
    RETURN QUERY
    WITH stale_cost AS (
        SELECT r.id, r.name, r.updated_at, r.last_costed_at
        FROM stockly.recipes r
        WHERE r.is_active = true
        AND r.updated_at > COALESCE(r.last_costed_at, '1970-01-01'::timestamptz)
        AND r.updated_at < NOW() - INTERVAL '24 hours'
        AND (p_company_id IS NULL OR r.company_id = p_company_id)
    )
    SELECT
        'stale_costing'::TEXT,
        'info'::TEXT,
        COUNT(*)::INTEGER,
        COALESCE(jsonb_agg(jsonb_build_object(
            'recipe_id', x.id,
            'name', x.name,
            'updated_at', x.updated_at,
            'last_costed_at', x.last_costed_at
        )), '[]'::jsonb)
    FROM stale_cost x;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify fix
DO $$
BEGIN
    RAISE NOTICE 'Fixed check_recipe_data_integrity function (removed GROUP BY TRUE)';
END $$;
