-- ============================================================================
-- Migration: 06-stockly-public-views.sql
-- Description: Creates public schema views for stockly tables (required for REST API access)
-- Run AFTER 01-05 migrations
-- ============================================================================

BEGIN;

-- ============================================================================
-- PUBLIC VIEWS FOR STOCKLY TABLES
-- Supabase REST API only exposes 'public' and 'graphql_public' schemas
-- These views allow REST API access to stockly schema tables
-- ============================================================================

-- Helper function to safely drop table or view
CREATE OR REPLACE FUNCTION public.drop_table_or_view(name TEXT)
RETURNS VOID AS $$
DECLARE
  v_relkind CHAR;
BEGIN
  -- Check the actual object type from pg_catalog (more reliable)
  SELECT relkind INTO v_relkind
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = name;
  
  -- Drop based on actual type
  IF v_relkind = 'v' THEN
    -- It's a view
    EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', name);
  ELSIF v_relkind = 'r' THEN
    -- It's a table
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', name);
  END IF;
  -- If v_relkind is NULL, object doesn't exist - do nothing
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore any errors
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Daily Sales Summary View
SELECT public.drop_table_or_view('daily_sales_summary');
CREATE VIEW public.daily_sales_summary AS
SELECT * FROM stockly.daily_sales_summary;

-- Sales Imports View
SELECT public.drop_table_or_view('sales_imports');
CREATE VIEW public.sales_imports AS
SELECT * FROM stockly.sales_imports;

-- Sales View
SELECT public.drop_table_or_view('sales');
CREATE VIEW public.sales AS
SELECT * FROM stockly.sales;

-- Sale Items View
SELECT public.drop_table_or_view('sale_items');
CREATE VIEW public.sale_items AS
SELECT * FROM stockly.sale_items;

-- Stock Levels View
SELECT public.drop_table_or_view('stock_levels');
CREATE VIEW public.stock_levels AS
SELECT * FROM stockly.stock_levels;

-- Deliveries View
SELECT public.drop_table_or_view('deliveries');
CREATE VIEW public.deliveries AS
SELECT * FROM stockly.deliveries;

-- Delivery Lines View
SELECT public.drop_table_or_view('delivery_lines');
CREATE VIEW public.delivery_lines AS
SELECT * FROM stockly.delivery_lines;

-- Waste Logs View
SELECT public.drop_table_or_view('waste_logs');
CREATE VIEW public.waste_logs AS
SELECT * FROM stockly.waste_logs;

-- Waste Log Lines View
SELECT public.drop_table_or_view('waste_log_lines');
CREATE VIEW public.waste_log_lines AS
SELECT * FROM stockly.waste_log_lines;

-- Stock Items View
SELECT public.drop_table_or_view('stock_items');
CREATE VIEW public.stock_items AS
SELECT * FROM stockly.stock_items;

-- Product Variants View
SELECT public.drop_table_or_view('product_variants');
CREATE VIEW public.product_variants AS
SELECT * FROM stockly.product_variants;

-- Suppliers View
SELECT public.drop_table_or_view('suppliers');
CREATE VIEW public.suppliers AS
SELECT * FROM stockly.suppliers;

-- Stock Categories View
SELECT public.drop_table_or_view('stock_categories');
CREATE VIEW public.stock_categories AS
SELECT * FROM stockly.stock_categories;

-- Storage Areas View
SELECT public.drop_table_or_view('storage_areas');
CREATE VIEW public.storage_areas AS
SELECT * FROM stockly.storage_areas;

-- Price History View
SELECT public.drop_table_or_view('price_history');
CREATE VIEW public.price_history AS
SELECT * FROM stockly.price_history;

-- Stock Movements View
SELECT public.drop_table_or_view('stock_movements');
CREATE VIEW public.stock_movements AS
SELECT * FROM stockly.stock_movements;

-- Reporting Views (create only if underlying views exist)
-- Use DO block to handle cases where views might not exist yet
DO $$
BEGIN
  -- v_category_spend
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'stockly' AND table_name = 'v_category_spend') THEN
    DROP VIEW IF EXISTS public.v_category_spend CASCADE;
    EXECUTE 'CREATE VIEW public.v_category_spend AS SELECT * FROM stockly.v_category_spend';
  END IF;
  
  -- v_supplier_spend
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'stockly' AND table_name = 'v_supplier_spend') THEN
    DROP VIEW IF EXISTS public.v_supplier_spend CASCADE;
    EXECUTE 'CREATE VIEW public.v_supplier_spend AS SELECT * FROM stockly.v_supplier_spend';
  END IF;
  
  -- v_dead_stock
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'stockly' AND table_name = 'v_dead_stock') THEN
    DROP VIEW IF EXISTS public.v_dead_stock CASCADE;
    EXECUTE 'CREATE VIEW public.v_dead_stock AS SELECT * FROM stockly.v_dead_stock';
  END IF;
  
  -- v_price_history
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'stockly' AND table_name = 'v_price_history') THEN
    DROP VIEW IF EXISTS public.v_price_history CASCADE;
    EXECUTE 'CREATE VIEW public.v_price_history AS SELECT * FROM stockly.v_price_history';
  END IF;
END $$;

-- ============================================================================
-- INSTEAD OF TRIGGERS FOR VIEWS (to support INSERT/UPDATE/DELETE)
-- ============================================================================

-- Trigger function for daily_sales_summary
CREATE OR REPLACE FUNCTION public.insert_daily_sales_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stockly.daily_sales_summary (
    id, company_id, site_id, summary_date, gross_revenue, net_revenue,
    total_cost, gross_profit, gp_percentage, total_covers, transaction_count,
    created_at, updated_at
  ) VALUES (
    NEW.id, NEW.company_id, NEW.site_id, NEW.summary_date, NEW.gross_revenue, NEW.net_revenue,
    NEW.total_cost, NEW.gross_profit, NEW.gp_percentage, NEW.total_covers, NEW.transaction_count,
    NEW.created_at, NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_daily_sales_summary()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.daily_sales_summary SET 
    company_id = NEW.company_id,
    site_id = NEW.site_id,
    summary_date = NEW.summary_date,
    gross_revenue = NEW.gross_revenue,
    net_revenue = NEW.net_revenue,
    total_cost = NEW.total_cost,
    gross_profit = NEW.gross_profit,
    gp_percentage = NEW.gp_percentage,
    total_covers = NEW.total_covers,
    transaction_count = NEW.transaction_count,
    updated_at = NEW.updated_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER daily_sales_summary_insert_trigger
  INSTEAD OF INSERT ON public.daily_sales_summary
  FOR EACH ROW EXECUTE FUNCTION public.insert_daily_sales_summary();

CREATE TRIGGER daily_sales_summary_update_trigger
  INSTEAD OF UPDATE ON public.daily_sales_summary
  FOR EACH ROW EXECUTE FUNCTION public.update_daily_sales_summary();

-- Trigger function for sales_imports
CREATE OR REPLACE FUNCTION public.insert_sales_imports()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stockly.sales_imports (
    id, company_id, site_id, import_type, pos_provider, filename,
    date_from, date_to, records_total, records_imported, records_failed,
    revenue_total, status, created_at, completed_at
  ) VALUES (
    NEW.id, NEW.company_id, NEW.site_id, NEW.import_type, NEW.pos_provider, NEW.filename,
    NEW.date_from, NEW.date_to, NEW.records_total, NEW.records_imported, NEW.records_failed,
    NEW.revenue_total, NEW.status, NEW.created_at, NEW.completed_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_sales_imports()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.sales_imports SET 
    company_id = NEW.company_id,
    site_id = NEW.site_id,
    import_type = NEW.import_type,
    pos_provider = NEW.pos_provider,
    filename = NEW.filename,
    date_from = NEW.date_from,
    date_to = NEW.date_to,
    records_total = NEW.records_total,
    records_imported = NEW.records_imported,
    records_failed = NEW.records_failed,
    revenue_total = NEW.revenue_total,
    status = NEW.status,
    completed_at = NEW.completed_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sales_imports_insert_trigger
  INSTEAD OF INSERT ON public.sales_imports
  FOR EACH ROW EXECUTE FUNCTION public.insert_sales_imports();

CREATE TRIGGER sales_imports_update_trigger
  INSTEAD OF UPDATE ON public.sales_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_sales_imports();

-- Trigger function for sales
CREATE OR REPLACE FUNCTION public.insert_sales()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stockly.sales (
    id, company_id, site_id, pos_transaction_id, pos_provider, import_batch_id,
    sale_date, gross_revenue, discounts, net_revenue, vat_amount, total_amount,
    covers, payment_method, status, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.company_id, NEW.site_id, NEW.pos_transaction_id, NEW.pos_provider, NEW.import_batch_id,
    NEW.sale_date, NEW.gross_revenue, NEW.discounts, NEW.net_revenue, NEW.vat_amount, NEW.total_amount,
    NEW.covers, NEW.payment_method, NEW.status, NEW.created_at, NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_sales()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.sales SET 
    company_id = NEW.company_id,
    site_id = NEW.site_id,
    pos_transaction_id = NEW.pos_transaction_id,
    pos_provider = NEW.pos_provider,
    import_batch_id = NEW.import_batch_id,
    sale_date = NEW.sale_date,
    gross_revenue = NEW.gross_revenue,
    discounts = NEW.discounts,
    net_revenue = NEW.net_revenue,
    vat_amount = NEW.vat_amount,
    total_amount = NEW.total_amount,
    covers = NEW.covers,
    payment_method = NEW.payment_method,
    status = NEW.status,
    updated_at = NEW.updated_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sales_insert_trigger
  INSTEAD OF INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.insert_sales();

CREATE TRIGGER sales_update_trigger
  INSTEAD OF UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_sales();

-- Trigger function for sale_items
CREATE OR REPLACE FUNCTION public.insert_sale_items()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stockly.sale_items (
    id, sale_id, item_name, category_name, quantity, unit_price, line_total, created_at
  ) VALUES (
    NEW.id, NEW.sale_id, NEW.item_name, NEW.category_name, NEW.quantity, NEW.unit_price, NEW.line_total, NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sale_items_insert_trigger
  INSTEAD OF INSERT ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.insert_sale_items();

-- ============================================================================
-- RLS POLICIES FOR VIEWS
-- Views inherit RLS from underlying tables via security_invoker
-- ============================================================================

ALTER VIEW public.daily_sales_summary SET (security_invoker = true);
ALTER VIEW public.sales_imports SET (security_invoker = true);
ALTER VIEW public.sales SET (security_invoker = true);
ALTER VIEW public.sale_items SET (security_invoker = true);
ALTER VIEW public.stock_levels SET (security_invoker = true);
ALTER VIEW public.deliveries SET (security_invoker = true);
ALTER VIEW public.delivery_lines SET (security_invoker = true);
ALTER VIEW public.waste_logs SET (security_invoker = true);
ALTER VIEW public.waste_log_lines SET (security_invoker = true);
ALTER VIEW public.stock_items SET (security_invoker = true);
ALTER VIEW public.product_variants SET (security_invoker = true);
ALTER VIEW public.suppliers SET (security_invoker = true);
ALTER VIEW public.stock_categories SET (security_invoker = true);
ALTER VIEW public.storage_areas SET (security_invoker = true);
ALTER VIEW public.price_history SET (security_invoker = true);
ALTER VIEW public.stock_movements SET (security_invoker = true);
-- Reporting views (set security_invoker if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_category_spend') THEN
    EXECUTE 'ALTER VIEW public.v_category_spend SET (security_invoker = true)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_supplier_spend') THEN
    EXECUTE 'ALTER VIEW public.v_supplier_spend SET (security_invoker = true)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_dead_stock') THEN
    EXECUTE 'ALTER VIEW public.v_dead_stock SET (security_invoker = true)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_price_history') THEN
    EXECUTE 'ALTER VIEW public.v_price_history SET (security_invoker = true)';
  END IF;
END $$;

-- ============================================================================
-- RECIPE TABLES PUBLIC VIEWS
-- ============================================================================

-- Recipes View
SELECT public.drop_table_or_view('recipes');
CREATE VIEW public.recipes AS
SELECT * FROM stockly.recipes;

-- Recipe Ingredients View
SELECT public.drop_table_or_view('recipe_ingredients');
CREATE VIEW public.recipe_ingredients AS
SELECT * FROM stockly.recipe_ingredients;

-- Recipe Variants View
SELECT public.drop_table_or_view('recipe_variants');
CREATE VIEW public.recipe_variants AS
SELECT * FROM stockly.recipe_variants;

-- Recipe Modifiers View
SELECT public.drop_table_or_view('recipe_modifiers');
CREATE VIEW public.recipe_modifiers AS
SELECT * FROM stockly.recipe_modifiers;

-- Recipe Portions View
SELECT public.drop_table_or_view('recipe_portions');
CREATE VIEW public.recipe_portions AS
SELECT * FROM stockly.recipe_portions;

-- Recipe Cost History View
SELECT public.drop_table_or_view('recipe_cost_history');
CREATE VIEW public.recipe_cost_history AS
SELECT * FROM stockly.recipe_cost_history;

-- ============================================================================
-- STOCK COUNT TABLES PUBLIC VIEWS
-- ============================================================================

-- Stock Counts View
SELECT public.drop_table_or_view('stock_counts');
CREATE VIEW public.stock_counts AS
SELECT * FROM stockly.stock_counts;

-- Stock Count Items View
SELECT public.drop_table_or_view('stock_count_items');
CREATE VIEW public.stock_count_items AS
SELECT * FROM stockly.stock_count_items;

-- Stock Count Sections View
SELECT public.drop_table_or_view('stock_count_sections');
CREATE VIEW public.stock_count_sections AS
SELECT * FROM stockly.stock_count_sections;

-- ============================================================================
-- GP REPORTING VIEWS PUBLIC VIEWS (conditional - only if stockly views exist)
-- ============================================================================

-- GP Weekly View (only create if stockly view exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'stockly' AND table_name = 'v_gp_weekly') THEN
    PERFORM public.drop_table_or_view('v_gp_weekly');
    EXECUTE 'CREATE VIEW public.v_gp_weekly AS SELECT * FROM stockly.v_gp_weekly';
  END IF;
END $$;

-- GP Monthly View (only create if stockly view exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'stockly' AND table_name = 'v_gp_monthly') THEN
    PERFORM public.drop_table_or_view('v_gp_monthly');
    EXECUTE 'CREATE VIEW public.v_gp_monthly AS SELECT * FROM stockly.v_gp_monthly';
  END IF;
END $$;

-- GP By Category View (only create if stockly view exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'stockly' AND table_name = 'v_gp_by_category') THEN
    PERFORM public.drop_table_or_view('v_gp_by_category');
    EXECUTE 'CREATE VIEW public.v_gp_by_category AS SELECT * FROM stockly.v_gp_by_category';
  END IF;
END $$;

-- ============================================================================
-- INSTEAD OF TRIGGERS FOR RECIPE VIEWS
-- ============================================================================

-- Recipes triggers
CREATE OR REPLACE FUNCTION public.insert_recipes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stockly.recipes (
    id, company_id, name, description, recipe_type, category_id, menu_category,
    yield_quantity, yield_unit, is_ingredient, base_unit, shelf_life_days,
    total_cost, cost_per_portion, sell_price, vat_rate, target_gp_percent,
    actual_gp_percent, use_weighted_average, pos_item_code, pos_item_name,
    is_active, is_archived, version, last_costed_at, image_url, notes,
    created_by, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.company_id, NEW.name, NEW.description, NEW.recipe_type, NEW.category_id, NEW.menu_category,
    NEW.yield_quantity, NEW.yield_unit, NEW.is_ingredient, NEW.base_unit, NEW.shelf_life_days,
    NEW.total_cost, NEW.cost_per_portion, NEW.sell_price, NEW.vat_rate, NEW.target_gp_percent,
    NEW.actual_gp_percent, NEW.use_weighted_average, NEW.pos_item_code, NEW.pos_item_name,
    NEW.is_active, NEW.is_archived, NEW.version, NEW.last_costed_at, NEW.image_url, NEW.notes,
    NEW.created_by, NEW.created_at, NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_recipes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.recipes SET 
    company_id = NEW.company_id,
    name = NEW.name,
    description = NEW.description,
    recipe_type = NEW.recipe_type,
    category_id = NEW.category_id,
    menu_category = NEW.menu_category,
    yield_quantity = NEW.yield_quantity,
    yield_unit = NEW.yield_unit,
    is_ingredient = NEW.is_ingredient,
    base_unit = NEW.base_unit,
    shelf_life_days = NEW.shelf_life_days,
    total_cost = NEW.total_cost,
    cost_per_portion = NEW.cost_per_portion,
    sell_price = NEW.sell_price,
    vat_rate = NEW.vat_rate,
    target_gp_percent = NEW.target_gp_percent,
    actual_gp_percent = NEW.actual_gp_percent,
    use_weighted_average = NEW.use_weighted_average,
    pos_item_code = NEW.pos_item_code,
    pos_item_name = NEW.pos_item_name,
    is_active = NEW.is_active,
    is_archived = NEW.is_archived,
    version = NEW.version,
    last_costed_at = NEW.last_costed_at,
    image_url = NEW.image_url,
    notes = NEW.notes,
    created_by = NEW.created_by,
    updated_at = NEW.updated_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER recipes_insert_trigger
  INSTEAD OF INSERT ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.insert_recipes();

CREATE TRIGGER recipes_update_trigger
  INSTEAD OF UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_recipes();

-- Recipe Ingredients triggers
CREATE OR REPLACE FUNCTION public.insert_recipe_ingredients()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stockly.recipe_ingredients (
    id, recipe_id, stock_item_id, sub_recipe_id, quantity, unit,
    yield_factor, unit_cost, gross_quantity, line_cost,
    preparation_notes, display_order, is_optional, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.recipe_id, NEW.stock_item_id, NEW.sub_recipe_id, NEW.quantity, NEW.unit,
    NEW.yield_factor, NEW.unit_cost, NEW.gross_quantity, NEW.line_cost,
    NEW.preparation_notes, NEW.display_order, NEW.is_optional, NEW.created_at, NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_recipe_ingredients()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.recipe_ingredients SET 
    recipe_id = NEW.recipe_id,
    stock_item_id = NEW.stock_item_id,
    sub_recipe_id = NEW.sub_recipe_id,
    quantity = NEW.quantity,
    unit = NEW.unit,
    yield_factor = NEW.yield_factor,
    unit_cost = NEW.unit_cost,
    gross_quantity = NEW.gross_quantity,
    line_cost = NEW.line_cost,
    preparation_notes = NEW.preparation_notes,
    display_order = NEW.display_order,
    is_optional = NEW.is_optional,
    updated_at = NEW.updated_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER recipe_ingredients_insert_trigger
  INSTEAD OF INSERT ON public.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.insert_recipe_ingredients();

CREATE TRIGGER recipe_ingredients_update_trigger
  INSTEAD OF UPDATE ON public.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_recipe_ingredients();

-- ============================================================================
-- INSTEAD OF TRIGGERS FOR STOCK COUNT VIEWS
-- ============================================================================

-- Stock Counts triggers
CREATE OR REPLACE FUNCTION public.insert_stock_counts()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stockly.stock_counts (
    id, company_id, site_id, count_number, count_date, count_type, status,
    categories, storage_areas, total_items, items_counted, counted_items,
    variance_count, variance_value, started_at, started_by, completed_at,
    completed_by, reviewed_by, reviewed_at, notes, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.company_id, NEW.site_id, NEW.count_number, NEW.count_date, NEW.count_type, NEW.status,
    NEW.categories, NEW.storage_areas, NEW.total_items, NEW.items_counted, NEW.counted_items,
    NEW.variance_count, NEW.variance_value, NEW.started_at, NEW.started_by, NEW.completed_at,
    NEW.completed_by, NEW.reviewed_by, NEW.reviewed_at, NEW.notes, NEW.created_at, NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_stock_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.stock_counts SET 
    company_id = NEW.company_id,
    site_id = NEW.site_id,
    count_number = NEW.count_number,
    count_date = NEW.count_date,
    count_type = NEW.count_type,
    status = NEW.status,
    categories = NEW.categories,
    storage_areas = NEW.storage_areas,
    total_items = NEW.total_items,
    items_counted = NEW.items_counted,
    counted_items = NEW.counted_items,
    variance_count = NEW.variance_count,
    variance_value = NEW.variance_value,
    started_at = NEW.started_at,
    started_by = NEW.started_by,
    completed_at = NEW.completed_at,
    completed_by = NEW.completed_by,
    reviewed_by = NEW.reviewed_by,
    reviewed_at = NEW.reviewed_at,
    notes = NEW.notes,
    updated_at = NEW.updated_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER stock_counts_insert_trigger
  INSTEAD OF INSERT ON public.stock_counts
  FOR EACH ROW EXECUTE FUNCTION public.insert_stock_counts();

CREATE TRIGGER stock_counts_update_trigger
  INSTEAD OF UPDATE ON public.stock_counts
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_counts();

-- Stock Count Items triggers
CREATE OR REPLACE FUNCTION public.insert_stock_count_items()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stockly.stock_count_items (
    id, stock_count_id, stock_item_id, expected_quantity, expected_value,
    counted_quantity, counted_value, variance_quantity, variance_value,
    unit_cost, is_counted, notes, created_at
  ) VALUES (
    NEW.id, NEW.stock_count_id, NEW.stock_item_id, NEW.expected_quantity, NEW.expected_value,
    NEW.counted_quantity, NEW.counted_value, NEW.variance_quantity, NEW.variance_value,
    NEW.unit_cost, NEW.is_counted, NEW.notes, NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_stock_count_items()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.stock_count_items SET 
    stock_count_id = NEW.stock_count_id,
    stock_item_id = NEW.stock_item_id,
    expected_quantity = NEW.expected_quantity,
    expected_value = NEW.expected_value,
    counted_quantity = NEW.counted_quantity,
    counted_value = NEW.counted_value,
    variance_quantity = NEW.variance_quantity,
    variance_value = NEW.variance_value,
    unit_cost = NEW.unit_cost,
    is_counted = NEW.is_counted,
    notes = NEW.notes
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER stock_count_items_insert_trigger
  INSTEAD OF INSERT ON public.stock_count_items
  FOR EACH ROW EXECUTE FUNCTION public.insert_stock_count_items();

CREATE TRIGGER stock_count_items_update_trigger
  INSTEAD OF UPDATE ON public.stock_count_items
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_count_items();

-- ============================================================================
-- RLS FOR RECIPE VIEWS
-- ============================================================================

ALTER VIEW public.recipes SET (security_invoker = true);
ALTER VIEW public.recipe_ingredients SET (security_invoker = true);
ALTER VIEW public.recipe_variants SET (security_invoker = true);
ALTER VIEW public.recipe_modifiers SET (security_invoker = true);
ALTER VIEW public.recipe_portions SET (security_invoker = true);
ALTER VIEW public.recipe_cost_history SET (security_invoker = true);
ALTER VIEW public.stock_counts SET (security_invoker = true);
ALTER VIEW public.stock_count_items SET (security_invoker = true);
ALTER VIEW public.stock_count_sections SET (security_invoker = true);
-- Set security_invoker for GP views (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_gp_weekly') THEN
    EXECUTE 'ALTER VIEW public.v_gp_weekly SET (security_invoker = true)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_gp_monthly') THEN
    EXECUTE 'ALTER VIEW public.v_gp_monthly SET (security_invoker = true)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_gp_by_category') THEN
    EXECUTE 'ALTER VIEW public.v_gp_by_category SET (security_invoker = true)';
  END IF;
END $$;

-- Grant access to all views
GRANT SELECT, INSERT, UPDATE ON public.daily_sales_summary TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sales_imports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sale_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stock_levels TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.deliveries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.delivery_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.waste_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.waste_log_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stock_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.product_variants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stock_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.storage_areas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.price_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stock_movements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recipes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recipe_ingredients TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recipe_variants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recipe_modifiers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recipe_portions TO authenticated;
GRANT SELECT ON public.recipe_cost_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stock_counts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stock_count_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stock_count_sections TO authenticated;
-- Grant access to GP views (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_gp_weekly') THEN
    EXECUTE 'GRANT SELECT ON public.v_gp_weekly TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_gp_monthly') THEN
    EXECUTE 'GRANT SELECT ON public.v_gp_monthly TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_gp_by_category') THEN
    EXECUTE 'GRANT SELECT ON public.v_gp_by_category TO authenticated';
  END IF;
END $$;
-- Grant access to reporting views (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_category_spend') THEN
    EXECUTE 'GRANT SELECT ON public.v_category_spend TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_supplier_spend') THEN
    EXECUTE 'GRANT SELECT ON public.v_supplier_spend TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_dead_stock') THEN
    EXECUTE 'GRANT SELECT ON public.v_dead_stock TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_price_history') THEN
    EXECUTE 'GRANT SELECT ON public.v_price_history TO authenticated';
  END IF;
END $$;

-- ============================================================================
-- RPC FUNCTION WRAPPERS FOR RECIPES
-- ============================================================================
-- Supabase RPC calls only work with functions in the public schema
-- Create wrappers for stockly schema functions

CREATE OR REPLACE FUNCTION public.recalculate_all_recipes(p_company_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN stockly.recalculate_all_recipes(p_company_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_recipe_cost(p_recipe_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN stockly.calculate_recipe_cost(p_recipe_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_recipe_cost_breakdown(p_recipe_id UUID)
RETURNS TABLE (
    ingredient_id UUID,
    ingredient_name TEXT,
    ingredient_type TEXT,
    quantity NUMERIC,
    unit TEXT,
    yield_factor NUMERIC,
    gross_quantity NUMERIC,
    unit_cost NUMERIC,
    line_cost NUMERIC,
    cost_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM stockly.get_recipe_cost_breakdown(p_recipe_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_all_recipes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_recipe_cost(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recipe_cost_breakdown(UUID) TO authenticated;

-- Clean up helper function
DROP FUNCTION IF EXISTS public.drop_table_or_view(TEXT);

COMMIT;

SELECT 'Public views for stockly tables created successfully' as result;
