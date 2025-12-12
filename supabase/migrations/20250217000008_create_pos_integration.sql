-- ============================================================================
-- Migration: Create POS Integration Tables
-- Description: POS sales tracking and AI processing queue
-- ============================================================================

BEGIN;

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

CREATE INDEX IF NOT EXISTS idx_pos_sales_site ON pos_sales(site_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_date ON pos_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_pos_sales_pending ON pos_sales(drawdown_processed) WHERE drawdown_processed = FALSE;

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

CREATE INDEX IF NOT EXISTS idx_pos_sale_lines_sale ON pos_sale_lines(pos_sale_id);
CREATE INDEX IF NOT EXISTS idx_pos_sale_lines_recipe ON pos_sale_lines(recipe_id);

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

CREATE INDEX IF NOT EXISTS idx_ai_queue_company ON ai_processing_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_queue_status ON ai_processing_queue(status) WHERE status = 'pending';

COMMIT;

