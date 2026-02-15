-- ============================================================================
-- Migration: 07-stockly-transfers.sql
-- Description: Stock Transfers & Staff Sales
-- Run AFTER 01-06 migrations
-- ============================================================================

BEGIN;

-- ============================================================================
-- TRANSFER TYPES
-- ============================================================================
-- staff_purchase: Staff buying items
-- internal_use: Kitchen/staff meals
-- sample: Tastings, samples
-- event: Owner takes for external event
-- adjustment: General adjustments
-- transfer: Site-to-site transfer

-- ============================================================================
-- STOCK TRANSFERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stockly.stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    
    -- Transfer details
    transfer_type TEXT NOT NULL DEFAULT 'staff_purchase',
    transfer_number TEXT,
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- For staff purchases
    staff_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    staff_name TEXT, -- Fallback if no user account
    
    -- For site transfers
    from_site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    to_site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    
    -- Approval
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    
    -- Financials
    cost_total NUMERIC(12,2) DEFAULT 0, -- Total at cost price
    charge_total NUMERIC(12,2) DEFAULT 0, -- What staff pays (after discount)
    discount_percent NUMERIC(5,2) DEFAULT 0,
    
    -- Payment
    payment_method TEXT DEFAULT 'cash', -- cash, payroll, free
    payment_reference TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
    
    notes TEXT,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STOCK TRANSFER ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS stockly.stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES stockly.stock_transfers(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES stockly.stock_items(id) ON DELETE CASCADE,
    
    quantity NUMERIC(12,3) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'each',
    
    -- Pricing
    cost_price NUMERIC(10,4) NOT NULL DEFAULT 0, -- Cost per unit
    sell_price NUMERIC(10,4), -- Normal sell price per unit
    charge_price NUMERIC(10,4), -- What they're charged per unit (after discount)
    
    -- Calculated
    line_cost NUMERIC(12,2) GENERATED ALWAYS AS (quantity * cost_price) STORED,
    line_charge NUMERIC(12,2) GENERATED ALWAYS AS (quantity * COALESCE(charge_price, 0)) STORED,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_stockly_transfers_company ON stockly.stock_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_stockly_transfers_site ON stockly.stock_transfers(site_id);
CREATE INDEX IF NOT EXISTS idx_stockly_transfers_type ON stockly.stock_transfers(transfer_type);
CREATE INDEX IF NOT EXISTS idx_stockly_transfers_staff ON stockly.stock_transfers(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_stockly_transfers_date ON stockly.stock_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_stockly_transfer_items ON stockly.stock_transfer_items(transfer_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE stockly.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.stock_transfer_items ENABLE ROW LEVEL SECURITY;

-- Transfers RLS
DROP POLICY IF EXISTS "stockly_transfers_select" ON stockly.stock_transfers;
CREATE POLICY "stockly_transfers_select" ON stockly.stock_transfers
    FOR SELECT USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "stockly_transfers_insert" ON stockly.stock_transfers;
CREATE POLICY "stockly_transfers_insert" ON stockly.stock_transfers
    FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "stockly_transfers_update" ON stockly.stock_transfers;
CREATE POLICY "stockly_transfers_update" ON stockly.stock_transfers
    FOR UPDATE USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "stockly_transfers_delete" ON stockly.stock_transfers;
CREATE POLICY "stockly_transfers_delete" ON stockly.stock_transfers
    FOR DELETE USING (company_id IN (
        SELECT company_id FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Transfer Items RLS (via parent)
DROP POLICY IF EXISTS "stockly_transfer_items_all" ON stockly.stock_transfer_items;
CREATE POLICY "stockly_transfer_items_all" ON stockly.stock_transfer_items FOR ALL 
    USING (transfer_id IN (SELECT id FROM stockly.stock_transfers));

-- ============================================================================
-- HELPER FUNCTION: Generate Transfer Number
-- ============================================================================

DROP FUNCTION IF EXISTS stockly.generate_transfer_number(UUID, TEXT);

CREATE OR REPLACE FUNCTION stockly.generate_transfer_number(
    p_company_id UUID,
    p_type TEXT DEFAULT 'staff_purchase'
)
RETURNS TEXT AS $$
DECLARE
    v_count INTEGER;
    v_prefix TEXT;
    v_year TEXT;
BEGIN
    v_year := TO_CHAR(NOW(), 'YY');
    
    -- Set prefix based on type
    v_prefix := CASE p_type
        WHEN 'staff_purchase' THEN 'SP'
        WHEN 'internal_use' THEN 'IU'
        WHEN 'sample' THEN 'SM'
        WHEN 'event' THEN 'EV'
        WHEN 'transfer' THEN 'TR'
        ELSE 'TX'
    END;
    
    SELECT COUNT(*) + 1 INTO v_count
    FROM stockly.stock_transfers
    WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    
    RETURN v_prefix || '-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEW: Staff Purchase Summary
-- ============================================================================

CREATE OR REPLACE VIEW stockly.v_staff_purchases AS
SELECT 
    t.company_id,
    t.site_id,
    DATE_TRUNC('month', t.transfer_date)::DATE as month,
    t.staff_user_id,
    COALESCE(t.staff_name, 'Unknown') as staff_name,
    COUNT(*) as purchase_count,
    SUM(t.cost_total) as total_cost_value,
    SUM(t.charge_total) as total_charged,
    SUM(t.cost_total - t.charge_total) as total_discount_given,
    SUM(CASE WHEN t.payment_method = 'payroll' THEN t.charge_total ELSE 0 END) as payroll_deductions,
    SUM(CASE WHEN t.payment_method = 'free' THEN t.cost_total ELSE 0 END) as comped_value
FROM stockly.stock_transfers t
WHERE t.transfer_type = 'staff_purchase'
AND t.status = 'completed'
GROUP BY t.company_id, t.site_id, DATE_TRUNC('month', t.transfer_date), t.staff_user_id, t.staff_name;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON stockly.stock_transfers TO authenticated;
GRANT ALL ON stockly.stock_transfer_items TO authenticated;
GRANT SELECT ON stockly.v_staff_purchases TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.generate_transfer_number TO authenticated;

COMMIT;

SELECT 'Stock transfers system created successfully!' as status;
