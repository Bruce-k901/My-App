-- ============================================================================
-- Migration: Create Waste, Counting, and Transfers Tables
-- Description: Waste logging, stock counts, and inter-site transfers
-- ============================================================================

BEGIN;

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

CREATE INDEX IF NOT EXISTS idx_waste_logs_company ON waste_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_waste_logs_site ON waste_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_waste_logs_date ON waste_logs(waste_date DESC);
CREATE INDEX IF NOT EXISTS idx_waste_logs_reason ON waste_logs(waste_reason);

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

CREATE INDEX IF NOT EXISTS idx_waste_lines_log ON waste_log_lines(waste_log_id);

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

CREATE INDEX IF NOT EXISTS idx_stock_counts_company ON stock_counts(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_site ON stock_counts(site_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_date ON stock_counts(count_date DESC);

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

CREATE INDEX IF NOT EXISTS idx_count_sections_count ON stock_count_sections(stock_count_id);

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

CREATE INDEX IF NOT EXISTS idx_count_lines_count ON stock_count_lines(stock_count_id);
CREATE INDEX IF NOT EXISTS idx_count_lines_section ON stock_count_lines(section_id);

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

CREATE INDEX IF NOT EXISTS idx_transfers_company ON transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_site_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_site_id);

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

CREATE INDEX IF NOT EXISTS idx_transfer_lines_transfer ON transfer_lines(transfer_id);

COMMIT;

