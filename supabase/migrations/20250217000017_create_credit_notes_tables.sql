-- ============================================================================
-- Migration: Create Credit Notes Tables
-- Description: Credit note requests and lines for Stockly
-- ============================================================================

BEGIN;

-- ============================================================================
-- CREDIT NOTE REQUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_note_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    site_id UUID REFERENCES sites(id),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    delivery_id UUID REFERENCES deliveries(id),
    
    request_number TEXT NOT NULL,
    request_date DATE NOT NULL,
    
    subtotal DECIMAL(12,2) NOT NULL,
    vat DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'submitted', 'acknowledged', 'approved', 'disputed', 'received', 'closed'
    )),
    
    -- Submission tracking
    submitted_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES profiles(id),
    submitted_via TEXT CHECK (submitted_via IN ('email', 'phone', 'portal', 'whatsapp', 'other')),
    
    -- Supplier response
    supplier_cn_number TEXT,
    supplier_cn_date DATE,
    approved_amount DECIMAL(12,2),
    supplier_response_notes TEXT,
    
    -- Documents
    document_urls TEXT[],
    
    -- Metadata
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cn_requests_company ON credit_note_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_cn_requests_supplier ON credit_note_requests(supplier_id);
CREATE INDEX IF NOT EXISTS idx_cn_requests_delivery ON credit_note_requests(delivery_id);
CREATE INDEX IF NOT EXISTS idx_cn_requests_status ON credit_note_requests(status);
CREATE INDEX IF NOT EXISTS idx_cn_requests_date ON credit_note_requests(request_date DESC);
CREATE INDEX IF NOT EXISTS idx_cn_requests_number ON credit_note_requests(request_number);

-- ============================================================================
-- CREDIT NOTE LINES
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_note_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_request_id UUID NOT NULL REFERENCES credit_note_requests(id) ON DELETE CASCADE,
    delivery_line_id UUID REFERENCES delivery_lines(id),
    
    stock_item_id UUID REFERENCES stock_items(id),
    product_variant_id UUID REFERENCES product_variants(id),
    
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    
    vat_rate NUMERIC(5,2) DEFAULT 0,
    vat_amount DECIMAL(12,2) DEFAULT 0,
    line_total_inc_vat DECIMAL(12,2),
    
    reason TEXT NOT NULL CHECK (reason IN (
        'damaged', 'short_delivery', 'wrong_item', 'quality_issue',
        'temperature_breach', 'expired', 'wrong_spec', 'not_ordered',
        'overcharge', 'other'
    )),
    notes TEXT,
    photo_url TEXT,
    
    -- Approval tracking
    approved BOOLEAN DEFAULT FALSE,
    approved_quantity DECIMAL(10,3),
    approved_amount DECIMAL(12,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cn_lines_request ON credit_note_lines(credit_note_request_id);
CREATE INDEX IF NOT EXISTS idx_cn_lines_delivery_line ON credit_note_lines(delivery_line_id);
CREATE INDEX IF NOT EXISTS idx_cn_lines_stock_item ON credit_note_lines(stock_item_id);

-- ============================================================================
-- UPDATE DELIVERY_LINES FOR REJECTION TRACKING
-- ============================================================================
ALTER TABLE delivery_lines
  ADD COLUMN IF NOT EXISTS quantity_ordered DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS quantity_received DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS quantity_rejected DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT CHECK (rejection_reason IN (
    'damaged', 'short_delivery', 'wrong_item', 'quality_issue',
    'temperature_breach', 'expired', 'wrong_spec', 'not_ordered',
    'overcharge', 'other'
  )),
  ADD COLUMN IF NOT EXISTS rejection_notes TEXT,
  ADD COLUMN IF NOT EXISTS rejection_photo_url TEXT;

COMMENT ON COLUMN delivery_lines.quantity_ordered IS 'Original quantity ordered/invoiced';
COMMENT ON COLUMN delivery_lines.quantity_received IS 'Quantity actually received and accepted';
COMMENT ON COLUMN delivery_lines.quantity_rejected IS 'Quantity rejected and subject to credit note';

COMMIT;

