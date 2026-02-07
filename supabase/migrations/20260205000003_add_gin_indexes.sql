-- Migration: Add GIN Indexes for Array and JSONB Columns
-- Priority: P3 - MEDIUM
-- Description: Add specialized indexes for array and JSONB column queries
-- Expected Impact: Faster searches on array contains and JSONB queries

-- ============================================
-- ENABLE REQUIRED EXTENSIONS
-- ============================================

-- Enable pg_trgm for text search if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- STOCKLY ARRAY INDEXES
-- ============================================

-- Allergens array searches (used in allergen filtering)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'stockly' AND table_name = 'stock_items' AND column_name = 'allergens'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_stock_items_allergens
            ON stockly.stock_items USING GIN (allergens)
            WHERE allergens IS NOT NULL;
    END IF;
END $$;

-- Supplier areas postcode patterns (used in smart ordering)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'stockly' AND table_name = 'supplier_areas' AND column_name = 'postcode_patterns'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_supplier_areas_postcodes
            ON stockly.supplier_areas USING GIN (postcode_patterns)
            WHERE postcode_patterns IS NOT NULL;
    END IF;
END $$;

-- ============================================
-- PLANLY ARRAY INDEXES
-- ============================================

-- Customer delivery days array (used in schedule filtering)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'planly_customers' AND column_name = 'delivery_days'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_customers_delivery_days
            ON planly_customers USING GIN (delivery_days)
            WHERE delivery_days IS NOT NULL;
    END IF;
END $$;

-- ============================================
-- JSONB INDEXES (only if columns exist and are JSONB type)
-- ============================================

-- Stock item metadata (if used in queries)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'stockly' AND table_name = 'stock_items'
        AND column_name = 'metadata' AND data_type = 'jsonb'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_stock_items_metadata
            ON stockly.stock_items USING GIN (metadata jsonb_path_ops)
            WHERE metadata IS NOT NULL;
    END IF;
END $$;

-- ============================================
-- TEXT SEARCH INDEXES (for name/description searches)
-- Requires pg_trgm extension - only create if column exists
-- ============================================

-- Customer name search
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'planly_customers' AND column_name = 'name'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_planly_customers_name_trgm
            ON planly_customers USING GIN (name gin_trgm_ops);
    END IF;
END $$;

-- Stock item name search
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'stockly' AND table_name = 'stock_items' AND column_name = 'name'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_stock_items_name_trgm
            ON stockly.stock_items USING GIN (name gin_trgm_ops);
    END IF;
END $$;
