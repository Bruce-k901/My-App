-- ============================================================================
-- Migration: Create Stockly RLS Policies
-- Description: Row Level Security policies for all Stockly tables
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

-- Helper function for company access (created unconditionally)
CREATE OR REPLACE FUNCTION stockly_company_access(p_company_id UUID)
RETURNS BOOLEAN AS $function$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      RETURN EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.company_id = p_company_id
      );
    END IF;
    RETURN FALSE;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DO $$
BEGIN
  -- Enable RLS on all Stockly tables (conditionally)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_areas') THEN
    ALTER TABLE public.storage_areas ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suppliers') THEN
    ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_categories') THEN
    ALTER TABLE public.stock_categories ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items') THEN
    ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_variants') THEN
    ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'price_history') THEN
    ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_levels') THEN
    ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_movements') THEN
    ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deliveries') THEN
    ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_lines') THEN
    ALTER TABLE public.delivery_lines ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders') THEN
    ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_order_lines') THEN
    ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'waste_logs') THEN
    ALTER TABLE public.waste_logs ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'waste_log_lines') THEN
    ALTER TABLE public.waste_log_lines ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_counts') THEN
    ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_count_sections') THEN
    ALTER TABLE public.stock_count_sections ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_count_lines') THEN
    ALTER TABLE public.stock_count_lines ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recipes') THEN
    ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recipe_ingredients') THEN
    ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transfers') THEN
    ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transfer_lines') THEN
    ALTER TABLE public.transfer_lines ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pos_sales') THEN
    ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pos_sale_lines') THEN
    ALTER TABLE public.pos_sale_lines ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_processing_queue') THEN
    ALTER TABLE public.ai_processing_queue ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Company-scoped tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suppliers') THEN
    DROP POLICY IF EXISTS suppliers_company ON public.suppliers;
    CREATE POLICY suppliers_company ON public.suppliers FOR ALL 
      USING (stockly_company_access(company_id));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_categories') THEN
    DROP POLICY IF EXISTS stock_categories_company ON public.stock_categories;
    CREATE POLICY stock_categories_company ON public.stock_categories FOR ALL 
      USING (stockly_company_access(company_id));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items') THEN
    DROP POLICY IF EXISTS stock_items_company ON public.stock_items;
    CREATE POLICY stock_items_company ON public.stock_items FOR ALL 
      USING (stockly_company_access(company_id));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_movements') THEN
    DROP POLICY IF EXISTS stock_movements_company ON public.stock_movements;
    CREATE POLICY stock_movements_company ON public.stock_movements FOR ALL 
      USING (stockly_company_access(company_id));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deliveries') THEN
    DROP POLICY IF EXISTS deliveries_company ON public.deliveries;
    CREATE POLICY deliveries_company ON public.deliveries FOR ALL 
      USING (stockly_company_access(company_id));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders') THEN
    DROP POLICY IF EXISTS purchase_orders_company ON public.purchase_orders;
    CREATE POLICY purchase_orders_company ON public.purchase_orders FOR ALL 
      USING (stockly_company_access(company_id));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'waste_logs') THEN
    DROP POLICY IF EXISTS waste_logs_company ON public.waste_logs;
    CREATE POLICY waste_logs_company ON public.waste_logs FOR ALL 
      USING (stockly_company_access(company_id));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_counts') THEN
    DROP POLICY IF EXISTS stock_counts_company ON public.stock_counts;
    CREATE POLICY stock_counts_company ON public.stock_counts FOR ALL 
      USING (stockly_company_access(company_id));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recipes') THEN
    DROP POLICY IF EXISTS recipes_company ON public.recipes;
    CREATE POLICY recipes_company ON public.recipes FOR ALL 
      USING (stockly_company_access(company_id));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transfers') THEN
    DROP POLICY IF EXISTS transfers_company ON public.transfers;
    CREATE POLICY transfers_company ON public.transfers FOR ALL 
      USING (stockly_company_access(company_id));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pos_sales') THEN
    DROP POLICY IF EXISTS pos_sales_company ON public.pos_sales;
    CREATE POLICY pos_sales_company ON public.pos_sales FOR ALL 
      USING (stockly_company_access(company_id));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_processing_queue') THEN
    DROP POLICY IF EXISTS ai_queue_company ON public.ai_processing_queue;
    CREATE POLICY ai_queue_company ON public.ai_processing_queue FOR ALL 
      USING (stockly_company_access(company_id));
  END IF;

  -- Site-joined tables (use site to get company)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_areas')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    DROP POLICY IF EXISTS storage_areas_site ON public.storage_areas;
    CREATE POLICY storage_areas_site ON public.storage_areas FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.company_id = s.company_id
        WHERE s.id = storage_areas.site_id AND p.id = auth.uid()
      )
    );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_levels')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    DROP POLICY IF EXISTS stock_levels_site ON public.stock_levels;
    CREATE POLICY stock_levels_site ON public.stock_levels FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.company_id = s.company_id
        WHERE s.id = stock_levels.site_id AND p.id = auth.uid()
      )
    );
  END IF;

  -- Child tables (inherit from parent)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_variants')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items') THEN
    DROP POLICY IF EXISTS product_variants_parent ON public.product_variants;
    CREATE POLICY product_variants_parent ON public.product_variants FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.stock_items si
        WHERE si.id = product_variants.stock_item_id
          AND stockly_company_access(si.company_id)
      )
    );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'price_history')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_variants')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items') THEN
    DROP POLICY IF EXISTS price_history_parent ON public.price_history;
    CREATE POLICY price_history_parent ON public.price_history FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.product_variants pv
        JOIN public.stock_items si ON si.id = pv.stock_item_id
        WHERE pv.id = price_history.product_variant_id
          AND stockly_company_access(si.company_id)
      )
    );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_lines')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deliveries') THEN
    DROP POLICY IF EXISTS delivery_lines_parent ON public.delivery_lines;
    CREATE POLICY delivery_lines_parent ON public.delivery_lines FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.deliveries d
        WHERE d.id = delivery_lines.delivery_id
          AND stockly_company_access(d.company_id)
      )
    );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_order_lines')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders') THEN
    DROP POLICY IF EXISTS po_lines_parent ON public.purchase_order_lines;
    CREATE POLICY po_lines_parent ON public.purchase_order_lines FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_lines.purchase_order_id
          AND stockly_company_access(po.company_id)
      )
    );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'waste_log_lines')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'waste_logs') THEN
    DROP POLICY IF EXISTS waste_lines_parent ON public.waste_log_lines;
    CREATE POLICY waste_lines_parent ON public.waste_log_lines FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.waste_logs wl
        WHERE wl.id = waste_log_lines.waste_log_id
          AND stockly_company_access(wl.company_id)
      )
    );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_count_sections')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_counts') THEN
    DROP POLICY IF EXISTS count_sections_parent ON public.stock_count_sections;
    CREATE POLICY count_sections_parent ON public.stock_count_sections FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.stock_counts sc
        WHERE sc.id = stock_count_sections.stock_count_id
          AND stockly_company_access(sc.company_id)
      )
    );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_count_lines')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_count_sections')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_counts') THEN
    DROP POLICY IF EXISTS count_lines_parent ON public.stock_count_lines;
    CREATE POLICY count_lines_parent ON public.stock_count_lines FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.stock_count_sections scs
        JOIN public.stock_counts sc ON sc.id = scs.stock_count_id
        WHERE scs.id = stock_count_lines.section_id
          AND stockly_company_access(sc.company_id)
      )
    );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recipe_ingredients')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recipes') THEN
    DROP POLICY IF EXISTS recipe_ingredients_parent ON public.recipe_ingredients;
    CREATE POLICY recipe_ingredients_parent ON public.recipe_ingredients FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_ingredients.recipe_id
          AND stockly_company_access(r.company_id)
      )
    );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transfer_lines')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transfers') THEN
    DROP POLICY IF EXISTS transfer_lines_parent ON public.transfer_lines;
    CREATE POLICY transfer_lines_parent ON public.transfer_lines FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.transfers t
        WHERE t.id = transfer_lines.transfer_id
          AND stockly_company_access(t.company_id)
      )
    );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pos_sale_lines')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pos_sales') THEN
    DROP POLICY IF EXISTS pos_sale_lines_parent ON public.pos_sale_lines;
    CREATE POLICY pos_sale_lines_parent ON public.pos_sale_lines FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.pos_sales ps
        WHERE ps.id = pos_sale_lines.pos_sale_id
          AND stockly_company_access(ps.company_id)
      )
    );
  END IF;
END $$;
