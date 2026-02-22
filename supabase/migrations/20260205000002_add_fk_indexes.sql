-- Migration: Add Foreign Key Indexes
-- Priority: P2 - HIGH
-- Description: Add indexes on foreign key columns for efficient JOINs
-- Expected Impact: Faster JOIN operations, reduced sequential scans

-- ============================================
-- STOCKLY SCHEMA INDEXES
-- ============================================

-- Stock movements reference lookup (used for tracing movements to source)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'stockly' AND table_name = 'stock_movements' AND column_name = 'ref_type'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_stock_movements_ref
            ON stockly.stock_movements(ref_type, ref_id);
    END IF;
END $$;

-- Stock items base unit lookups (used in unit conversions)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'stockly' AND table_name = 'stock_items' AND column_name = 'base_unit_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_stock_items_base_unit
            ON stockly.stock_items(base_unit_id);
    END IF;
END $$;

-- Stock items by category (used in filtered lists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'stockly' AND table_name = 'stock_items' AND column_name = 'category_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_stock_items_category
            ON stockly.stock_items(company_id, category_id) WHERE is_active = true;
    END IF;
END $$;

-- Product variants by stock item (used in price lookups)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'stockly' AND table_name = 'product_variants' AND column_name = 'stock_item_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_product_variants_stock_item
            ON stockly.product_variants(stock_item_id, is_preferred DESC);
    END IF;
END $$;

-- Deliveries by purchase order (used in PO tracking)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'purchase_order_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_deliveries_po
            ON stockly.deliveries(purchase_order_id) WHERE purchase_order_id IS NOT NULL;
    END IF;
END $$;

-- Delivery lines by delivery (used in delivery detail queries)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'stockly' AND table_name = 'delivery_lines'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_delivery_lines_delivery
            ON stockly.delivery_lines(delivery_id);
    END IF;
END $$;

-- Recipe ingredients by recipe (used in recipe cost calculations)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'stockly' AND table_name = 'recipe_ingredients'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe
            ON stockly.recipe_ingredients(recipe_id);
    END IF;
END $$;

-- ============================================
-- PLANLY SCHEMA INDEXES
-- Note: Some indexes already exist from original schema
-- ============================================

-- Product ingredients by product (used in ingredient calculations)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'planly_product_ingredients') THEN
        CREATE INDEX IF NOT EXISTS idx_product_ingredients_product
            ON planly_product_ingredients(product_id);
    END IF;
END $$;

-- Process stages by template (used in production planning)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'planly_process_stages') THEN
        CREATE INDEX IF NOT EXISTS idx_process_stages_template
            ON planly_process_stages(template_id);
    END IF;
END $$;

-- ============================================
-- PUBLIC SCHEMA INDEXES
-- ============================================

-- Profiles by company (used in RLS and company lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_company
    ON public.profiles(company_id);

-- Sites by company (used in site filtering)
CREATE INDEX IF NOT EXISTS idx_sites_company
    ON public.sites(company_id);

-- User roles indexes (schema varies - check column existence)
DO $$
BEGIN
    -- Old schema uses user_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_roles' AND column_name = 'user_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_user_roles_user
            ON public.user_roles(user_id);
    END IF;

    -- New schema uses profile_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_roles' AND column_name = 'profile_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_user_roles_profile
            ON public.user_roles(profile_id);
    END IF;

    -- Old schema uses company_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_roles' AND column_name = 'company_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_user_roles_company
            ON public.user_roles(company_id);
    END IF;
END $$;

-- Ingredients library indexes (if table and columns exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ingredients_library' AND column_name = 'site_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_ingredients_library_site
            ON public.ingredients_library(site_id);
    END IF;
END $$;
