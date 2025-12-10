-- ============================================================================
-- Migration: Create Stockly Core Tables
-- Description: Storage areas, suppliers, categories, stock items, variants, levels, movements
-- ============================================================================

BEGIN;

-- ============================================================================
-- STORAGE AREAS (within sites)
-- ============================================================================
CREATE TABLE IF NOT EXISTS storage_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    area_type TEXT CHECK (area_type IN ('chilled', 'frozen', 'ambient', 'bar', 'cellar', 'external')),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, name)
);

CREATE INDEX IF NOT EXISTS idx_storage_areas_site ON storage_areas(site_id);

-- ============================================================================
-- SUPPLIERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    code TEXT,
    
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address JSONB,
    
    ordering_method TEXT CHECK (ordering_method IN ('app', 'whatsapp', 'email', 'phone', 'portal', 'rep')),
    ordering_config JSONB DEFAULT '{}',
    -- ordering_config example for whatsapp: {whatsapp_number: "+447123456789", template: "..."}
    
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

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(company_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- STOCK CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES stock_categories(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL,
    category_type TEXT NOT NULL CHECK (category_type IN (
        'food', 'beverage', 'alcohol', 'chemical', 'disposable', 'equipment', 'other'
    )),
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_categories_company ON stock_categories(company_id);

-- Unique constraint for company_id, name, and parent_id (handling NULL parent_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_categories_unique 
    ON stock_categories(company_id, name, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ============================================================================
-- STOCK ITEMS (CANONICAL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES stock_categories(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT,
    
    base_unit_id UUID NOT NULL REFERENCES uom(id),
    
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
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_stock_items_company ON stock_items(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_category ON stock_items(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_active ON stock_items(company_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- PRODUCT VARIANTS (purchasable products for canonical items)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    
    supplier_code TEXT,
    product_name TEXT NOT NULL,
    brand TEXT,
    barcode TEXT,
    
    pack_size DECIMAL(10,3) NOT NULL,
    pack_unit_id UUID NOT NULL REFERENCES uom(id),
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

CREATE INDEX IF NOT EXISTS idx_product_variants_stock_item ON product_variants(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_supplier ON product_variants(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_preferred ON product_variants(stock_item_id, is_preferred) 
    WHERE is_preferred = TRUE;

-- Unique constraint for stock_item_id, supplier_id, and supplier_code (handling NULL supplier_code)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_unique 
    ON product_variants(stock_item_id, supplier_id, COALESCE(supplier_code, ''));

-- ============================================================================
-- PRICE HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2) NOT NULL,
    old_price_per_base DECIMAL(10,4),
    new_price_per_base DECIMAL(10,4) NOT NULL,
    change_percent DECIMAL(5,2),
    
    source TEXT CHECK (source IN ('invoice', 'manual', 'price_list', 'import')),
    source_ref TEXT,
    
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_price_history_variant ON price_history(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(recorded_at DESC);

-- ============================================================================
-- STOCK LEVELS
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    storage_area_id UUID REFERENCES storage_areas(id) ON DELETE SET NULL,
    
    quantity DECIMAL(12,4) NOT NULL DEFAULT 0,
    
    avg_cost DECIMAL(10,4),
    total_value DECIMAL(12,2),
    
    last_movement_at TIMESTAMPTZ,
    last_count_at TIMESTAMPTZ,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_levels_site ON stock_levels(site_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_item ON stock_levels(stock_item_id);

-- Unique constraint for stock_item_id, site_id, and storage_area_id (handling NULL storage_area_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_levels_unique 
    ON stock_levels(stock_item_id, site_id, COALESCE(storage_area_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ============================================================================
-- STOCK MOVEMENTS (audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    stock_item_id UUID NOT NULL REFERENCES stock_items(id),
    
    movement_type TEXT NOT NULL CHECK (movement_type IN (
        'purchase', 'transfer_out', 'transfer_in', 'internal_sale',
        'waste', 'staff_sale', 'pos_drawdown', 'production_out',
        'production_in', 'adjustment', 'count_adjustment', 'return_supplier'
    )),
    
    quantity DECIMAL(12,4) NOT NULL,
    
    from_site_id UUID REFERENCES sites(id),
    from_storage_id UUID REFERENCES storage_areas(id),
    to_site_id UUID REFERENCES sites(id),
    to_storage_id UUID REFERENCES storage_areas(id),
    
    unit_cost DECIMAL(10,4),
    total_cost DECIMAL(12,2),
    
    ref_type TEXT,
    ref_id UUID,
    
    reason TEXT,
    notes TEXT,
    photo_urls TEXT[],
    
    recorded_by UUID REFERENCES profiles(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);

COMMIT;

