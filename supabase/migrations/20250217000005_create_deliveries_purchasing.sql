-- ============================================================================
-- Migration: Create Deliveries and Purchasing Tables
-- Description: Purchase orders, deliveries, and delivery lines for Stockly
-- ============================================================================

BEGIN;

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

CREATE INDEX IF NOT EXISTS idx_deliveries_company ON deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_site ON deliveries(site_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_supplier ON deliveries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

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

CREATE INDEX IF NOT EXISTS idx_delivery_lines_delivery ON delivery_lines(delivery_id);

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

CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

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

CREATE INDEX IF NOT EXISTS idx_po_lines_po ON purchase_order_lines(purchase_order_id);

COMMIT;

