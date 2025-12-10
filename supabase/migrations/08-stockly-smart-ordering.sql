-- ============================================================================
-- Migration: 08-stockly-smart-ordering.sql
-- Description: Delivery Areas, Buffer Stock & Smart Order Padding
-- Run AFTER migrations 01-07
-- ============================================================================

BEGIN;

-- ============================================================================
-- SUPPLIER DELIVERY AREAS
-- Different areas have different delivery schedules
-- ============================================================================

CREATE TABLE IF NOT EXISTS stockly.supplier_delivery_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES stockly.suppliers(id) ON DELETE CASCADE,
    
    -- Area definition
    area_name TEXT NOT NULL, -- 'Central London', 'Manchester', 'South West'
    postcode_patterns TEXT[], -- ['SW', 'SE', 'W1', 'EC'] - matches start of postcode
    
    -- Delivery schedule
    delivery_days TEXT[] NOT NULL DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    
    -- Timing
    lead_time_days INTEGER NOT NULL DEFAULT 1, -- Days from order to delivery
    order_cutoff_time TIME DEFAULT '14:00', -- Order by 2pm for next delivery
    
    -- Reliability
    uses_third_party_logistics BOOLEAN DEFAULT FALSE,
    average_delay_days NUMERIC(3,1) DEFAULT 0, -- Track actual vs expected
    reliability_score INTEGER DEFAULT 100, -- 0-100, updated from delivery history
    
    -- Notes
    notes TEXT, -- 'No deliveries during August', etc.
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ADD SHELF LIFE & USAGE TO STOCK ITEMS
-- ============================================================================

DO $$
BEGIN
    -- Shelf life for expiry-aware suggestions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'stockly' AND table_name = 'stock_items' AND column_name = 'shelf_life_days') THEN
        ALTER TABLE stockly.stock_items ADD COLUMN shelf_life_days INTEGER;
    END IF;
    
    -- Is perishable flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'stockly' AND table_name = 'stock_items' AND column_name = 'is_perishable') THEN
        ALTER TABLE stockly.stock_items ADD COLUMN is_perishable BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Average daily usage (calculated)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'stockly' AND table_name = 'stock_items' AND column_name = 'avg_daily_usage') THEN
        ALTER TABLE stockly.stock_items ADD COLUMN avg_daily_usage NUMERIC(12,3) DEFAULT 0;
    END IF;
    
    -- Days until reorder needed (calculated)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'stockly' AND table_name = 'stock_items' AND column_name = 'days_until_reorder') THEN
        ALTER TABLE stockly.stock_items ADD COLUMN days_until_reorder INTEGER;
    END IF;
    
    -- Last usage calculation date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'stockly' AND table_name = 'stock_items' AND column_name = 'usage_calculated_at') THEN
        ALTER TABLE stockly.stock_items ADD COLUMN usage_calculated_at TIMESTAMPTZ;
    END IF;
    
    -- Safety/buffer stock days
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'stockly' AND table_name = 'stock_items' AND column_name = 'safety_stock_days') THEN
        ALTER TABLE stockly.stock_items ADD COLUMN safety_stock_days INTEGER DEFAULT 2;
    END IF;
    
    -- Add reorder_point if it doesn't exist (for compatibility)
    -- This ensures we always have reorder_point column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'stockly' AND table_name = 'stock_items' AND column_name = 'reorder_point') THEN
        ALTER TABLE stockly.stock_items ADD COLUMN reorder_point DECIMAL(10,3);
    END IF;
END $$;

-- ============================================================================
-- ENSURE SUPPLIERS TABLE HAS REQUIRED COLUMNS
-- ============================================================================

DO $$
BEGIN
    -- Add lead_time_days if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'stockly' AND table_name = 'suppliers' AND column_name = 'lead_time_days') THEN
        ALTER TABLE stockly.suppliers ADD COLUMN lead_time_days INTEGER DEFAULT 1;
    END IF;
    
    -- Add unit_price to product_variants if it doesn't exist (for compatibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'stockly' AND table_name = 'product_variants' AND column_name = 'unit_price') THEN
        -- Try to copy from current_price if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'stockly' AND table_name = 'product_variants' AND column_name = 'current_price') THEN
            ALTER TABLE stockly.product_variants ADD COLUMN unit_price DECIMAL(10,2);
            UPDATE stockly.product_variants SET unit_price = current_price WHERE current_price IS NOT NULL;
        ELSE
            ALTER TABLE stockly.product_variants ADD COLUMN unit_price DECIMAL(10,2);
        END IF;
    END IF;
END $$;

-- ============================================================================
-- ADD SITE LOCATION FOR DELIVERY MATCHING
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'sites' AND column_name = 'postcode') THEN
        ALTER TABLE public.sites ADD COLUMN postcode TEXT;
    END IF;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_supplier_delivery_areas_supplier ON stockly.supplier_delivery_areas(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_delivery_areas_active ON stockly.supplier_delivery_areas(supplier_id, is_active);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE stockly.supplier_delivery_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stockly_delivery_areas_all" ON stockly.supplier_delivery_areas;
CREATE POLICY "stockly_delivery_areas_all" ON stockly.supplier_delivery_areas FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM stockly.suppliers s
            WHERE s.id = stockly.supplier_delivery_areas.supplier_id
            AND stockly.stockly_company_access(s.company_id)
        )
    );

-- ============================================================================
-- FUNCTION: Calculate average daily usage
-- ============================================================================

DROP FUNCTION IF EXISTS stockly.calculate_item_usage(UUID, INTEGER);

CREATE OR REPLACE FUNCTION stockly.calculate_item_usage(
    p_stock_item_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS NUMERIC AS $$
DECLARE
    v_total_usage NUMERIC := 0;
    v_sales_usage NUMERIC := 0;
    v_waste_usage NUMERIC := 0;
    v_transfer_usage NUMERIC := 0;
BEGIN
    -- Usage from sales (via recipes)
    SELECT COALESCE(SUM(
        si.quantity * COALESCE(ri.quantity, 0)
    ), 0)
    INTO v_sales_usage
    FROM stockly.sale_items si
    JOIN stockly.sales s ON s.id = si.sale_id
    LEFT JOIN stockly.recipes r ON r.pos_item_code = si.plu_code OR r.id = si.recipe_id
    LEFT JOIN stockly.recipe_ingredients ri ON ri.recipe_id = r.id AND ri.stock_item_id = p_stock_item_id
    WHERE s.sale_date >= CURRENT_DATE - p_days
    AND si.company_id = (SELECT company_id FROM stockly.stock_items WHERE id = p_stock_item_id);
    
    -- Usage from wastage
    SELECT COALESCE(SUM(wll.quantity), 0)
    INTO v_waste_usage
    FROM stockly.waste_log_lines wll
    JOIN stockly.waste_logs wl ON wl.id = wll.waste_log_id
    WHERE wll.stock_item_id = p_stock_item_id
    AND wl.waste_date >= CURRENT_DATE - p_days;
    
    -- Usage from staff purchases/transfers
    SELECT COALESCE(SUM(sti.quantity), 0)
    INTO v_transfer_usage
    FROM stockly.stock_transfer_items sti
    JOIN stockly.stock_transfers st ON st.id = sti.transfer_id
    WHERE sti.stock_item_id = p_stock_item_id
    AND st.transfer_date >= CURRENT_DATE - p_days
    AND st.status = 'completed';
    
    v_total_usage := v_sales_usage + v_waste_usage + v_transfer_usage;
    
    -- Return daily average
    RETURN ROUND(v_total_usage / p_days, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Update all item usage stats
-- ============================================================================

DROP FUNCTION IF EXISTS stockly.update_usage_stats(UUID);

CREATE OR REPLACE FUNCTION stockly.update_usage_stats(p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_item RECORD;
    v_count INTEGER := 0;
    v_daily_usage NUMERIC;
    v_current_qty NUMERIC;
    v_days_until NUMERIC;
BEGIN
    FOR v_item IN 
        SELECT si.id, si.reorder_point as reorder_level, sl.quantity as current_qty
        FROM stockly.stock_items si
        LEFT JOIN stockly.stock_levels sl ON sl.stock_item_id = si.id
        WHERE si.company_id = p_company_id
        AND si.is_active = true
    LOOP
        -- Calculate usage
        v_daily_usage := stockly.calculate_item_usage(v_item.id, 30);
        v_current_qty := COALESCE(v_item.current_qty, 0);
        
        -- Calculate days until reorder needed
        IF v_daily_usage > 0 AND v_item.reorder_level IS NOT NULL THEN
            v_days_until := FLOOR((v_current_qty - v_item.reorder_level) / v_daily_usage);
        ELSE
            v_days_until := NULL;
        END IF;
        
        -- Update item
        UPDATE stockly.stock_items
        SET 
            avg_daily_usage = v_daily_usage,
            days_until_reorder = v_days_until,
            usage_calculated_at = NOW()
        WHERE id = v_item.id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get next delivery date for supplier/site
-- ============================================================================

DROP FUNCTION IF EXISTS stockly.get_next_delivery_date(UUID, UUID);

CREATE OR REPLACE FUNCTION stockly.get_next_delivery_date(
    p_supplier_id UUID,
    p_site_id UUID
)
RETURNS TABLE (
    next_delivery_date DATE,
    order_by_date DATE,
    order_by_time TIME,
    lead_time_days INTEGER,
    area_name TEXT,
    uses_third_party BOOLEAN
) AS $$
DECLARE
    v_site_postcode TEXT;
    v_area RECORD;
    v_check_date DATE;
    v_day_name TEXT;
    v_found BOOLEAN := FALSE;
BEGIN
    -- Get site postcode
    SELECT postcode INTO v_site_postcode
    FROM public.sites WHERE id = p_site_id;
    
    -- Find matching delivery area
    SELECT * INTO v_area
    FROM stockly.supplier_delivery_areas sda
    WHERE sda.supplier_id = p_supplier_id
    AND sda.is_active = true
    AND (
        sda.postcode_patterns IS NULL 
        OR EXISTS (
            SELECT 1 FROM unnest(sda.postcode_patterns) pattern
            WHERE v_site_postcode ILIKE pattern || '%'
        )
    )
    LIMIT 1;
    
    -- If no specific area, use supplier defaults
    IF v_area IS NULL THEN
        SELECT 
            s.lead_time_days,
            s.delivery_days
        INTO v_area
        FROM stockly.suppliers s
        WHERE s.id = p_supplier_id;
        
        IF v_area IS NULL THEN
            -- No delivery info, assume next day
            RETURN QUERY SELECT 
                CURRENT_DATE + 1,
                CURRENT_DATE,
                '14:00'::TIME,
                1,
                'Default'::TEXT,
                FALSE;
            RETURN;
        END IF;
    END IF;
    
    -- Find next delivery day
    v_check_date := CURRENT_DATE + COALESCE(v_area.lead_time_days, 1);
    
    FOR i IN 1..14 LOOP -- Check next 2 weeks
        v_day_name := LOWER(TO_CHAR(v_check_date, 'day'));
        v_day_name := TRIM(v_day_name);
        
        IF v_area.delivery_days IS NULL OR v_day_name = ANY(v_area.delivery_days) THEN
            v_found := TRUE;
            EXIT;
        END IF;
        
        v_check_date := v_check_date + 1;
    END LOOP;
    
    IF NOT v_found THEN
        v_check_date := CURRENT_DATE + COALESCE(v_area.lead_time_days, 1);
    END IF;
    
    RETURN QUERY SELECT 
        v_check_date,
        v_check_date - COALESCE(v_area.lead_time_days, 1),
        COALESCE(v_area.order_cutoff_time, '14:00'::TIME),
        COALESCE(v_area.lead_time_days, 1),
        COALESCE(v_area.area_name, 'Default'),
        COALESCE(v_area.uses_third_party_logistics, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get smart order suggestions
-- ============================================================================

DROP FUNCTION IF EXISTS stockly.get_order_padding_suggestions(UUID, UUID, NUMERIC);

CREATE OR REPLACE FUNCTION stockly.get_order_padding_suggestions(
    p_supplier_id UUID,
    p_company_id UUID,
    p_shortfall NUMERIC -- How much £ needed to reach minimum
)
RETURNS TABLE (
    stock_item_id UUID,
    item_name TEXT,
    current_quantity NUMERIC,
    suggested_quantity NUMERIC,
    unit_price NUMERIC,
    line_total NUMERIC,
    stock_unit TEXT,
    shelf_life_days INTEGER,
    is_perishable BOOLEAN,
    days_until_reorder INTEGER,
    avg_daily_usage NUMERIC,
    suggestion_reason TEXT,
    priority_score INTEGER -- Higher = better suggestion
) AS $$
BEGIN
    RETURN QUERY
    WITH item_scores AS (
        SELECT 
            si.id,
            si.name,
            COALESCE(sl.quantity, 0) as current_qty,
            -- Suggest quantity: amount to reach par, or standard reorder
            GREATEST(0, COALESCE(si.par_level, COALESCE(si.reorder_point, 0) * 2, 10) - COALESCE(sl.quantity, 0)) as suggest_qty,
            COALESCE(pv.unit_price, 0) as price,
            'ea' as stock_unit,
            si.shelf_life_days,
            si.is_perishable,
            si.days_until_reorder,
            si.avg_daily_usage,
            -- Calculate priority score (higher = better to add)
            (
                -- Long shelf life = good (up to 30 points)
                LEAST(30, COALESCE(si.shelf_life_days, 30) / 10) +
                -- Not perishable = good (20 points)
                CASE WHEN COALESCE(si.is_perishable, false) = false THEN 20 ELSE 0 END +
                -- Will need soon anyway = good (up to 30 points)
                CASE 
                    WHEN si.days_until_reorder IS NULL THEN 10
                    WHEN si.days_until_reorder <= 7 THEN 30
                    WHEN si.days_until_reorder <= 14 THEN 25
                    WHEN si.days_until_reorder <= 21 THEN 20
                    WHEN si.days_until_reorder <= 30 THEN 15
                    ELSE 5
                END +
                -- Below par/reorder = good (20 points)
                CASE 
                    WHEN COALESCE(sl.quantity, 0) <= COALESCE(si.reorder_point, 0) THEN 20
                    WHEN COALESCE(sl.quantity, 0) <= COALESCE(si.par_level, COALESCE(si.reorder_point, 0) * 1.5, 0) THEN 10
                    ELSE 0
                END +
                -- High usage item = good (up to 20 points)
                LEAST(20, COALESCE(si.avg_daily_usage, 0) * 2)
            )::INTEGER as priority
        FROM stockly.stock_items si
        LEFT JOIN stockly.stock_levels sl ON sl.stock_item_id = si.id
        INNER JOIN stockly.product_variants pv ON pv.stock_item_id = si.id AND pv.supplier_id = p_supplier_id
        WHERE si.company_id = p_company_id
        AND si.is_active = true
        -- Exclude items already at or above par
        AND (
            COALESCE(sl.quantity, 0) < COALESCE(si.par_level, COALESCE(si.reorder_point, 0) * 2, 999999)
        )
    )
    SELECT 
        iss.id as stock_item_id,
        iss.name as item_name,
        iss.current_qty as current_quantity,
        iss.suggest_qty as suggested_quantity,
        iss.price as unit_price,
        ROUND(iss.suggest_qty * iss.price, 2) as line_total,
        iss.stock_unit,
        iss.shelf_life_days,
        iss.is_perishable,
        iss.days_until_reorder,
        iss.avg_daily_usage,
        -- Generate reason text
        CASE
            WHEN iss.days_until_reorder <= 7 THEN 'Needed in ' || iss.days_until_reorder || ' days'
            WHEN iss.days_until_reorder <= 14 THEN 'Running low, needed soon'
            WHEN iss.current_qty <= 0 THEN 'Out of stock'
            WHEN COALESCE(iss.shelf_life_days, 0) >= 180 THEN 'Long shelf life (' || iss.shelf_life_days || ' days)'
            WHEN NOT COALESCE(iss.is_perishable, true) THEN 'Non-perishable, safe to stock'
            ELSE 'Below target level'
        END as suggestion_reason,
        iss.priority as priority_score
    FROM item_scores iss
    WHERE iss.suggest_qty > 0
    AND iss.price > 0
    ORDER BY iss.priority DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get cumulative suggestions to reach target
-- ============================================================================

DROP FUNCTION IF EXISTS stockly.get_suggestions_to_target(UUID, UUID, NUMERIC);

CREATE OR REPLACE FUNCTION stockly.get_suggestions_to_target(
    p_supplier_id UUID,
    p_company_id UUID,
    p_target_amount NUMERIC -- Target total to reach
)
RETURNS TABLE (
    stock_item_id UUID,
    item_name TEXT,
    suggested_quantity NUMERIC,
    unit_price NUMERIC,
    line_total NUMERIC,
    running_total NUMERIC,
    suggestion_reason TEXT,
    priority_score INTEGER,
    is_recommended BOOLEAN -- True if helps reach target without going way over
) AS $$
DECLARE
    v_current_total NUMERIC := 0;
BEGIN
    RETURN QUERY
    WITH suggestions AS (
        SELECT * FROM stockly.get_order_padding_suggestions(p_supplier_id, p_company_id, p_target_amount)
    ),
    cumulative AS (
        SELECT 
            s.*,
            SUM(s.line_total) OVER (ORDER BY s.priority_score DESC) as cum_total
        FROM suggestions s
    )
    SELECT 
        c.stock_item_id,
        c.item_name,
        c.suggested_quantity,
        c.unit_price,
        c.line_total,
        c.cum_total as running_total,
        c.suggestion_reason,
        c.priority_score,
        -- Recommend items that help reach target without going more than 20% over
        (c.cum_total <= p_target_amount * 1.2) as is_recommended
    FROM cumulative c
    ORDER BY c.priority_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEW: Items needing reorder with smart timing
-- ============================================================================

CREATE OR REPLACE VIEW stockly.v_smart_reorder_list AS
SELECT 
    si.id as stock_item_id,
    si.company_id,
    si.name as item_name,
    'ea' as stock_unit,
    COALESCE(sl.quantity, 0) as current_quantity,
    si.reorder_point,
    si.par_level,
    si.avg_daily_usage,
    si.days_until_reorder,
    si.safety_stock_days,
    si.shelf_life_days,
    si.is_perishable,
    pv.supplier_id as preferred_supplier_id,
    sup.name as supplier_name,
    COALESCE(sup.lead_time_days, 1) as supplier_lead_time,
    COALESCE(pv.unit_price, 0) as unit_price,
    -- Urgency calculation
    CASE
        WHEN COALESCE(sl.quantity, 0) = 0 THEN 'critical'
        WHEN si.days_until_reorder IS NOT NULL AND si.days_until_reorder <= 0 THEN 'critical'
        WHEN si.days_until_reorder IS NOT NULL AND si.days_until_reorder <= COALESCE(sup.lead_time_days, 1) THEN 'urgent'
        WHEN si.days_until_reorder IS NOT NULL AND si.days_until_reorder <= COALESCE(sup.lead_time_days, 1) + COALESCE(si.safety_stock_days, 2) THEN 'soon'
        WHEN COALESCE(sl.quantity, 0) <= COALESCE(si.reorder_point, 0) THEN 'low'
        ELSE 'ok'
    END as urgency,
    -- Recommended order date (accounting for lead time)
    CASE 
        WHEN si.days_until_reorder IS NOT NULL 
        THEN CURRENT_DATE + GREATEST(0, si.days_until_reorder - COALESCE(sup.lead_time_days, 1) - COALESCE(si.safety_stock_days, 2))
        ELSE CURRENT_DATE
    END as recommended_order_date
FROM stockly.stock_items si
LEFT JOIN stockly.stock_levels sl ON sl.stock_item_id = si.id
LEFT JOIN stockly.product_variants pv ON pv.stock_item_id = si.id AND pv.is_preferred = true
LEFT JOIN stockly.suppliers sup ON sup.id = pv.supplier_id
WHERE si.is_active = true
AND si.reorder_point IS NOT NULL
AND COALESCE(sl.quantity, 0) <= COALESCE(si.par_level, si.reorder_point * 1.5)
ORDER BY 
    CASE 
        WHEN COALESCE(sl.quantity, 0) = 0 THEN 0
        WHEN si.days_until_reorder IS NULL THEN 2
        ELSE si.days_until_reorder 
    END;

-- ============================================================================
-- FUNCTION: Generate PO number (if not exists)
-- ============================================================================

DROP FUNCTION IF EXISTS stockly.generate_po_number(UUID);

CREATE OR REPLACE FUNCTION stockly.generate_po_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INTEGER;
    v_year TEXT;
    v_po_number TEXT;
BEGIN
    v_year := TO_CHAR(NOW(), 'YY');
    
    SELECT COUNT(*) + 1 INTO v_count
    FROM purchase_orders
    WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    
    v_po_number := 'PO-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
    
    RETURN v_po_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Update PO totals (if not exists)
-- ============================================================================

DROP FUNCTION IF EXISTS stockly.update_po_totals(UUID);

CREATE OR REPLACE FUNCTION stockly.update_po_totals(p_po_id UUID)
RETURNS VOID AS $$
DECLARE
    v_subtotal NUMERIC;
    v_vat NUMERIC;
    v_total NUMERIC;
BEGIN
    SELECT 
        COALESCE(SUM(line_total), 0),
        COALESCE(SUM(line_total), 0) * 0.2,
        COALESCE(SUM(line_total), 0) * 1.2
    INTO v_subtotal, v_vat, v_total
    FROM purchase_order_lines
    WHERE purchase_order_id = p_po_id;
    
    UPDATE purchase_orders
    SET 
        subtotal = v_subtotal,
        tax = v_vat,
        total = v_total,
        updated_at = NOW()
    WHERE id = p_po_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON stockly.supplier_delivery_areas TO authenticated;
GRANT SELECT ON stockly.v_smart_reorder_list TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.calculate_item_usage TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.update_usage_stats TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.get_next_delivery_date TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.get_order_padding_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.get_suggestions_to_target TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.generate_po_number TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.update_po_totals TO authenticated;

-- ============================================================================
-- PUBLIC SCHEMA WRAPPERS FOR SUPABASE RPC CALLS
-- Supabase's rpc() function only searches 'public' schema by default
-- These wrappers allow frontend to call functions without schema prefix
-- ============================================================================

-- Wrapper for get_next_delivery_date
DROP FUNCTION IF EXISTS public.get_next_delivery_date(UUID, UUID);
CREATE OR REPLACE FUNCTION public.get_next_delivery_date(
    p_supplier_id UUID,
    p_site_id UUID
)
RETURNS TABLE (
    next_delivery_date DATE,
    order_by_date DATE,
    order_by_time TIME,
    lead_time_days INTEGER,
    area_name TEXT,
    uses_third_party BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM stockly.get_next_delivery_date(p_supplier_id, p_site_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper for get_order_padding_suggestions
DROP FUNCTION IF EXISTS public.get_order_padding_suggestions(UUID, UUID, NUMERIC);
CREATE OR REPLACE FUNCTION public.get_order_padding_suggestions(
    p_supplier_id UUID,
    p_company_id UUID,
    p_shortfall NUMERIC
)
RETURNS TABLE (
    stock_item_id UUID,
    item_name TEXT,
    current_quantity NUMERIC,
    suggested_quantity NUMERIC,
    unit_price NUMERIC,
    line_total NUMERIC,
    stock_unit TEXT,
    shelf_life_days INTEGER,
    is_perishable BOOLEAN,
    days_until_reorder INTEGER,
    avg_daily_usage NUMERIC,
    suggestion_reason TEXT,
    priority_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM stockly.get_order_padding_suggestions(p_supplier_id, p_company_id, p_shortfall);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper for get_suggestions_to_target
DROP FUNCTION IF EXISTS public.get_suggestions_to_target(UUID, UUID, NUMERIC);
CREATE OR REPLACE FUNCTION public.get_suggestions_to_target(
    p_supplier_id UUID,
    p_company_id UUID,
    p_target_amount NUMERIC
)
RETURNS TABLE (
    stock_item_id UUID,
    item_name TEXT,
    suggested_quantity NUMERIC,
    unit_price NUMERIC,
    line_total NUMERIC,
    running_total NUMERIC,
    suggestion_reason TEXT,
    priority_score INTEGER,
    is_recommended BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM stockly.get_suggestions_to_target(p_supplier_id, p_company_id, p_target_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper for calculate_item_usage
DROP FUNCTION IF EXISTS public.calculate_item_usage(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.calculate_item_usage(
    p_stock_item_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS NUMERIC AS $$
BEGIN
    RETURN stockly.calculate_item_usage(p_stock_item_id, p_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper for update_usage_stats
DROP FUNCTION IF EXISTS public.update_usage_stats(UUID);
CREATE OR REPLACE FUNCTION public.update_usage_stats(p_company_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN stockly.update_usage_stats(p_company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper for generate_po_number
DROP FUNCTION IF EXISTS public.generate_po_number(UUID);
CREATE OR REPLACE FUNCTION public.generate_po_number(p_company_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN stockly.generate_po_number(p_company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper for update_po_totals
DROP FUNCTION IF EXISTS public.update_po_totals(UUID);
CREATE OR REPLACE FUNCTION public.update_po_totals(p_po_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM stockly.update_po_totals(p_po_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on public wrappers
GRANT EXECUTE ON FUNCTION public.get_next_delivery_date TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_padding_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_suggestions_to_target TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_item_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_usage_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_po_number TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_po_totals TO authenticated;

COMMIT;

SELECT 'Smart ordering system created successfully!' as status;

