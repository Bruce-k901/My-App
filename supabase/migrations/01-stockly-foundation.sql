-- ============================================================================
-- Migration: 01-stockly-foundation.sql
-- Description: Creates stockly schema + all core Stockly tables
-- Run this FIRST before any other Stockly migrations
-- ============================================================================

BEGIN;

-- ============================================================================
-- CREATE STOCKLY SCHEMA
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS stockly;

-- ============================================================================
-- PUBLIC SCHEMA PREREQUISITES (if they don't exist)
-- Note: profiles table should already exist from other migrations
-- ============================================================================

-- Companies table (if not exists)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sites table (if not exists)
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table (if not exists)
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'supervisor', 'staff')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, company_id)
);

-- UOM table (global units of measure)
CREATE TABLE IF NOT EXISTS public.uom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    abbreviation TEXT NOT NULL UNIQUE,
    unit_type TEXT NOT NULL CHECK (unit_type IN ('weight', 'volume', 'count', 'length')),
    base_multiplier DECIMAL(12,6) DEFAULT 1,
    is_base BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed standard hospitality units
INSERT INTO public.uom (name, abbreviation, unit_type, base_multiplier, is_base, sort_order) VALUES
-- Weight (base = kg)
('Kilogram', 'kg', 'weight', 1, TRUE, 1),
('Gram', 'g', 'weight', 0.001, FALSE, 2),
('Pound', 'lb', 'weight', 0.453592, FALSE, 3),
('Ounce', 'oz', 'weight', 0.0283495, FALSE, 4),
-- Volume (base = L)
('Litre', 'L', 'volume', 1, TRUE, 10),
('Millilitre', 'ml', 'volume', 0.001, FALSE, 11),
('Centilitre', 'cl', 'volume', 0.01, FALSE, 12),
('Pint (UK)', 'pt', 'volume', 0.568261, FALSE, 13),
('Gallon (UK)', 'gal', 'volume', 4.54609, FALSE, 14),
('Fluid Ounce', 'fl oz', 'volume', 0.0284131, FALSE, 15),
-- Count (base = each)
('Each', 'ea', 'count', 1, TRUE, 20),
('Dozen', 'doz', 'count', 12, FALSE, 21),
('Case', 'case', 'count', 1, FALSE, 22),
('Pack', 'pack', 'count', 1, FALSE, 23),
('Bottle', 'btl', 'count', 1, FALSE, 24),
('Can', 'can', 'count', 1, FALSE, 25),
('Portion', 'ptn', 'count', 1, FALSE, 26),
('Bunch', 'bunch', 'count', 1, FALSE, 27),
('Bag', 'bag', 'count', 1, FALSE, 28),
('Tray', 'tray', 'count', 1, FALSE, 29),
('Sleeve', 'sleeve', 'count', 1, FALSE, 30)
ON CONFLICT (abbreviation) DO NOTHING;

-- ============================================================================
-- STOCKLY SCHEMA: STORAGE AREAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.storage_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    area_type TEXT CHECK (area_type IN ('chilled', 'frozen', 'ambient', 'bar', 'cellar', 'external')),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, name)
);

CREATE INDEX IF NOT EXISTS idx_storage_areas_site ON stockly.storage_areas(site_id);

-- ============================================================================
-- STOCKLY SCHEMA: SUPPLIERS
-- ============================================================================
-- Drop if exists in wrong schema first
DROP TABLE IF EXISTS public.suppliers CASCADE;

CREATE TABLE IF NOT EXISTS stockly.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    code TEXT,
    
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address JSONB,
    
    ordering_method TEXT CHECK (ordering_method IN ('app', 'whatsapp', 'email', 'phone', 'portal', 'rep')),
    ordering_config JSONB DEFAULT '{}',
    
    payment_terms_days INTEGER DEFAULT 30,
    minimum_order_value DECIMAL(10,2),
    delivery_days TEXT[],
    lead_time_days INTEGER DEFAULT 1,
    account_number TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    is_approved BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON stockly.suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON stockly.suppliers(company_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- STOCKLY SCHEMA: STOCK CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.stock_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES stockly.stock_categories(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL,
    category_type TEXT NOT NULL CHECK (category_type IN (
        'food', 'beverage', 'alcohol', 'chemical', 'disposable', 'equipment', 'other'
    )),
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_categories_company ON stockly.stock_categories(company_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_categories_unique 
    ON stockly.stock_categories(company_id, name, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ============================================================================
-- STOCKLY SCHEMA: STOCK ITEMS (CANONICAL)
-- ============================================================================
-- Drop if exists in wrong schema first
DROP TABLE IF EXISTS public.stock_items CASCADE;

CREATE TABLE IF NOT EXISTS stockly.stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES stockly.stock_categories(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT,
    
    base_unit_id UUID NOT NULL REFERENCES public.uom(id),
    
    yield_percent DECIMAL(5,2) DEFAULT 100.00 
        CHECK (yield_percent > 0 AND yield_percent <= 100),
    yield_notes TEXT,
    
    track_stock BOOLEAN DEFAULT TRUE,
    par_level DECIMAL(10,3),
    reorder_qty DECIMAL(10,3),
    
    allergens TEXT[],
    
    is_prep_item BOOLEAN DEFAULT FALSE,
    is_purchasable BOOLEAN DEFAULT TRUE,
    
    costing_method TEXT DEFAULT 'weighted_avg' 
        CHECK (costing_method IN ('weighted_avg', 'fifo', 'last_price')),
    current_cost DECIMAL(10,4),
    cost_updated_at TIMESTAMPTZ,
    
    default_vat_rate NUMERIC(5,2) DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_stock_items_company ON stockly.stock_items(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_category ON stockly.stock_items(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_active ON stockly.stock_items(company_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- STOCKLY SCHEMA: PRODUCT VARIANTS
-- ============================================================================
-- Drop if exists in wrong schema first
DROP TABLE IF EXISTS public.product_variants CASCADE;

CREATE TABLE IF NOT EXISTS stockly.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID NOT NULL REFERENCES stockly.stock_items(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES stockly.suppliers(id) ON DELETE RESTRICT,
    
    supplier_code TEXT,
    product_name TEXT NOT NULL,
    brand TEXT,
    barcode TEXT,
    
    pack_size DECIMAL(10,3) NOT NULL,
    pack_unit_id UUID NOT NULL REFERENCES public.uom(id),
    units_per_case INTEGER DEFAULT 1,
    
    conversion_factor DECIMAL(12,6) NOT NULL,
    
    current_price DECIMAL(10,2),
    price_per_base DECIMAL(10,4),
    price_updated_at TIMESTAMPTZ,
    
    is_preferred BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    is_discontinued BOOLEAN DEFAULT FALSE,
    
    min_order_qty DECIMAL(10,3) DEFAULT 1,
    order_multiple DECIMAL(10,3) DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_stock_item ON stockly.product_variants(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_supplier ON stockly.product_variants(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_preferred ON stockly.product_variants(stock_item_id, is_preferred) 
    WHERE is_preferred = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_unique 
    ON stockly.product_variants(stock_item_id, supplier_id, COALESCE(supplier_code, ''));

-- ============================================================================
-- STOCKLY SCHEMA: PRICE HISTORY
-- ============================================================================
-- Drop if exists in wrong schema first
DROP TABLE IF EXISTS public.price_history CASCADE;
DROP TABLE IF EXISTS stockly.price_history CASCADE;

CREATE TABLE stockly.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_variant_id UUID NOT NULL REFERENCES stockly.product_variants(id) ON DELETE CASCADE,
    
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2) NOT NULL,
    old_price_per_base DECIMAL(10,4),
    new_price_per_base DECIMAL(10,4) NOT NULL,
    change_percent DECIMAL(5,2),
    
    source TEXT CHECK (source IN ('invoice', 'manual', 'price_list', 'import')),
    source_ref TEXT,
    
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_price_history_variant ON stockly.price_history(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON stockly.price_history(recorded_at DESC);

-- ============================================================================
-- STOCKLY SCHEMA: STOCK LEVELS
-- ============================================================================
-- Drop if exists in wrong schema first
DROP TABLE IF EXISTS public.stock_levels CASCADE;

CREATE TABLE IF NOT EXISTS stockly.stock_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID NOT NULL REFERENCES stockly.stock_items(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    storage_area_id UUID REFERENCES stockly.storage_areas(id) ON DELETE SET NULL,
    
    quantity DECIMAL(12,4) NOT NULL DEFAULT 0,
    
    avg_cost DECIMAL(10,4),
    value DECIMAL(12,2),
    total_value DECIMAL(12,2),
    
    last_movement_at TIMESTAMPTZ,
    last_count_at TIMESTAMPTZ,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_levels_site ON stockly.stock_levels(site_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_item ON stockly.stock_levels(stock_item_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_levels_unique 
    ON stockly.stock_levels(stock_item_id, site_id, COALESCE(storage_area_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ============================================================================
-- STOCKLY SCHEMA: STOCK MOVEMENTS
-- ============================================================================
-- Drop if exists in wrong schema first
DROP TABLE IF EXISTS public.stock_movements CASCADE;
DROP TABLE IF EXISTS stockly.stock_movements CASCADE;

CREATE TABLE stockly.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    stock_item_id UUID NOT NULL REFERENCES stockly.stock_items(id),
    
    movement_type TEXT NOT NULL CHECK (movement_type IN (
        'purchase', 'transfer_out', 'transfer_in', 'internal_sale',
        'waste', 'staff_sale', 'pos_drawdown', 'production_out',
        'production_in', 'adjustment', 'count_adjustment', 'return_supplier'
    )),
    
    quantity DECIMAL(12,4) NOT NULL,
    
    from_site_id UUID REFERENCES public.sites(id),
    from_storage_id UUID REFERENCES stockly.storage_areas(id),
    to_site_id UUID REFERENCES public.sites(id),
    to_storage_id UUID REFERENCES stockly.storage_areas(id),
    
    unit_cost DECIMAL(10,4),
    total_cost DECIMAL(12,2),
    
    ref_type TEXT,
    ref_id UUID,
    
    reason TEXT,
    notes TEXT,
    photo_urls TEXT[],
    
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON stockly.stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stockly.stock_movements(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stockly.stock_movements(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stockly.stock_movements(movement_type);

-- ============================================================================
-- STOCKLY SCHEMA: DELIVERIES
-- ============================================================================
-- Drop if exists in wrong schema first
DROP TABLE IF EXISTS public.deliveries CASCADE;
DROP TABLE IF EXISTS public.delivery_lines CASCADE;

CREATE TABLE IF NOT EXISTS stockly.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    site_id UUID NOT NULL REFERENCES public.sites(id),
    supplier_id UUID NOT NULL REFERENCES stockly.suppliers(id),
    purchase_order_id UUID,
    
    delivery_date DATE NOT NULL,
    delivery_note_number TEXT,
    invoice_number TEXT,
    invoice_date DATE,
    
    subtotal DECIMAL(12,2),
    vat_total DECIMAL(10,2),
    tax DECIMAL(10,2),
    total DECIMAL(12,2),
    
    ai_processed BOOLEAN DEFAULT FALSE,
    ai_confidence DECIMAL(3,2),
    ai_extraction JSONB,
    requires_review BOOLEAN DEFAULT FALSE,
    
    document_urls TEXT[],
    
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_review', 'confirmed', 'disputed', 'cancelled'
    )),
    
    received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_company ON stockly.deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_site ON stockly.deliveries(site_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_supplier ON stockly.deliveries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON stockly.deliveries(delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON stockly.deliveries(status);

-- ============================================================================
-- STOCKLY SCHEMA: DELIVERY LINES
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.delivery_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES stockly.deliveries(id) ON DELETE CASCADE,
    product_variant_id UUID NOT NULL REFERENCES stockly.product_variants(id),
    storage_area_id UUID REFERENCES stockly.storage_areas(id),
    
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2),
    
    vat_rate NUMERIC(5,2) DEFAULT 0,
    vat_amount NUMERIC(12,2) DEFAULT 0,
    line_total_inc_vat NUMERIC(12,2),
    
    qty_base_units DECIMAL(12,4) NOT NULL,
    
    was_substituted BOOLEAN DEFAULT FALSE,
    original_variant_id UUID REFERENCES stockly.product_variants(id),
    
    price_changed BOOLEAN DEFAULT FALSE,
    expected_price DECIMAL(10,2),
    
    ai_match_confidence DECIMAL(3,2),
    
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_delivery_lines_delivery ON stockly.delivery_lines(delivery_id);

-- ============================================================================
-- STOCKLY SCHEMA: WASTE LOGS
-- ============================================================================
-- Drop if exists in wrong schema first
DROP TABLE IF EXISTS public.waste_logs CASCADE;
DROP TABLE IF EXISTS public.waste_log_lines CASCADE;

CREATE TABLE IF NOT EXISTS stockly.waste_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    site_id UUID NOT NULL REFERENCES public.sites(id),
    
    waste_date DATE NOT NULL,
    waste_reason TEXT NOT NULL CHECK (waste_reason IN (
        'expired', 'damaged', 'spillage', 'overproduction', 
        'quality', 'customer_return', 'temperature_breach', 
        'pest_damage', 'theft', 'prep_waste', 'other'
    )),
    
    notes TEXT,
    photo_urls TEXT[],
    total_cost DECIMAL(10,2),
    
    checkly_task_id UUID,
    
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waste_logs_company ON stockly.waste_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_waste_logs_site ON stockly.waste_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_waste_logs_date ON stockly.waste_logs(waste_date DESC);
CREATE INDEX IF NOT EXISTS idx_waste_logs_reason ON stockly.waste_logs(waste_reason);

-- ============================================================================
-- STOCKLY SCHEMA: WASTE LOG LINES
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.waste_log_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waste_log_id UUID NOT NULL REFERENCES stockly.waste_logs(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES stockly.stock_items(id),
    
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,4),
    line_cost DECIMAL(10,2),
    
    specific_reason TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_waste_lines_log ON stockly.waste_log_lines(waste_log_id);

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE stockly.storage_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.stock_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.delivery_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.waste_log_lines ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Helper function for company access
CREATE OR REPLACE FUNCTION stockly.stockly_company_access(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.company_id = p_company_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Company-scoped tables
DROP POLICY IF EXISTS suppliers_company ON stockly.suppliers;
CREATE POLICY suppliers_company ON stockly.suppliers FOR ALL 
    USING (stockly.stockly_company_access(company_id));

DROP POLICY IF EXISTS stock_categories_company ON stockly.stock_categories;
CREATE POLICY stock_categories_company ON stockly.stock_categories FOR ALL 
    USING (stockly.stockly_company_access(company_id));

DROP POLICY IF EXISTS stock_items_company ON stockly.stock_items;
CREATE POLICY stock_items_company ON stockly.stock_items FOR ALL 
    USING (stockly.stockly_company_access(company_id));

DROP POLICY IF EXISTS stock_movements_company ON stockly.stock_movements;
CREATE POLICY stock_movements_company ON stockly.stock_movements FOR ALL 
    USING (stockly.stockly_company_access(company_id));

DROP POLICY IF EXISTS deliveries_company ON stockly.deliveries;
CREATE POLICY deliveries_company ON stockly.deliveries FOR ALL 
    USING (stockly.stockly_company_access(company_id));

DROP POLICY IF EXISTS waste_logs_company ON stockly.waste_logs;
CREATE POLICY waste_logs_company ON stockly.waste_logs FOR ALL 
    USING (stockly.stockly_company_access(company_id));

-- Site-joined tables
DROP POLICY IF EXISTS storage_areas_site ON stockly.storage_areas;
CREATE POLICY storage_areas_site ON stockly.storage_areas FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.company_id = s.company_id
        WHERE s.id = stockly.storage_areas.site_id AND p.id = auth.uid()
    )
);

DROP POLICY IF EXISTS stock_levels_site ON stockly.stock_levels;
CREATE POLICY stock_levels_site ON stockly.stock_levels FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.company_id = s.company_id
        WHERE s.id = stockly.stock_levels.site_id AND p.id = auth.uid()
    )
);

-- Child tables
DROP POLICY IF EXISTS product_variants_parent ON stockly.product_variants;
CREATE POLICY product_variants_parent ON stockly.product_variants FOR ALL USING (
    EXISTS (
        SELECT 1 FROM stockly.stock_items si
        WHERE si.id = stockly.product_variants.stock_item_id
          AND stockly.stockly_company_access(si.company_id)
    )
);

DROP POLICY IF EXISTS price_history_parent ON stockly.price_history;
CREATE POLICY price_history_parent ON stockly.price_history FOR ALL USING (
    EXISTS (
        SELECT 1 FROM stockly.product_variants pv
        JOIN stockly.stock_items si ON si.id = pv.stock_item_id
        WHERE pv.id = stockly.price_history.product_variant_id
          AND stockly.stockly_company_access(si.company_id)
    )
);

DROP POLICY IF EXISTS delivery_lines_parent ON stockly.delivery_lines;
CREATE POLICY delivery_lines_parent ON stockly.delivery_lines FOR ALL USING (
    EXISTS (
        SELECT 1 FROM stockly.deliveries d
        WHERE d.id = stockly.delivery_lines.delivery_id
          AND stockly.stockly_company_access(d.company_id)
    )
);

DROP POLICY IF EXISTS waste_lines_parent ON stockly.waste_log_lines;
CREATE POLICY waste_lines_parent ON stockly.waste_log_lines FOR ALL USING (
    EXISTS (
        SELECT 1 FROM stockly.waste_logs wl
        WHERE wl.id = stockly.waste_log_lines.waste_log_id
          AND stockly.stockly_company_access(wl.company_id)
    )
);

COMMIT;

SELECT 'Stockly foundation migration completed successfully' as result;
