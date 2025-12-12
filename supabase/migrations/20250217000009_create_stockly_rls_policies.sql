-- ============================================================================
-- Migration: Create Stockly RLS Policies
-- Description: Row Level Security policies for all Stockly tables
-- ============================================================================

BEGIN;

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
        SELECT 1 FROM stock_count_sections scs
        JOIN stock_counts sc ON sc.id = scs.stock_count_id
        WHERE scs.id = stock_count_lines.stock_count_section_id
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

COMMIT;
