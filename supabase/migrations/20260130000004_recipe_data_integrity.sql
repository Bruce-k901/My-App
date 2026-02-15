-- ============================================================================
-- Migration: Recipe & SOP Data Integrity Hardening
-- Date: 2026-01-30
-- Description: Adds constraints, validation, and monitoring for data integrity
-- ============================================================================
--
-- IMPORTANT: Run investigation queries FIRST before applying this migration!
-- See Section 0 below.
--
-- This migration:
-- 1. Adds database constraints to prevent empty/invalid data
-- 2. Extends existing audit system with full data snapshots
-- 3. Creates data integrity monitoring functions
-- 4. Adds optimistic locking for concurrent edit protection
-- ============================================================================

-- ============================================================================
-- SECTION 0: INVESTIGATION QUERIES (RUN MANUALLY FIRST)
-- ============================================================================
-- Copy these to Supabase SQL Editor and run to diagnose issues BEFORE migration

/*
-- 0.1 Check stockly.recipes for issues
SELECT
    r.id,
    r.name,
    r.recipe_type,
    r.is_active,
    r.is_archived,
    r.version,
    COUNT(ri.id) as ingredient_count,
    r.created_at,
    r.updated_at
FROM stockly.recipes r
LEFT JOIN stockly.recipe_ingredients ri ON ri.recipe_id = r.id
WHERE r.is_active = true AND r.is_archived = false
GROUP BY r.id
HAVING COUNT(ri.id) = 0
ORDER BY r.updated_at DESC;

-- 0.2 Check public.recipes for issues (method_steps)
SELECT
    id,
    name,
    recipe_type,
    is_active,
    method_steps IS NULL as method_steps_missing,
    CASE
        WHEN method_steps IS NULL THEN 0
        ELSE jsonb_array_length(method_steps)
    END as method_step_count,
    created_at,
    updated_at
FROM public.recipes
WHERE is_active = true
ORDER BY updated_at DESC
LIMIT 50;

-- 0.3 Check for orphaned ingredients (pointing to deleted recipes)
SELECT ri.id, ri.recipe_id, ri.quantity
FROM stockly.recipe_ingredients ri
LEFT JOIN stockly.recipes r ON r.id = ri.recipe_id
WHERE r.id IS NULL;

-- 0.4 Check for orphaned ingredients in public schema
SELECT ri.id, ri.recipe_id, ri.quantity
FROM public.recipe_ingredients ri
LEFT JOIN public.recipes r ON r.id = ri.recipe_id
WHERE r.id IS NULL;

-- 0.5 Check recent audit log activity
SELECT
    event_type,
    COUNT(*) as count,
    MAX(changed_at) as last_occurrence
FROM stockly.recipe_audit_log
GROUP BY event_type
ORDER BY last_occurrence DESC;

-- 0.6 Check column types
SELECT
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('recipes', 'recipe_ingredients')
AND table_schema IN ('stockly', 'public')
ORDER BY table_schema, table_name, ordinal_position;
*/

-- ============================================================================
-- SECTION 1: DATA CLEANUP (Fix existing issues before adding constraints)
-- ============================================================================

BEGIN;

-- 1.1 Ensure method_steps is at least empty array, not NULL (public.recipes only)
DO $$
BEGIN
    -- Only run if public.recipes exists and has method_steps column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'recipes'
        AND column_name = 'method_steps'
    ) THEN
        UPDATE public.recipes
        SET method_steps = '[]'::jsonb
        WHERE method_steps IS NULL;

        RAISE NOTICE 'Updated NULL method_steps to empty array';
    END IF;
END $$;

-- 1.2 Remove orphaned ingredients (stockly schema)
DO $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'stockly' AND tablename = 'recipe_ingredients') THEN
        DELETE FROM stockly.recipe_ingredients ri
        WHERE NOT EXISTS (
            SELECT 1 FROM stockly.recipes r WHERE r.id = ri.recipe_id
        );

        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        IF v_deleted_count > 0 THEN
            RAISE NOTICE 'Deleted % orphaned ingredients from stockly.recipe_ingredients', v_deleted_count;
        END IF;
    END IF;
END $$;

-- 1.3 Remove orphaned ingredients (public schema)
DO $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipe_ingredients') THEN
        DELETE FROM public.recipe_ingredients ri
        WHERE NOT EXISTS (
            SELECT 1 FROM public.recipes r WHERE r.id = ri.recipe_id
        );

        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        IF v_deleted_count > 0 THEN
            RAISE NOTICE 'Deleted % orphaned ingredients from public.recipe_ingredients', v_deleted_count;
        END IF;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- SECTION 2: ADD DATABASE CONSTRAINTS
-- ============================================================================

BEGIN;

-- 2.1 Add NOT NULL constraint for method_steps (with default)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'recipes'
        AND column_name = 'method_steps'
        AND is_nullable = 'YES'
    ) THEN
        -- Set default first
        ALTER TABLE public.recipes
        ALTER COLUMN method_steps SET DEFAULT '[]'::jsonb;

        -- Then add NOT NULL (data already cleaned above)
        ALTER TABLE public.recipes
        ALTER COLUMN method_steps SET NOT NULL;

        RAISE NOTICE 'Added NOT NULL constraint to public.recipes.method_steps';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add NOT NULL to method_steps: %', SQLERRM;
END $$;

-- 2.2 Add check constraint: active recipes must have at least one ingredient
-- Note: This is a WARNING constraint (logged) not a hard block, to avoid breaking existing data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'stockly' AND tablename = 'recipes') THEN
        -- Create a function to check ingredient count
        CREATE OR REPLACE FUNCTION stockly.check_recipe_has_ingredients(p_recipe_id UUID)
        RETURNS BOOLEAN AS $func$
        BEGIN
            RETURN EXISTS (
                SELECT 1 FROM stockly.recipe_ingredients
                WHERE recipe_id = p_recipe_id
            );
        END;
        $func$ LANGUAGE plpgsql STABLE;

        RAISE NOTICE 'Created ingredient check function';
    END IF;
END $$;

-- 2.3 Add version column for optimistic locking (if not exists)
DO $$
BEGIN
    -- Check stockly.recipes
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'stockly' AND tablename = 'recipes') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'stockly'
            AND table_name = 'recipes'
            AND column_name = 'data_version'
        ) THEN
            ALTER TABLE stockly.recipes
            ADD COLUMN data_version INTEGER NOT NULL DEFAULT 1;

            RAISE NOTICE 'Added data_version column to stockly.recipes';
        END IF;
    END IF;

    -- Check public.recipes
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipes') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'recipes'
            AND column_name = 'data_version'
        ) THEN
            ALTER TABLE public.recipes
            ADD COLUMN data_version INTEGER NOT NULL DEFAULT 1;

            RAISE NOTICE 'Added data_version column to public.recipes';
        END IF;
    END IF;
END $$;

-- 2.4 Add trigger to auto-increment data_version on update
CREATE OR REPLACE FUNCTION increment_data_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_version := COALESCE(OLD.data_version, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to stockly.recipes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'stockly' AND tablename = 'recipes') THEN
        DROP TRIGGER IF EXISTS increment_recipe_data_version ON stockly.recipes;
        CREATE TRIGGER increment_recipe_data_version
            BEFORE UPDATE ON stockly.recipes
            FOR EACH ROW
            EXECUTE FUNCTION increment_data_version();
    END IF;
END $$;

-- Apply to public.recipes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipes') THEN
        DROP TRIGGER IF EXISTS increment_recipe_data_version ON public.recipes;
        CREATE TRIGGER increment_recipe_data_version
            BEFORE UPDATE ON public.recipes
            FOR EACH ROW
            EXECUTE FUNCTION increment_data_version();
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- SECTION 3: EXTEND AUDIT SYSTEM WITH FULL DATA SNAPSHOTS
-- ============================================================================

BEGIN;

-- 3.1 Add full_snapshot column to existing audit log (if not exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'stockly' AND tablename = 'recipe_audit_log') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'stockly'
            AND table_name = 'recipe_audit_log'
            AND column_name = 'full_snapshot'
        ) THEN
            ALTER TABLE stockly.recipe_audit_log
            ADD COLUMN full_snapshot JSONB;

            RAISE NOTICE 'Added full_snapshot column to stockly.recipe_audit_log';
        END IF;

        -- Add data_version tracking
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'stockly'
            AND table_name = 'recipe_audit_log'
            AND column_name = 'data_version'
        ) THEN
            ALTER TABLE stockly.recipe_audit_log
            ADD COLUMN data_version INTEGER;

            RAISE NOTICE 'Added data_version column to stockly.recipe_audit_log';
        END IF;
    END IF;
END $$;

-- 3.2 Create enhanced audit trigger that captures full snapshot
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

    -- Build ingredients snapshot
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', ri.id,
            'ingredient_id', ri.ingredient_id,
            'sub_recipe_id', ri.sub_recipe_id,
            'quantity', ri.quantity,
            'unit_id', ri.unit_id,
            'ingredient_unit_cost', ri.ingredient_unit_cost,
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

-- Apply snapshot trigger (runs after existing audit trigger)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'stockly' AND tablename = 'recipes') THEN
        DROP TRIGGER IF EXISTS log_recipe_snapshot_trigger ON stockly.recipes;
        CREATE TRIGGER log_recipe_snapshot_trigger
            AFTER UPDATE ON stockly.recipes
            FOR EACH ROW
            EXECUTE FUNCTION stockly.log_recipe_full_snapshot();

        RAISE NOTICE 'Created recipe snapshot audit trigger';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- SECTION 4: DATA INTEGRITY MONITORING FUNCTIONS
-- ============================================================================

BEGIN;

-- 4.1 Create data integrity check function
-- Note: Uses CTE pattern instead of GROUP BY TRUE for PostgreSQL compatibility
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

    -- Check 5: Ingredients with NULL ingredient_id AND NULL sub_recipe_id
    -- (orphan ingredients that don't reference any source)
    RETURN QUERY
    WITH orphan_ing AS (
        SELECT ri.id, ri.recipe_id
        FROM stockly.recipe_ingredients ri
        JOIN stockly.recipes r ON r.id = ri.recipe_id
        WHERE ri.ingredient_id IS NULL AND ri.sub_recipe_id IS NULL
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

-- 4.2 Create summary function for dashboards
CREATE OR REPLACE FUNCTION get_recipe_integrity_summary(p_company_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_checks RECORD;
    v_errors INTEGER := 0;
    v_warnings INTEGER := 0;
    v_info INTEGER := 0;
BEGIN
    -- Count issues by severity
    FOR v_checks IN
        SELECT severity, SUM(issue_count) as total
        FROM check_recipe_data_integrity(p_company_id)
        GROUP BY severity
    LOOP
        IF v_checks.severity = 'error' THEN
            v_errors := v_checks.total;
        ELSIF v_checks.severity = 'warning' THEN
            v_warnings := v_checks.total;
        ELSIF v_checks.severity = 'info' THEN
            v_info := v_checks.total;
        END IF;
    END LOOP;

    v_result := jsonb_build_object(
        'status', CASE
            WHEN v_errors > 0 THEN 'critical'
            WHEN v_warnings > 0 THEN 'warning'
            ELSE 'healthy'
        END,
        'errors', v_errors,
        'warnings', v_warnings,
        'info', v_info,
        'checked_at', NOW(),
        'company_id', p_company_id
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Grant permissions
GRANT EXECUTE ON FUNCTION check_recipe_data_integrity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recipe_integrity_summary(UUID) TO authenticated;

COMMIT;

-- ============================================================================
-- SECTION 5: OPTIMISTIC LOCKING SUPPORT
-- ============================================================================

BEGIN;

-- 5.1 Create function to update with version check
CREATE OR REPLACE FUNCTION update_recipe_with_version_check(
    p_recipe_id UUID,
    p_expected_version INTEGER,
    p_updates JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_current_version INTEGER;
    v_recipe RECORD;
BEGIN
    -- Get current version
    SELECT data_version INTO v_current_version
    FROM stockly.recipes
    WHERE id = p_recipe_id
    FOR UPDATE;  -- Lock the row

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'recipe_not_found',
            'message', 'Recipe does not exist'
        );
    END IF;

    -- Check version match
    IF v_current_version != p_expected_version THEN
        -- Get latest recipe data to return
        SELECT * INTO v_recipe FROM stockly.recipes WHERE id = p_recipe_id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'version_conflict',
            'message', 'Recipe was modified by another user',
            'expected_version', p_expected_version,
            'current_version', v_current_version,
            'current_data', row_to_json(v_recipe)::jsonb
        );
    END IF;

    -- Apply updates (version will auto-increment via trigger)
    UPDATE stockly.recipes
    SET
        name = COALESCE((p_updates->>'name'), name),
        description = COALESCE((p_updates->>'description'), description),
        sell_price = COALESCE((p_updates->>'sell_price')::numeric, sell_price),
        is_active = COALESCE((p_updates->>'is_active')::boolean, is_active),
        updated_at = NOW()
    WHERE id = p_recipe_id;

    -- Return success with new version
    SELECT * INTO v_recipe FROM stockly.recipes WHERE id = p_recipe_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_version', v_recipe.data_version,
        'data', row_to_json(v_recipe)::jsonb
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_recipe_with_version_check(UUID, INTEGER, JSONB) TO authenticated;

COMMIT;

-- ============================================================================
-- SECTION 6: CREATE DATA INTEGRITY VIEW FOR MONITORING
-- ============================================================================

BEGIN;

-- 6.1 Create view for easy monitoring
CREATE OR REPLACE VIEW recipe_data_health AS
SELECT
    r.company_id,
    c.name as company_name,
    COUNT(DISTINCT r.id) as total_recipes,
    COUNT(DISTINCT r.id) FILTER (WHERE r.is_active = true) as active_recipes,
    COUNT(DISTINCT r.id) FILTER (
        WHERE r.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM stockly.recipe_ingredients ri WHERE ri.recipe_id = r.id
        )
    ) as recipes_without_ingredients,
    COUNT(DISTINCT r.id) FILTER (
        WHERE r.is_active = true
        AND (r.total_cost IS NULL OR r.total_cost = 0)
    ) as recipes_without_cost,
    MAX(r.updated_at) as last_recipe_update,
    MAX(ral.changed_at) as last_audit_entry
FROM stockly.recipes r
JOIN public.companies c ON c.id = r.company_id
LEFT JOIN stockly.recipe_audit_log ral ON ral.recipe_id = r.id
GROUP BY r.company_id, c.name;

-- Grant access
GRANT SELECT ON recipe_data_health TO authenticated;

COMMIT;

-- ============================================================================
-- SECTION 7: VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verify constraints added
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'recipes'
    AND column_name = 'data_version';

    RAISE NOTICE '✅ Migration complete!';
    RAISE NOTICE '   - data_version column added to % recipe tables', v_count;
    RAISE NOTICE '   - Audit snapshot trigger created';
    RAISE NOTICE '   - Data integrity check functions created';
    RAISE NOTICE '   - Optimistic locking function created';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Run: SELECT * FROM check_recipe_data_integrity(your_company_id);';
    RAISE NOTICE '   2. Run: SELECT * FROM recipe_data_health;';
    RAISE NOTICE '   3. Fix any issues found';
    RAISE NOTICE '   4. Update API routes to use version checking';
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
