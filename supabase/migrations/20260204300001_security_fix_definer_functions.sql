-- ============================================================================
-- Migration: Security Fix - Add Authorization Checks to SECURITY DEFINER Functions
-- Severity: HIGH
-- Description: Adds company_id verification to all SECURITY DEFINER functions
--              to prevent cross-company data manipulation
-- ============================================================================

BEGIN;

-- ============================================================================
-- HIGH FIX 1: Fix calculate_recipe_cost - verify company access before updates
-- ============================================================================

CREATE OR REPLACE FUNCTION stockly.calculate_recipe_cost(p_recipe_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_recipe RECORD;
    v_company_id UUID;
    v_total_cost NUMERIC(12,4) := 0;
    v_ingredient RECORD;
    v_sub_cost NUMERIC(12,4);
    v_weighted_cost NUMERIC(12,4);
    v_variant RECORD;
    v_result JSONB;
    v_cost_per_portion NUMERIC(12,4);
    v_gp_percent NUMERIC(5,2);
BEGIN
    -- Get recipe and its company_id
    SELECT * INTO v_recipe FROM stockly.recipes WHERE id = p_recipe_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Recipe not found');
    END IF;

    -- SECURITY CHECK: Verify user has access to this company
    IF NOT stockly.stockly_company_access(v_recipe.company_id) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to access recipes for this company';
    END IF;

    -- For COMPOSITE recipes, calculate weighted average
    IF v_recipe.recipe_type = 'composite' AND v_recipe.use_weighted_average THEN
        v_weighted_cost := 0;

        FOR v_variant IN
            SELECT rv.*, r.cost_per_portion as variant_cost
            FROM stockly.recipe_variants rv
            JOIN stockly.recipes r ON r.id = rv.variant_recipe_id
            WHERE rv.parent_recipe_id = p_recipe_id
            AND rv.is_active = true
            AND r.is_active = true
        LOOP
            v_weighted_cost := v_weighted_cost +
                (COALESCE(v_variant.override_cost, v_variant.variant_cost, 0) * v_variant.sales_weight / 100);
        END LOOP;

        v_total_cost := v_weighted_cost;
    ELSE
        -- Standard recipe - sum ingredients
        FOR v_ingredient IN
            SELECT ri.*,
                   si.name as item_name,
                   COALESCE(
                       (SELECT unit_price FROM stockly.product_variants
                        WHERE stock_item_id = si.id AND is_preferred = true LIMIT 1),
                       si.current_cost,
                       0
                   ) as stock_price
            FROM stockly.recipe_ingredients ri
            LEFT JOIN stockly.stock_items si ON si.id = ri.stock_item_id
            WHERE ri.recipe_id = p_recipe_id
        LOOP
            IF v_ingredient.sub_recipe_id IS NOT NULL THEN
                -- Get sub-recipe cost per portion
                SELECT cost_per_portion INTO v_sub_cost
                FROM stockly.recipes
                WHERE id = v_ingredient.sub_recipe_id;

                v_ingredient.unit_cost := COALESCE(v_sub_cost, 0);
            ELSE
                v_ingredient.unit_cost := COALESCE(v_ingredient.stock_price, 0);
            END IF;

            -- Calculate gross quantity (accounting for yield/waste)
            v_ingredient.gross_quantity := v_ingredient.quantity / NULLIF(v_ingredient.yield_factor, 0);
            v_ingredient.line_cost := v_ingredient.gross_quantity * v_ingredient.unit_cost;

            -- Update the ingredient record (without triggering recalc to avoid loops)
            UPDATE stockly.recipe_ingredients
            SET unit_cost = v_ingredient.unit_cost,
                gross_quantity = v_ingredient.gross_quantity,
                line_cost = v_ingredient.line_cost,
                updated_at = NOW()
            WHERE id = v_ingredient.id;

            v_total_cost := v_total_cost + COALESCE(v_ingredient.line_cost, 0);
        END LOOP;
    END IF;

    -- Calculate cost per portion
    v_cost_per_portion := v_total_cost / NULLIF(v_recipe.yield_quantity, 0);

    -- Calculate GP percent
    IF v_recipe.sell_price > 0 THEN
        v_gp_percent := ROUND(((v_recipe.sell_price - v_cost_per_portion) / v_recipe.sell_price * 100)::NUMERIC, 1);
    ELSE
        v_gp_percent := NULL;
    END IF;

    -- Update recipe
    UPDATE stockly.recipes
    SET total_cost = v_total_cost,
        cost_per_portion = v_cost_per_portion,
        actual_gp_percent = v_gp_percent,
        last_costed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_recipe_id;

    -- Update portion sizes
    UPDATE stockly.recipe_portions
    SET portion_cost = v_cost_per_portion * quantity_multiplier,
        gp_percent = CASE
            WHEN sell_price > 0 THEN
                ROUND(((sell_price - (v_cost_per_portion * quantity_multiplier)) / sell_price * 100)::NUMERIC, 1)
            ELSE NULL
        END
    WHERE recipe_id = p_recipe_id;

    -- Build result
    v_result := jsonb_build_object(
        'recipe_id', p_recipe_id,
        'total_cost', v_total_cost,
        'cost_per_portion', v_cost_per_portion,
        'yield_quantity', v_recipe.yield_quantity,
        'sell_price', v_recipe.sell_price,
        'gp_percent', v_gp_percent
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HIGH FIX 2: Fix recalculate_all_recipes - verify company access
-- ============================================================================

CREATE OR REPLACE FUNCTION stockly.recalculate_all_recipes(p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_recipe_id UUID;
BEGIN
    -- SECURITY CHECK: Verify user has access to this company
    IF NOT stockly.stockly_company_access(p_company_id) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to recalculate recipes for this company';
    END IF;

    -- First recalculate PREP recipes (they're used as ingredients)
    FOR v_recipe_id IN
        SELECT id FROM stockly.recipes
        WHERE company_id = p_company_id
        AND recipe_type = 'prep'
        AND is_active = true
        ORDER BY created_at
    LOOP
        PERFORM stockly.calculate_recipe_cost(v_recipe_id);
        v_count := v_count + 1;
    END LOOP;

    -- Then recalculate MODIFIER recipes
    FOR v_recipe_id IN
        SELECT id FROM stockly.recipes
        WHERE company_id = p_company_id
        AND recipe_type = 'modifier'
        AND is_active = true
        ORDER BY created_at
    LOOP
        PERFORM stockly.calculate_recipe_cost(v_recipe_id);
        v_count := v_count + 1;
    END LOOP;

    -- Then recalculate DISH recipes
    FOR v_recipe_id IN
        SELECT id FROM stockly.recipes
        WHERE company_id = p_company_id
        AND recipe_type = 'dish'
        AND is_active = true
        ORDER BY created_at
    LOOP
        PERFORM stockly.calculate_recipe_cost(v_recipe_id);
        v_count := v_count + 1;
    END LOOP;

    -- Finally COMPOSITE recipes (they reference other recipes)
    FOR v_recipe_id IN
        SELECT id FROM stockly.recipes
        WHERE company_id = p_company_id
        AND recipe_type = 'composite'
        AND is_active = true
        ORDER BY created_at
    LOOP
        PERFORM stockly.calculate_recipe_cost(v_recipe_id);
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HIGH FIX 3: Fix get_recipe_cost_breakdown - verify company access
-- ============================================================================

CREATE OR REPLACE FUNCTION stockly.get_recipe_cost_breakdown(p_recipe_id UUID)
RETURNS TABLE (
    ingredient_id UUID,
    ingredient_name TEXT,
    ingredient_type TEXT,
    quantity NUMERIC,
    unit TEXT,
    yield_factor NUMERIC,
    gross_quantity NUMERIC,
    unit_cost NUMERIC,
    line_cost NUMERIC,
    cost_percentage NUMERIC
) AS $$
DECLARE
    v_recipe_company_id UUID;
    v_total_cost NUMERIC(12,4);
BEGIN
    -- Get recipe's company_id and total_cost
    SELECT r.company_id, r.total_cost INTO v_recipe_company_id, v_total_cost
    FROM stockly.recipes r WHERE r.id = p_recipe_id;

    IF v_recipe_company_id IS NULL THEN
        RAISE EXCEPTION 'Recipe not found';
    END IF;

    -- SECURITY CHECK: Verify user has access to this company
    IF NOT stockly.stockly_company_access(v_recipe_company_id) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to access this recipe';
    END IF;

    RETURN QUERY
    SELECT
        ri.id as ingredient_id,
        COALESCE(si.name, sr.name, 'Unknown') as ingredient_name,
        CASE
            WHEN ri.sub_recipe_id IS NOT NULL THEN 'sub_recipe'
            ELSE 'stock_item'
        END as ingredient_type,
        ri.quantity,
        ri.unit,
        ri.yield_factor,
        ri.gross_quantity,
        ri.unit_cost,
        ri.line_cost,
        CASE WHEN v_total_cost > 0 THEN
            ROUND((ri.line_cost / v_total_cost * 100)::NUMERIC, 1)
        ELSE 0 END as cost_percentage
    FROM stockly.recipe_ingredients ri
    LEFT JOIN stockly.stock_items si ON si.id = ri.stock_item_id
    LEFT JOIN stockly.recipes sr ON sr.id = ri.sub_recipe_id
    WHERE ri.recipe_id = p_recipe_id
    ORDER BY ri.line_cost DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HIGH FIX 4: Fix stock_levels trigger functions - verify company access
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_stock_levels()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_item_company_id UUID;
BEGIN
    -- Get company_id from the stock_item being referenced
    SELECT company_id INTO v_stock_item_company_id
    FROM stockly.stock_items WHERE id = NEW.stock_item_id;

    -- SECURITY CHECK: Verify user has access to this company
    IF v_stock_item_company_id IS NOT NULL AND NOT stockly.stockly_company_access(v_stock_item_company_id) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to modify stock levels for this company';
    END IF;

    INSERT INTO stockly.stock_levels (
        id, stock_item_id, site_id, storage_area_id,
        quantity, avg_cost, value, total_value,
        last_movement_at, last_count_at, updated_at
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()), NEW.stock_item_id, NEW.site_id, NEW.storage_area_id,
        NEW.quantity, NEW.avg_cost, NEW.value, NEW.total_value,
        NEW.last_movement_at, NEW.last_count_at, COALESCE(NEW.updated_at, NOW())
    )
    ON CONFLICT (stock_item_id, site_id, COALESCE(storage_area_id, '00000000-0000-0000-0000-000000000000'::uuid))
    DO UPDATE SET
        quantity = EXCLUDED.quantity,
        avg_cost = COALESCE(EXCLUDED.avg_cost, stockly.stock_levels.avg_cost),
        value = EXCLUDED.value,
        total_value = COALESCE(EXCLUDED.total_value, stockly.stock_levels.total_value),
        last_movement_at = EXCLUDED.last_movement_at,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_stock_levels()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_item_company_id UUID;
BEGIN
    -- Get company_id from the existing stock level record
    SELECT si.company_id INTO v_stock_item_company_id
    FROM stockly.stock_levels sl
    JOIN stockly.stock_items si ON si.id = sl.stock_item_id
    WHERE sl.id = OLD.id;

    -- SECURITY CHECK: Verify user has access to this company
    IF v_stock_item_company_id IS NOT NULL AND NOT stockly.stockly_company_access(v_stock_item_company_id) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to modify stock levels for this company';
    END IF;

    UPDATE stockly.stock_levels
    SET
        quantity = COALESCE(NEW.quantity, OLD.quantity),
        avg_cost = COALESCE(NEW.avg_cost, OLD.avg_cost),
        value = COALESCE(NEW.value, OLD.value),
        total_value = COALESCE(NEW.total_value, OLD.total_value),
        last_movement_at = COALESCE(NEW.last_movement_at, OLD.last_movement_at),
        updated_at = NOW()
    WHERE id = OLD.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

SELECT 'Security fix applied: SECURITY DEFINER functions now include company access checks' as result;
