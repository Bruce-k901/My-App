# Stockly + Checkly Integration Plan

## Existing Checkly Schema (from codebase analysis)

### Confirmed Tables & Columns

Based on the SQL files and TypeScript code:

```sql
-- ============================================================================
-- COMPANIES (confirmed from RLS policies and code)
-- ============================================================================
companies (
    id UUID PRIMARY KEY,
    name TEXT,
    -- Other columns unknown - NEED TO VERIFY FULL SCHEMA
)

-- ============================================================================
-- SITES (confirmed from edge functions and RLS)
-- ============================================================================
sites (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    name TEXT,
    status TEXT,  -- 'active', 'inactive' (from edge function filter)
    -- Other columns unknown - NEED TO VERIFY FULL SCHEMA
)

-- ============================================================================
-- PROFILES (confirmed from multiple RLS policies)
-- ============================================================================
profiles (
    id UUID PRIMARY KEY,
    auth_user_id UUID,  -- From user_site_access join
    company_id UUID REFERENCES companies(id),
    site_id UUID REFERENCES sites(id),
    full_name TEXT,
    email TEXT,
    app_role TEXT,  -- 'Owner', 'Admin', 'Manager', 'Staff'

    -- Certificate fields (from edge function)
    food_safety_expiry_date DATE,
    h_and_s_expiry_date DATE,
    fire_marshal_expiry_date DATE,
    first_aid_expiry_date DATE,
    cossh_expiry_date DATE,
    food_safety_level TEXT,
    h_and_s_level TEXT,
    -- Other columns unknown
)

-- ============================================================================
-- USER_SITE_ACCESS (confirmed from RLS policies)
-- ============================================================================
user_site_access (
    id UUID PRIMARY KEY,
    auth_user_id UUID,
    company_id UUID,
    site_id UUID  -- NULL = all sites access
)

-- ============================================================================
-- ASSETS (confirmed from compliance API and edge functions)
-- ============================================================================
assets (
    id UUID PRIMARY KEY,
    company_id UUID,
    site_id UUID,
    name TEXT,
    type TEXT,
    brand TEXT,
    temp_min DECIMAL,
    temp_max DECIMAL,
    status TEXT,  -- 'active'
    last_service_date DATE,
    next_service_date DATE,
    -- Other columns unknown
)
```

---

## What Bruce Needs to Verify

Before running migrations, please confirm in Supabase dashboard:

### 1. Companies Table

```sql
-- Run in Supabase SQL Editor to see actual schema:
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'companies'
ORDER BY ordinal_position;
```

**Questions:**

- Does `companies` have any JSON/JSONB settings column already?
- Are there other fields we should know about?

### 2. Sites Table

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sites'
ORDER BY ordinal_position;
```

**Questions:**

- Any existing `type` or `location_type` column?
- Any POS-related columns already?

### 3. Check for Conflicts

```sql
-- Ensure no table name conflicts
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'suppliers', 'stock_items', 'product_variants',
    'recipes', 'deliveries', 'stock_counts', 'uom',
    'stock_movements', 'transfers', 'company_modules'
);
```

---

## Integration Decisions (Confirmed)

| Decision            | Choice                                   | Rationale                         |
| ------------------- | ---------------------------------------- | --------------------------------- |
| Organisations       | Use existing `companies`                 | No parallel universe              |
| Locations           | Extend `sites` with `location_type`      | CPU/warehouse are just site types |
| Auth                | Use existing profiles + user_site_access | Shared login                      |
| UOM                 | Global `uom` table                       | No per-company nonsense           |
| Recipe cost cascade | Manual "Recalculate" button              | MVP simplicity                    |
| Offline counting    | Print sheets, enter when online          | Hybrid approach                   |

---

## Migration Scripts

### Step 1: Create company_modules table

```sql
-- Track which modules each company has enabled
CREATE TABLE IF NOT EXISTS company_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    module TEXT NOT NULL CHECK (module IN ('checkly', 'stockly', 'peoply')),
    is_enabled BOOLEAN DEFAULT TRUE,
    enabled_at TIMESTAMPTZ DEFAULT NOW(),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, module)
);

CREATE INDEX idx_company_modules_company ON company_modules(company_id);

-- Enable RLS
ALTER TABLE company_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_modules_access ON company_modules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.company_id = company_modules.company_id
        )
    );

-- Seed existing companies with Checkly module
INSERT INTO company_modules (company_id, module, is_enabled)
SELECT id, 'checkly', TRUE FROM companies
ON CONFLICT (company_id, module) DO NOTHING;
```

### Step 2: Extend sites table

```sql
-- Add location_type to distinguish site types
ALTER TABLE sites
ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'site'
    CHECK (location_type IN ('site', 'cpu', 'warehouse', 'external'));

-- Add POS configuration
ALTER TABLE sites
ADD COLUMN IF NOT EXISTS pos_provider TEXT
    CHECK (pos_provider IN ('square', 'lightspeed', 'toast', 'zonal', 'other', NULL)),
ADD COLUMN IF NOT EXISTS pos_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS pos_location_id TEXT;

-- For CPU locations: internal markup when selling to sites
ALTER TABLE sites
ADD COLUMN IF NOT EXISTS internal_markup_percent DECIMAL(5,2) DEFAULT 0;

-- Comments
COMMENT ON COLUMN sites.location_type IS
    'site=restaurant/bar with POS, cpu=central production unit, warehouse=storage only, external=offsite storage';
COMMENT ON COLUMN sites.pos_config IS
    'POS-specific config: {api_key, location_id, webhook_url, sync_interval}';
COMMENT ON COLUMN sites.internal_markup_percent IS
    'Markup % when CPU sells to sites (internal invoicing)';

-- Update existing sites to be type 'site'
UPDATE sites SET location_type = 'site' WHERE location_type IS NULL;
```

### Step 3: Create global UOM table

```sql
-- Global units of measure (NOT per-company)
CREATE TABLE IF NOT EXISTS uom (
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
INSERT INTO uom (name, abbreviation, unit_type, base_multiplier, is_base, sort_order) VALUES
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

-- UOM is global read for everyone (no company restriction)
ALTER TABLE uom ENABLE ROW LEVEL SECURITY;
CREATE POLICY uom_global_read ON uom FOR SELECT USING (TRUE);
-- Only service_role can modify
CREATE POLICY uom_service_only ON uom FOR ALL USING (auth.role() = 'service_role');
```

### Step 4: Create Stockly core tables

```sql
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

CREATE INDEX idx_storage_areas_site ON storage_areas(site_id);

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

CREATE INDEX idx_suppliers_company ON suppliers(company_id);
CREATE INDEX idx_suppliers_active ON suppliers(company_id, is_active) WHERE is_active = TRUE;

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

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, name, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'))
);

CREATE INDEX idx_stock_categories_company ON stock_categories(company_id);

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

CREATE INDEX idx_stock_items_company ON stock_items(company_id);
CREATE INDEX idx_stock_items_category ON stock_items(category_id);
CREATE INDEX idx_stock_items_active ON stock_items(company_id, is_active) WHERE is_active = TRUE;

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
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(stock_item_id, supplier_id, COALESCE(supplier_code, ''))
);

CREATE INDEX idx_product_variants_stock_item ON product_variants(stock_item_id);
CREATE INDEX idx_product_variants_supplier ON product_variants(supplier_id);
CREATE INDEX idx_product_variants_preferred ON product_variants(stock_item_id, is_preferred)
    WHERE is_preferred = TRUE;

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

CREATE INDEX idx_price_history_variant ON price_history(product_variant_id);
CREATE INDEX idx_price_history_date ON price_history(recorded_at DESC);

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

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(stock_item_id, site_id, COALESCE(storage_area_id, '00000000-0000-0000-0000-000000000000'))
);

CREATE INDEX idx_stock_levels_site ON stock_levels(site_id);
CREATE INDEX idx_stock_levels_item ON stock_levels(stock_item_id);

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

CREATE INDEX idx_stock_movements_company ON stock_movements(company_id);
CREATE INDEX idx_stock_movements_item ON stock_movements(stock_item_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(recorded_at DESC);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
```

### Step 5: Create deliveries and purchasing tables

```sql
-- ============================================================================
-- DELIVERIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    site_id UUID NOT NULL REFERENCES sites(id),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    purchase_order_id UUID,

    delivery_date DATE NOT NULL,
    delivery_note_number TEXT,
    invoice_number TEXT,
    invoice_date DATE,

    subtotal DECIMAL(12,2),
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

    received_by UUID REFERENCES profiles(id),
    confirmed_by UUID REFERENCES profiles(id),
    confirmed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliveries_company ON deliveries(company_id);
CREATE INDEX idx_deliveries_site ON deliveries(site_id);
CREATE INDEX idx_deliveries_supplier ON deliveries(supplier_id);
CREATE INDEX idx_deliveries_date ON deliveries(delivery_date DESC);
CREATE INDEX idx_deliveries_status ON deliveries(status);

CREATE TABLE IF NOT EXISTS delivery_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    product_variant_id UUID NOT NULL REFERENCES product_variants(id),
    storage_area_id UUID REFERENCES storage_areas(id),

    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2),

    qty_base_units DECIMAL(12,4) NOT NULL,

    was_substituted BOOLEAN DEFAULT FALSE,
    original_variant_id UUID REFERENCES product_variants(id),

    price_changed BOOLEAN DEFAULT FALSE,
    expected_price DECIMAL(10,2),

    ai_match_confidence DECIMAL(3,2),

    notes TEXT
);

CREATE INDEX idx_delivery_lines_delivery ON delivery_lines(delivery_id);

-- ============================================================================
-- PURCHASE ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    site_id UUID NOT NULL REFERENCES sites(id),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),

    order_number TEXT NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery DATE,

    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'sent', 'confirmed', 'partial_received', 'received', 'cancelled'
    )),

    subtotal DECIMAL(12,2),
    tax DECIMAL(10,2),
    total DECIMAL(12,2),

    sent_via TEXT CHECK (sent_via IN ('whatsapp', 'email', 'app', 'phone', 'portal')),
    sent_message TEXT,
    sent_at TIMESTAMPTZ,

    notes TEXT,

    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchase_orders_company ON purchase_orders(company_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_variant_id UUID NOT NULL REFERENCES product_variants(id),

    quantity_ordered DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2),
    line_total DECIMAL(10,2),

    quantity_received DECIMAL(10,3) DEFAULT 0,
    received_variant_id UUID REFERENCES product_variants(id),

    notes TEXT
);

CREATE INDEX idx_po_lines_po ON purchase_order_lines(purchase_order_id);
```

### Step 6: Create waste, counting, and transfers

```sql
-- ============================================================================
-- WASTE LOGGING
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    site_id UUID NOT NULL REFERENCES sites(id),

    waste_date DATE NOT NULL,
    waste_reason TEXT NOT NULL CHECK (waste_reason IN (
        'expired', 'damaged', 'spillage', 'overproduction',
        'quality', 'customer_return', 'temperature_breach',
        'pest_damage', 'theft', 'prep_waste', 'other'
    )),

    notes TEXT,
    photo_urls TEXT[],
    total_cost DECIMAL(10,2),

    -- Link to Checkly if from temperature breach
    checkly_task_id UUID,

    recorded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waste_logs_company ON waste_logs(company_id);
CREATE INDEX idx_waste_logs_site ON waste_logs(site_id);
CREATE INDEX idx_waste_logs_date ON waste_logs(waste_date DESC);
CREATE INDEX idx_waste_logs_reason ON waste_logs(waste_reason);

CREATE TABLE IF NOT EXISTS waste_log_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waste_log_id UUID NOT NULL REFERENCES waste_logs(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES stock_items(id),

    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,4),
    line_cost DECIMAL(10,2),

    specific_reason TEXT,
    notes TEXT
);

CREATE INDEX idx_waste_lines_log ON waste_log_lines(waste_log_id);

-- ============================================================================
-- STOCK COUNTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    site_id UUID NOT NULL REFERENCES sites(id),

    count_date DATE NOT NULL,
    count_type TEXT DEFAULT 'full' CHECK (count_type IN ('full', 'partial', 'spot', 'rolling')),

    status TEXT DEFAULT 'in_progress' CHECK (status IN (
        'planned', 'in_progress', 'pending_review', 'finalised', 'cancelled'
    )),

    is_blind BOOLEAN DEFAULT FALSE,

    expected_value DECIMAL(12,2),
    actual_value DECIMAL(12,2),
    variance_value DECIMAL(12,2),
    variance_percent DECIMAL(5,2),

    notes TEXT,

    started_by UUID REFERENCES profiles(id),
    started_at TIMESTAMPTZ,
    finalised_by UUID REFERENCES profiles(id),
    finalised_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_counts_company ON stock_counts(company_id);
CREATE INDEX idx_stock_counts_site ON stock_counts(site_id);
CREATE INDEX idx_stock_counts_date ON stock_counts(count_date DESC);

CREATE TABLE IF NOT EXISTS stock_count_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_count_id UUID NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
    storage_area_id UUID REFERENCES storage_areas(id),

    name TEXT NOT NULL,
    section_type TEXT,
    sort_order INTEGER DEFAULT 0,

    expected_value DECIMAL(12,2),
    actual_value DECIMAL(12,2),
    variance_value DECIMAL(12,2),

    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'reviewed')),

    counted_by UUID REFERENCES profiles(id),
    counted_at TIMESTAMPTZ
);

CREATE INDEX idx_count_sections_count ON stock_count_sections(stock_count_id);

CREATE TABLE IF NOT EXISTS stock_count_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_count_id UUID NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
    section_id UUID REFERENCES stock_count_sections(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES stock_items(id),

    expected_qty DECIMAL(12,4),
    expected_value DECIMAL(10,2),

    counted_qty DECIMAL(12,4),
    counted_value DECIMAL(10,2),

    variance_qty DECIMAL(12,4),
    variance_value DECIMAL(10,2),

    count_method TEXT DEFAULT 'manual' CHECK (count_method IN ('manual', 'photo', 'scale', 'barcode')),
    photo_url TEXT,

    notes TEXT,

    counted_by UUID REFERENCES profiles(id),
    counted_at TIMESTAMPTZ
);

CREATE INDEX idx_count_lines_count ON stock_count_lines(stock_count_id);
CREATE INDEX idx_count_lines_section ON stock_count_lines(section_id);

-- ============================================================================
-- TRANSFERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),

    from_site_id UUID NOT NULL REFERENCES sites(id),
    to_site_id UUID NOT NULL REFERENCES sites(id),

    transfer_date DATE NOT NULL,
    transfer_number TEXT,

    transfer_type TEXT DEFAULT 'transfer' CHECK (transfer_type IN ('transfer', 'internal_sale')),

    markup_percent DECIMAL(5,2) DEFAULT 0,
    subtotal DECIMAL(12,2),
    total DECIMAL(12,2),

    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'sent', 'in_transit', 'received', 'disputed', 'cancelled'
    )),

    notes TEXT,

    created_by UUID REFERENCES profiles(id),
    sent_at TIMESTAMPTZ,
    received_by UUID REFERENCES profiles(id),
    received_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transfers_company ON transfers(company_id);
CREATE INDEX idx_transfers_from ON transfers(from_site_id);
CREATE INDEX idx_transfers_to ON transfers(to_site_id);

CREATE TABLE IF NOT EXISTS transfer_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES stock_items(id),

    quantity DECIMAL(12,4) NOT NULL,
    unit_cost DECIMAL(10,4),
    line_cost DECIMAL(10,2),

    markup_amount DECIMAL(10,2),
    line_total DECIMAL(10,2),

    qty_received DECIMAL(12,4),
    variance_notes TEXT,

    notes TEXT
);

CREATE INDEX idx_transfer_lines_transfer ON transfer_lines(transfer_id);
```

### Step 7: Create recipes tables

```sql
-- ============================================================================
-- RECIPES
-- ============================================================================
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),

    name TEXT NOT NULL,
    code TEXT,
    description TEXT,

    recipe_type TEXT NOT NULL CHECK (recipe_type IN (
        'menu_item', 'sub_recipe', 'prep_item', 'batch'
    )),

    category_id UUID REFERENCES stock_categories(id),

    output_qty DECIMAL(10,3) NOT NULL,
    output_unit_id UUID NOT NULL REFERENCES uom(id),
    portion_size DECIMAL(10,3),
    portions_per_batch DECIMAL(10,2),

    yield_percent DECIMAL(5,2) DEFAULT 100.00,
    yield_notes TEXT,

    creates_stock_item_id UUID REFERENCES stock_items(id),

    ingredient_cost DECIMAL(10,2),
    cost_per_portion DECIMAL(10,4),
    cost_updated_at TIMESTAMPTZ,

    menu_price DECIMAL(10,2),
    target_gp_percent DECIMAL(5,2) DEFAULT 70.00,
    actual_gp_percent DECIMAL(5,2),

    method_steps JSONB,
    prep_time_mins INTEGER,
    cook_time_mins INTEGER,

    pos_product_id TEXT,
    pos_category TEXT,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, name)
);

CREATE INDEX idx_recipes_company ON recipes(company_id);
CREATE INDEX idx_recipes_type ON recipes(recipe_type);
CREATE INDEX idx_recipes_creates_stock ON recipes(creates_stock_item_id);
CREATE INDEX idx_recipes_pos ON recipes(pos_product_id);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,

    stock_item_id UUID REFERENCES stock_items(id),
    sub_recipe_id UUID REFERENCES recipes(id),

    quantity DECIMAL(10,4) NOT NULL,
    unit_id UUID NOT NULL REFERENCES uom(id),

    prep_notes TEXT,

    unit_cost DECIMAL(10,4),
    line_cost DECIMAL(10,2),

    sort_order INTEGER DEFAULT 0,

    CONSTRAINT ingredient_type CHECK (
        (stock_item_id IS NOT NULL AND sub_recipe_id IS NULL) OR
        (stock_item_id IS NULL AND sub_recipe_id IS NOT NULL)
    ),
    CONSTRAINT no_self_reference CHECK (sub_recipe_id != recipe_id)
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_stock ON recipe_ingredients(stock_item_id);
CREATE INDEX idx_recipe_ingredients_sub ON recipe_ingredients(sub_recipe_id);

-- Circular reference guard
CREATE OR REPLACE FUNCTION check_recipe_circular_ref()
RETURNS TRIGGER AS $$
DECLARE
    v_chain UUID[];
    v_current UUID;
BEGIN
    IF NEW.sub_recipe_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_chain := ARRAY[NEW.recipe_id];
    v_current := NEW.sub_recipe_id;

    WHILE v_current IS NOT NULL LOOP
        IF v_current = ANY(v_chain) THEN
            RAISE EXCEPTION 'Circular recipe reference detected: % would create a loop',
                array_to_string(v_chain || v_current, ' -> ');
        END IF;

        v_chain := v_chain || v_current;

        SELECT DISTINCT ri.sub_recipe_id INTO v_current
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = v_current
          AND ri.sub_recipe_id IS NOT NULL
        LIMIT 1;

        IF array_length(v_chain, 1) > 20 THEN
            RAISE EXCEPTION 'Recipe chain too deep (>20 levels)';
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recipe_circular_check
BEFORE INSERT OR UPDATE ON recipe_ingredients
FOR EACH ROW EXECUTE FUNCTION check_recipe_circular_ref();
```

### Step 8: Create POS integration tables

```sql
-- ============================================================================
-- POS SALES
-- ============================================================================
CREATE TABLE IF NOT EXISTS pos_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    site_id UUID NOT NULL REFERENCES sites(id),

    pos_provider TEXT NOT NULL,
    pos_transaction_id TEXT NOT NULL,

    sale_date DATE NOT NULL,
    sale_time TIME,

    subtotal DECIMAL(10,2),
    tax DECIMAL(10,2),
    total DECIMAL(10,2),

    is_staff_sale BOOLEAN DEFAULT FALSE,
    staff_discount_percent DECIMAL(5,2),

    synced_at TIMESTAMPTZ DEFAULT NOW(),
    drawdown_processed BOOLEAN DEFAULT FALSE,
    drawdown_processed_at TIMESTAMPTZ,

    raw_data JSONB,

    UNIQUE(site_id, pos_provider, pos_transaction_id)
);

CREATE INDEX idx_pos_sales_site ON pos_sales(site_id);
CREATE INDEX idx_pos_sales_date ON pos_sales(sale_date DESC);
CREATE INDEX idx_pos_sales_pending ON pos_sales(drawdown_processed) WHERE drawdown_processed = FALSE;

CREATE TABLE IF NOT EXISTS pos_sale_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pos_sale_id UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,

    pos_product_id TEXT,
    pos_product_name TEXT,

    recipe_id UUID REFERENCES recipes(id),

    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2),
    line_total DECIMAL(10,2),

    cost_of_goods DECIMAL(10,2),
    gross_profit DECIMAL(10,2),
    gp_percent DECIMAL(5,2)
);

CREATE INDEX idx_pos_sale_lines_sale ON pos_sale_lines(pos_sale_id);
CREATE INDEX idx_pos_sale_lines_recipe ON pos_sale_lines(recipe_id);

-- ============================================================================
-- AI PROCESSING QUEUE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),

    process_type TEXT NOT NULL CHECK (process_type IN (
        'invoice_extract', 'label_scan', 'count_photo', 'waste_photo'
    )),

    image_urls TEXT[] NOT NULL,
    context JSONB,

    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'needs_review'
    )),

    result JSONB,
    confidence DECIMAL(3,2),
    error_message TEXT,

    result_type TEXT,
    result_id UUID,

    processed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_queue_company ON ai_processing_queue(company_id);
CREATE INDEX idx_ai_queue_status ON ai_processing_queue(status) WHERE status = 'pending';
```

### Step 9: RLS Policies

```sql
-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Helper function for company access
CREATE OR REPLACE FUNCTION stockly_company_access(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.company_id = p_company_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable RLS on all Stockly tables
ALTER TABLE storage_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_log_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_count_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_count_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sale_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_processing_queue ENABLE ROW LEVEL SECURITY;

-- Company-scoped tables
CREATE POLICY suppliers_company ON suppliers FOR ALL
    USING (stockly_company_access(company_id));
CREATE POLICY stock_categories_company ON stock_categories FOR ALL
    USING (stockly_company_access(company_id));
CREATE POLICY stock_items_company ON stock_items FOR ALL
    USING (stockly_company_access(company_id));
CREATE POLICY stock_movements_company ON stock_movements FOR ALL
    USING (stockly_company_access(company_id));
CREATE POLICY deliveries_company ON deliveries FOR ALL
    USING (stockly_company_access(company_id));
CREATE POLICY purchase_orders_company ON purchase_orders FOR ALL
    USING (stockly_company_access(company_id));
CREATE POLICY waste_logs_company ON waste_logs FOR ALL
    USING (stockly_company_access(company_id));
CREATE POLICY stock_counts_company ON stock_counts FOR ALL
    USING (stockly_company_access(company_id));
CREATE POLICY recipes_company ON recipes FOR ALL
    USING (stockly_company_access(company_id));
CREATE POLICY transfers_company ON transfers FOR ALL
    USING (stockly_company_access(company_id));
CREATE POLICY pos_sales_company ON pos_sales FOR ALL
    USING (stockly_company_access(company_id));
CREATE POLICY ai_queue_company ON ai_processing_queue FOR ALL
    USING (stockly_company_access(company_id));

-- Site-joined tables (use site to get company)
CREATE POLICY storage_areas_site ON storage_areas FOR ALL USING (
    EXISTS (
        SELECT 1 FROM sites s
        JOIN profiles p ON p.company_id = s.company_id
        WHERE s.id = storage_areas.site_id AND p.id = auth.uid()
    )
);
CREATE POLICY stock_levels_site ON stock_levels FOR ALL USING (
    EXISTS (
        SELECT 1 FROM sites s
        JOIN profiles p ON p.company_id = s.company_id
        WHERE s.id = stock_levels.site_id AND p.id = auth.uid()
    )
);

-- Child tables (inherit from parent)
CREATE POLICY product_variants_parent ON product_variants FOR ALL USING (
    EXISTS (
        SELECT 1 FROM stock_items si
        WHERE si.id = product_variants.stock_item_id
          AND stockly_company_access(si.company_id)
    )
);
CREATE POLICY price_history_parent ON price_history FOR ALL USING (
    EXISTS (
        SELECT 1 FROM product_variants pv
        JOIN stock_items si ON si.id = pv.stock_item_id
        WHERE pv.id = price_history.product_variant_id
          AND stockly_company_access(si.company_id)
    )
);
CREATE POLICY delivery_lines_parent ON delivery_lines FOR ALL USING (
    EXISTS (
        SELECT 1 FROM deliveries d
        WHERE d.id = delivery_lines.delivery_id
          AND stockly_company_access(d.company_id)
    )
);
CREATE POLICY po_lines_parent ON purchase_order_lines FOR ALL USING (
    EXISTS (
        SELECT 1 FROM purchase_orders po
        WHERE po.id = purchase_order_lines.purchase_order_id
          AND stockly_company_access(po.company_id)
    )
);
CREATE POLICY waste_lines_parent ON waste_log_lines FOR ALL USING (
    EXISTS (
        SELECT 1 FROM waste_logs wl
        WHERE wl.id = waste_log_lines.waste_log_id
          AND stockly_company_access(wl.company_id)
    )
);
CREATE POLICY count_sections_parent ON stock_count_sections FOR ALL USING (
    EXISTS (
        SELECT 1 FROM stock_counts sc
        WHERE sc.id = stock_count_sections.stock_count_id
          AND stockly_company_access(sc.company_id)
    )
);
CREATE POLICY count_lines_parent ON stock_count_lines FOR ALL USING (
    EXISTS (
        SELECT 1 FROM stock_counts sc
        WHERE sc.id = stock_count_lines.stock_count_id
          AND stockly_company_access(sc.company_id)
    )
);
CREATE POLICY recipe_ingredients_parent ON recipe_ingredients FOR ALL USING (
    EXISTS (
        SELECT 1 FROM recipes r
        WHERE r.id = recipe_ingredients.recipe_id
          AND stockly_company_access(r.company_id)
    )
);
CREATE POLICY transfer_lines_parent ON transfer_lines FOR ALL USING (
    EXISTS (
        SELECT 1 FROM transfers t
        WHERE t.id = transfer_lines.transfer_id
          AND stockly_company_access(t.company_id)
    )
);
CREATE POLICY pos_sale_lines_parent ON pos_sale_lines FOR ALL USING (
    EXISTS (
        SELECT 1 FROM pos_sales ps
        WHERE ps.id = pos_sale_lines.pos_sale_id
          AND stockly_company_access(ps.company_id)
    )
);
```

---

## WhatsApp Order Generation

```sql
-- Function to generate WhatsApp order message
CREATE OR REPLACE FUNCTION generate_whatsapp_order(p_po_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_supplier RECORD;
    v_site_name TEXT;
    v_order RECORD;
    v_lines RECORD;
    v_message TEXT;
    v_whatsapp_number TEXT;
BEGIN
    -- Get order details
    SELECT po.*, s.name as site_name, sup.name as supplier_name,
           sup.ordering_config->>'whatsapp_number' as whatsapp_number
    INTO v_order
    FROM purchase_orders po
    JOIN sites s ON s.id = po.site_id
    JOIN suppliers sup ON sup.id = po.supplier_id
    WHERE po.id = p_po_id;

    IF v_order IS NULL THEN
        RETURN jsonb_build_object('error', 'Order not found');
    END IF;

    v_whatsapp_number := v_order.whatsapp_number;

    -- Build message
    v_message := format(E'🛒 ORDER from %s\n📅 Date: %s\n📦 Supplier: %s\n\n━━━━━━━━━━━━━━━\n',
        v_order.site_name,
        to_char(v_order.order_date, 'DD/MM/YYYY'),
        v_order.supplier_name
    );

    -- Add line items
    FOR v_lines IN
        SELECT pv.product_name, pol.quantity_ordered, u.abbreviation
        FROM purchase_order_lines pol
        JOIN product_variants pv ON pv.id = pol.product_variant_id
        JOIN uom u ON u.id = pv.pack_unit_id
        WHERE pol.purchase_order_id = p_po_id
        ORDER BY pv.product_name
    LOOP
        v_message := v_message || format(E'• %s × %s %s\n',
            v_lines.product_name,
            TRIM(TO_CHAR(v_lines.quantity_ordered, '999990.##')),
            v_lines.abbreviation
        );
    END LOOP;

    v_message := v_message || E'\n━━━━━━━━━━━━━━━\n';
    v_message := v_message || E'Please confirm delivery date.\nThank you! 🙏';

    -- Update PO with message
    UPDATE purchase_orders
    SET sent_message = v_message
    WHERE id = p_po_id;

    RETURN jsonb_build_object(
        'message', v_message,
        'whatsapp_number', v_whatsapp_number,
        'whatsapp_url', format('https://wa.me/%s?text=%s',
            REPLACE(REPLACE(v_whatsapp_number, '+', ''), ' ', ''),
            url_encode(v_message)
        )
    );
END;
$$ LANGUAGE plpgsql;

-- URL encode helper
CREATE OR REPLACE FUNCTION url_encode(text) RETURNS TEXT AS $$
SELECT string_agg(
    CASE
        WHEN char ~ '[a-zA-Z0-9._~-]' THEN char
        ELSE '%' || upper(encode(char::bytea, 'hex'))
    END, ''
)
FROM regexp_split_to_table($1, '') AS char;
$$ LANGUAGE sql IMMUTABLE;
```

---

## Next Steps

1. **Bruce verifies** existing schema with queries above
2. **Run migrations** in order (Steps 1-9)
3. **Test RLS** with different user roles
4. **Create first Stockly page** (Suppliers list)
5. **Build AI invoice upload** flow

Would you like me to create the actual migration files split into proper numbered migrations?
