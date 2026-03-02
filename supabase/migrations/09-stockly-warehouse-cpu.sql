-- ============================================================================
-- Migration: 09-stockly-warehouse-cpu.sql
-- Description: Warehouse/CPU support, internal transfers, multi-tier pricing
-- Run AFTER migrations 01-08
-- ============================================================================

BEGIN;

-- ============================================================================
-- LOCATION TYPES
-- Extend sites to differentiate warehouses from venues
-- ============================================================================

DO $$
BEGIN
    -- Add location_type to sites (if not exists, or update constraint if different values exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'sites' AND column_name = 'location_type') THEN
        ALTER TABLE public.sites ADD COLUMN location_type TEXT DEFAULT 'venue';
    END IF;
    
    -- Update existing constraint if it exists with different values
    -- Drop old constraint if it exists with different values
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sites_location_type_check') THEN
        ALTER TABLE public.sites DROP CONSTRAINT IF EXISTS sites_location_type_check;
    END IF;
    
    -- Add/update constraint for location_type values
    -- Support both old values ('site', 'external') and new values ('venue', 'warehouse', 'cpu', 'hybrid')
    ALTER TABLE public.sites ADD CONSTRAINT sites_location_type_check 
        CHECK (location_type IN ('venue', 'warehouse', 'cpu', 'hybrid', 'site', 'external'));
    
    -- Migrate old 'site' values to 'venue' for consistency
    UPDATE public.sites SET location_type = 'venue' WHERE location_type = 'site';
    
    -- Can this location receive direct supplier deliveries?
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'sites' AND column_name = 'accepts_direct_delivery') THEN
        ALTER TABLE public.sites ADD COLUMN accepts_direct_delivery BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Parent warehouse (for venues that are supplied by a warehouse)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'sites' AND column_name = 'parent_warehouse_id') THEN
        ALTER TABLE public.sites ADD COLUMN parent_warehouse_id UUID REFERENCES public.sites(id);
    END IF;
END $$;

-- ============================================================================
-- SUPPLIER DELIVERY DESTINATIONS
-- Which suppliers deliver where, and at what price
-- ============================================================================

CREATE TABLE IF NOT EXISTS stockly.supplier_delivery_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES stockly.suppliers(id) ON DELETE CASCADE,
    
    -- Where can this supplier deliver?
    destination_type TEXT NOT NULL, -- 'warehouse_only', 'site_only', 'both'
    
    -- Specific sites (if restricted)
    allowed_site_ids UUID[], -- NULL = all sites of that type
    
    -- Minimum orders may differ by destination
    min_order_warehouse DECIMAL(10,2),
    min_order_site DECIMAL(10,2),
    
    -- Lead times may differ
    lead_time_warehouse INTEGER DEFAULT 1,
    lead_time_site INTEGER DEFAULT 2,
    
    -- Delivery charges may differ
    delivery_charge_warehouse DECIMAL(10,2) DEFAULT 0,
    delivery_charge_site DECIMAL(10,2) DEFAULT 0,
    free_delivery_threshold_warehouse DECIMAL(10,2),
    free_delivery_threshold_site DECIMAL(10,2),
    
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT supplier_destination_type_check 
        CHECK (destination_type IN ('warehouse_only', 'site_only', 'both'))
);

-- ============================================================================
-- PRODUCT VARIANT PRICING BY DESTINATION
-- Same product might have different prices for warehouse vs site delivery
-- ============================================================================

DO $$
BEGIN
    -- Price when delivered to warehouse (bulk)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'stockly' AND table_name = 'product_variants' AND column_name = 'warehouse_price') THEN
        ALTER TABLE stockly.product_variants ADD COLUMN warehouse_price DECIMAL(10,4);
    END IF;
    
    -- Price when delivered direct to site (often higher, smaller quantities)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'stockly' AND table_name = 'product_variants' AND column_name = 'site_price') THEN
        ALTER TABLE stockly.product_variants ADD COLUMN site_price DECIMAL(10,4);
    END IF;
    
    -- Can this product be delivered direct to site?
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'stockly' AND table_name = 'product_variants' AND column_name = 'allows_direct_to_site') THEN
        ALTER TABLE stockly.product_variants ADD COLUMN allows_direct_to_site BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Minimum order quantity for warehouse
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'stockly' AND table_name = 'product_variants' AND column_name = 'min_order_warehouse') THEN
        ALTER TABLE stockly.product_variants ADD COLUMN min_order_warehouse DECIMAL(10,3);
    END IF;
    
    -- Minimum order quantity for site
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'stockly' AND table_name = 'product_variants' AND column_name = 'min_order_site') THEN
        ALTER TABLE stockly.product_variants ADD COLUMN min_order_site DECIMAL(10,3);
    END IF;
END $$;

-- ============================================================================
-- INTERNAL TRANSFER PRICING
-- What sites "pay" when receiving from warehouse
-- ============================================================================

CREATE TABLE IF NOT EXISTS stockly.internal_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES stockly.stock_items(id) ON DELETE CASCADE,
    
    -- The internal transfer price (what sites are charged)
    transfer_price DECIMAL(10,4) NOT NULL,
    
    -- How was this price calculated?
    pricing_method TEXT NOT NULL DEFAULT 'markup_percentage',
    -- 'markup_percentage' = cost + X%
    -- 'markup_fixed' = cost + £X
    -- 'fixed_price' = always £X regardless of cost
    -- 'cost_plus_handling' = cost + handling rate per unit
    
    -- Markup details
    markup_percentage DECIMAL(5,2), -- e.g., 15.00 for 15%
    markup_fixed DECIMAL(10,4), -- e.g., 0.50 for 50p per unit
    
    -- Last cost used to calculate transfer price
    base_cost DECIMAL(10,4),
    
    -- When was price last updated
    price_updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Auto-update when supplier cost changes?
    auto_update_price BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, stock_item_id),
    
    CONSTRAINT pricing_method_check 
        CHECK (pricing_method IN ('markup_percentage', 'markup_fixed', 'fixed_price', 'cost_plus_handling'))
);

-- ============================================================================
-- COMPANY-LEVEL HANDLING/MARKUP DEFAULTS
-- ============================================================================

DO $$
BEGIN
    -- Default markup for internal transfers
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'default_internal_markup') THEN
        ALTER TABLE public.companies ADD COLUMN default_internal_markup DECIMAL(5,2) DEFAULT 15.00;
    END IF;
    
    -- Handling cost per unit (for CPU processing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'default_handling_cost') THEN
        ALTER TABLE public.companies ADD COLUMN default_handling_cost DECIMAL(10,4) DEFAULT 0;
    END IF;
END $$;

-- ============================================================================
-- INTERNAL TRANSFER ORDERS
-- Sites request stock from warehouse
-- ============================================================================

CREATE TABLE IF NOT EXISTS stockly.internal_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Order reference
    order_number TEXT NOT NULL,
    
    -- Who is ordering and from where
    requesting_site_id UUID NOT NULL REFERENCES public.sites(id),
    fulfilling_site_id UUID NOT NULL REFERENCES public.sites(id), -- warehouse/cpu
    
    -- Dates
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    requested_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Status workflow
    status TEXT NOT NULL DEFAULT 'draft',
    -- draft, submitted, confirmed, picking, dispatched, delivered, cancelled
    
    -- Totals (at internal transfer prices)
    subtotal DECIMAL(10,2) DEFAULT 0,
    
    -- Who handled it
    requested_by UUID REFERENCES auth.users(id),
    confirmed_by UUID REFERENCES auth.users(id),
    picked_by UUID REFERENCES auth.users(id),
    delivered_by UUID REFERENCES auth.users(id),
    
    -- Timestamps
    submitted_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    picking_started_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    notes TEXT,
    delivery_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT internal_order_status_check 
        CHECK (status IN ('draft', 'submitted', 'confirmed', 'picking', 'dispatched', 'delivered', 'cancelled')),
    CONSTRAINT different_sites_check
        CHECK (requesting_site_id != fulfilling_site_id)
);

-- ============================================================================
-- INTERNAL ORDER LINES
-- ============================================================================

CREATE TABLE IF NOT EXISTS stockly.internal_order_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_order_id UUID NOT NULL REFERENCES stockly.internal_orders(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES stockly.stock_items(id),
    
    -- Quantities
    requested_quantity DECIMAL(10,3) NOT NULL,
    confirmed_quantity DECIMAL(10,3), -- warehouse confirms availability
    picked_quantity DECIMAL(10,3), -- actual picked
    delivered_quantity DECIMAL(10,3), -- actual received
    
    -- Pricing
    transfer_price DECIMAL(10,4) NOT NULL, -- internal price at time of order
    line_total DECIMAL(10,2) GENERATED ALWAYS AS (COALESCE(delivered_quantity, picked_quantity, confirmed_quantity, requested_quantity) * transfer_price) STORED,
    
    -- For variance tracking
    quantity_variance DECIMAL(10,3) GENERATED ALWAYS AS (COALESCE(delivered_quantity, 0) - requested_quantity) STORED,
    
    -- Status
    status TEXT DEFAULT 'pending',
    -- pending, confirmed, picked, short, delivered, cancelled
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT internal_line_status_check 
        CHECK (status IN ('pending', 'confirmed', 'picked', 'short', 'delivered', 'cancelled'))
);

-- ============================================================================
-- STANDING ORDERS / PAR LEVEL REQUESTS
-- Automated internal orders based on site par levels
-- ============================================================================

CREATE TABLE IF NOT EXISTS stockly.standing_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES public.sites(id),
    stock_item_id UUID NOT NULL REFERENCES stockly.stock_items(id),
    
    -- Delivery schedule
    delivery_days TEXT[] NOT NULL, -- ['monday', 'wednesday', 'friday']
    
    -- Order type
    order_type TEXT NOT NULL DEFAULT 'par_level',
    -- 'par_level' = order up to par level
    -- 'fixed_quantity' = always order this amount
    -- 'usage_based' = order based on recent usage
    
    -- Quantities
    par_level DECIMAL(10,3),
    fixed_quantity DECIMAL(10,3),
    usage_multiplier DECIMAL(5,2) DEFAULT 1.5, -- order 1.5x average usage
    
    -- Source preference
    source_preference TEXT DEFAULT 'warehouse_first',
    -- 'warehouse_only' = only from warehouse
    -- 'warehouse_first' = warehouse, then direct if unavailable
    -- 'direct_only' = only direct from supplier
    -- 'best_price' = whichever is cheaper
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(site_id, stock_item_id),
    
    CONSTRAINT order_type_check 
        CHECK (order_type IN ('par_level', 'fixed_quantity', 'usage_based'))
);

-- ============================================================================
-- FUNCTION: Generate internal order number
-- ============================================================================

CREATE OR REPLACE FUNCTION stockly.generate_internal_order_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INTEGER;
    v_year TEXT;
BEGIN
    v_year := TO_CHAR(NOW(), 'YY');
    
    SELECT COUNT(*) + 1 INTO v_count
    FROM stockly.internal_orders
    WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    
    RETURN 'IO-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Calculate transfer price for an item
-- ============================================================================

CREATE OR REPLACE FUNCTION stockly.calculate_transfer_price(
    p_stock_item_id UUID,
    p_company_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
    v_pricing RECORD;
    v_base_cost DECIMAL;
    v_transfer_price DECIMAL;
    v_default_markup DECIMAL;
BEGIN
    -- Get internal pricing record if exists
    SELECT * INTO v_pricing
    FROM stockly.internal_pricing
    WHERE stock_item_id = p_stock_item_id
    AND company_id = p_company_id;
    
    -- Get current cost from preferred supplier
    SELECT COALESCE(pv.warehouse_price, pv.unit_price, 0) INTO v_base_cost
    FROM stockly.product_variants pv
    WHERE pv.stock_item_id = p_stock_item_id
    AND pv.is_preferred = true
    LIMIT 1;
    
    IF v_pricing IS NULL THEN
        -- Use company default markup
        SELECT COALESCE(default_internal_markup, 15) INTO v_default_markup
        FROM public.companies
        WHERE id = p_company_id;
        
        v_transfer_price := v_base_cost * (1 + v_default_markup / 100);
    ELSE
        -- Use specific pricing rules
        CASE v_pricing.pricing_method
            WHEN 'markup_percentage' THEN
                v_transfer_price := v_base_cost * (1 + COALESCE(v_pricing.markup_percentage, 0) / 100);
            WHEN 'markup_fixed' THEN
                v_transfer_price := v_base_cost + COALESCE(v_pricing.markup_fixed, 0);
            WHEN 'fixed_price' THEN
                v_transfer_price := v_pricing.transfer_price;
            WHEN 'cost_plus_handling' THEN
                v_transfer_price := v_base_cost + COALESCE(v_pricing.markup_fixed, 0);
            ELSE
                v_transfer_price := v_base_cost * 1.15; -- Default 15%
        END CASE;
    END IF;
    
    RETURN ROUND(v_transfer_price, 4);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get best source for an item (warehouse vs direct)
-- ============================================================================

CREATE OR REPLACE FUNCTION stockly.get_best_source(
    p_stock_item_id UUID,
    p_site_id UUID,
    p_quantity DECIMAL
)
RETURNS TABLE (
    source_type TEXT,
    source_id UUID,
    source_name TEXT,
    unit_price DECIMAL,
    total_price DECIMAL,
    available_quantity DECIMAL,
    lead_time_days INTEGER,
    recommendation TEXT
) AS $$
DECLARE
    v_site RECORD;
    v_warehouse_id UUID;
BEGIN
    -- Get site info
    SELECT * INTO v_site FROM public.sites WHERE id = p_site_id;
    v_warehouse_id := v_site.parent_warehouse_id;
    
    -- Return warehouse option if available
    IF v_warehouse_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            'warehouse'::TEXT as source_type,
            v_warehouse_id as source_id,
            s.name as source_name,
            stockly.calculate_transfer_price(p_stock_item_id, v_site.company_id) as unit_price,
            stockly.calculate_transfer_price(p_stock_item_id, v_site.company_id) * p_quantity as total_price,
            COALESCE(sl.quantity, 0) as available_quantity,
            1 as lead_time_days, -- internal usually next day
            CASE 
                WHEN COALESCE(sl.quantity, 0) >= p_quantity THEN 'In stock at warehouse'
                WHEN COALESCE(sl.quantity, 0) > 0 THEN 'Partial stock available'
                ELSE 'Out of stock at warehouse'
            END as recommendation
        FROM public.sites s
        LEFT JOIN stockly.stock_levels sl ON sl.site_id = v_warehouse_id 
            AND sl.stock_item_id = p_stock_item_id
        WHERE s.id = v_warehouse_id;
    END IF;
    
    -- Return direct supplier options
    RETURN QUERY
    SELECT 
        'supplier'::TEXT as source_type,
        sup.id as source_id,
        sup.name as source_name,
        COALESCE(pv.site_price, pv.unit_price) as unit_price,
        COALESCE(pv.site_price, pv.unit_price) * p_quantity as total_price,
        999999::DECIMAL as available_quantity, -- assume suppliers have stock
        COALESCE(sup.lead_time_days, 2) as lead_time_days,
        CASE
            WHEN pv.allows_direct_to_site = false THEN 'No direct delivery available'
            WHEN v_site.accepts_direct_delivery = false THEN 'Site does not accept direct delivery'
            ELSE 'Direct delivery available'
        END as recommendation
    FROM stockly.product_variants pv
    JOIN stockly.suppliers sup ON sup.id = pv.supplier_id
    WHERE pv.stock_item_id = p_stock_item_id
    AND COALESCE(pv.is_discontinued, false) = false
    AND (pv.allows_direct_to_site = true OR v_warehouse_id IS NULL)
    ORDER BY COALESCE(pv.site_price, pv.unit_price);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Process internal order delivery
-- Updates stock levels at both locations
-- ============================================================================

CREATE OR REPLACE FUNCTION stockly.process_internal_delivery(
    p_internal_order_id UUID,
    p_lines JSONB -- [{line_id, delivered_quantity}]
)
RETURNS VOID AS $$
DECLARE
    v_order RECORD;
    v_line RECORD;
    v_delivered JSONB;
BEGIN
    -- Get order details
    SELECT * INTO v_order
    FROM stockly.internal_orders
    WHERE id = p_internal_order_id;
    
    -- Process each line
    FOR v_delivered IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        -- Update line
        UPDATE stockly.internal_order_lines
        SET 
            delivered_quantity = (v_delivered->>'delivered_quantity')::DECIMAL,
            status = 'delivered'
        WHERE id = (v_delivered->>'line_id')::UUID
        RETURNING * INTO v_line;
        
        -- Decrease stock at warehouse
        UPDATE stockly.stock_levels
        SET 
            quantity = quantity - (v_delivered->>'delivered_quantity')::DECIMAL,
            updated_at = NOW()
        WHERE site_id = v_order.fulfilling_site_id
        AND stock_item_id = v_line.stock_item_id;
        
        -- Increase stock at site
        INSERT INTO stockly.stock_levels (stock_item_id, site_id, quantity)
        VALUES (v_line.stock_item_id, v_order.requesting_site_id, (v_delivered->>'delivered_quantity')::DECIMAL)
        ON CONFLICT (stock_item_id, site_id)
        DO UPDATE SET 
            quantity = stockly.stock_levels.quantity + (v_delivered->>'delivered_quantity')::DECIMAL,
            updated_at = NOW();
        
        -- Record movement from warehouse
        INSERT INTO stockly.stock_movements (
            stock_item_id, site_id, movement_type, quantity, reference_type, reference_id, notes
        ) VALUES (
            v_line.stock_item_id,
            v_order.fulfilling_site_id,
            'transfer_out',
            -(v_delivered->>'delivered_quantity')::DECIMAL,
            'internal_order',
            p_internal_order_id,
            'Transfer to ' || (SELECT name FROM public.sites WHERE id = v_order.requesting_site_id)
        );
        
        -- Record movement to site
        INSERT INTO stockly.stock_movements (
            stock_item_id, site_id, movement_type, quantity, reference_type, reference_id, notes
        ) VALUES (
            v_line.stock_item_id,
            v_order.requesting_site_id,
            'transfer_in',
            (v_delivered->>'delivered_quantity')::DECIMAL,
            'internal_order',
            p_internal_order_id,
            'Transfer from ' || (SELECT name FROM public.sites WHERE id = v_order.fulfilling_site_id)
        );
    END LOOP;
    
    -- Update order status
    UPDATE stockly.internal_orders
    SET 
        status = 'delivered',
        actual_delivery_date = CURRENT_DATE,
        delivered_at = NOW(),
        updated_at = NOW()
    WHERE id = p_internal_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEW: Stock availability across all locations
-- ============================================================================

CREATE OR REPLACE VIEW stockly.v_stock_by_location AS
SELECT 
    si.id as stock_item_id,
    si.company_id,
    si.name as item_name,
    s.id as site_id,
    s.name as site_name,
    s.location_type,
    s.parent_warehouse_id,
    COALESCE(sl.quantity, 0) as quantity,
    si.reorder_point,
    si.par_level,
    CASE 
        WHEN COALESCE(sl.quantity, 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(sl.quantity, 0) <= COALESCE(si.reorder_point, 0) THEN 'low'
        WHEN COALESCE(sl.quantity, 0) <= COALESCE(si.par_level, si.reorder_point * 1.5) THEN 'ok'
        ELSE 'good'
    END as stock_status,
    ip.transfer_price,
    COALESCE(pv.warehouse_price, pv.unit_price) as supplier_cost
FROM stockly.stock_items si
CROSS JOIN public.sites s
LEFT JOIN stockly.stock_levels sl ON sl.stock_item_id = si.id AND sl.site_id = s.id
LEFT JOIN stockly.internal_pricing ip ON ip.stock_item_id = si.id AND ip.company_id = si.company_id
LEFT JOIN stockly.product_variants pv ON pv.stock_item_id = si.id AND pv.is_preferred = true
WHERE si.company_id = s.company_id
AND si.is_active = true
ORDER BY si.name, s.location_type, s.name;

-- ============================================================================
-- VIEW: Pending internal orders for warehouse
-- ============================================================================

CREATE OR REPLACE VIEW stockly.v_warehouse_pending_orders AS
SELECT 
    io.id as order_id,
    io.order_number,
    io.status,
    io.order_date,
    io.requested_delivery_date,
    rs.name as requesting_site,
    fs.name as fulfilling_site,
    COUNT(iol.id) as line_count,
    SUM(iol.requested_quantity) as total_items,
    io.subtotal
FROM stockly.internal_orders io
JOIN public.sites rs ON rs.id = io.requesting_site_id
JOIN public.sites fs ON fs.id = io.fulfilling_site_id
LEFT JOIN stockly.internal_order_lines iol ON iol.internal_order_id = io.id
WHERE io.status NOT IN ('delivered', 'cancelled')
GROUP BY io.id, io.order_number, io.status, io.order_date, io.requested_delivery_date,
         rs.name, fs.name, io.subtotal
ORDER BY 
    CASE io.status
        WHEN 'submitted' THEN 1
        WHEN 'confirmed' THEN 2
        WHEN 'picking' THEN 3
        WHEN 'dispatched' THEN 4
        ELSE 5
    END,
    io.requested_delivery_date;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_supplier_delivery_destinations_supplier 
    ON stockly.supplier_delivery_destinations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_internal_pricing_item 
    ON stockly.internal_pricing(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_internal_orders_status 
    ON stockly.internal_orders(status);
CREATE INDEX IF NOT EXISTS idx_internal_orders_requesting_site 
    ON stockly.internal_orders(requesting_site_id);
CREATE INDEX IF NOT EXISTS idx_internal_orders_fulfilling_site 
    ON stockly.internal_orders(fulfilling_site_id);
CREATE INDEX IF NOT EXISTS idx_internal_order_lines_order 
    ON stockly.internal_order_lines(internal_order_id);
CREATE INDEX IF NOT EXISTS idx_standing_order_items_site 
    ON stockly.standing_order_items(site_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE stockly.supplier_delivery_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.internal_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.internal_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.internal_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.standing_order_items ENABLE ROW LEVEL SECURITY;

-- Policies using existing company access function
CREATE POLICY "supplier_destinations_access" ON stockly.supplier_delivery_destinations FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM stockly.suppliers s
        WHERE s.id = stockly.supplier_delivery_destinations.supplier_id
        AND stockly.stockly_company_access(s.company_id)
    ));

CREATE POLICY "internal_pricing_access" ON stockly.internal_pricing FOR ALL 
    USING (stockly.stockly_company_access(company_id));

CREATE POLICY "internal_orders_access" ON stockly.internal_orders FOR ALL 
    USING (stockly.stockly_company_access(company_id));

CREATE POLICY "internal_order_lines_access" ON stockly.internal_order_lines FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM stockly.internal_orders io
        WHERE io.id = stockly.internal_order_lines.internal_order_id
        AND stockly.stockly_company_access(io.company_id)
    ));

CREATE POLICY "standing_order_items_access" ON stockly.standing_order_items FOR ALL 
    USING (stockly.stockly_company_access(company_id));

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON stockly.supplier_delivery_destinations TO authenticated;
GRANT ALL ON stockly.internal_pricing TO authenticated;
GRANT ALL ON stockly.internal_orders TO authenticated;
GRANT ALL ON stockly.internal_order_lines TO authenticated;
GRANT ALL ON stockly.standing_order_items TO authenticated;
GRANT SELECT ON stockly.v_stock_by_location TO authenticated;
GRANT SELECT ON stockly.v_warehouse_pending_orders TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.generate_internal_order_number TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.calculate_transfer_price TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.get_best_source TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.process_internal_delivery TO authenticated;

-- ============================================================================
-- PUBLIC SCHEMA WRAPPERS FOR SUPABASE RPC CALLS
-- ============================================================================

-- Wrapper for generate_internal_order_number
DROP FUNCTION IF EXISTS public.generate_internal_order_number(UUID);
CREATE OR REPLACE FUNCTION public.generate_internal_order_number(p_company_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN stockly.generate_internal_order_number(p_company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper for calculate_transfer_price
DROP FUNCTION IF EXISTS public.calculate_transfer_price(UUID, UUID);
CREATE OR REPLACE FUNCTION public.calculate_transfer_price(
    p_stock_item_id UUID,
    p_company_id UUID
)
RETURNS DECIMAL AS $$
BEGIN
    RETURN stockly.calculate_transfer_price(p_stock_item_id, p_company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper for get_best_source
DROP FUNCTION IF EXISTS public.get_best_source(UUID, UUID, NUMERIC);
CREATE OR REPLACE FUNCTION public.get_best_source(
    p_stock_item_id UUID,
    p_site_id UUID,
    p_quantity NUMERIC
)
RETURNS TABLE (
    source_type TEXT,
    source_id UUID,
    source_name TEXT,
    unit_price DECIMAL,
    total_price DECIMAL,
    available_quantity DECIMAL,
    lead_time_days INTEGER,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM stockly.get_best_source(p_stock_item_id, p_site_id, p_quantity);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper for process_internal_delivery
DROP FUNCTION IF EXISTS public.process_internal_delivery(UUID, JSONB);
CREATE OR REPLACE FUNCTION public.process_internal_delivery(
    p_internal_order_id UUID,
    p_lines JSONB
)
RETURNS VOID AS $$
BEGIN
    PERFORM stockly.process_internal_delivery(p_internal_order_id, p_lines);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on public wrappers
GRANT EXECUTE ON FUNCTION public.generate_internal_order_number TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_transfer_price TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_best_source TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_internal_delivery TO authenticated;

COMMIT;

SELECT 'Warehouse/CPU system created successfully!' as status;

