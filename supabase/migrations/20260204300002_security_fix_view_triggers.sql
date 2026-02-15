-- ============================================================================
-- Migration: Security Fix - Add Authorization Checks to Public View Triggers
-- Severity: HIGH
-- Description: Adds company_id verification to all public view INSTEAD OF triggers
--              to prevent cross-company data manipulation via views
-- ============================================================================

BEGIN;

-- ============================================================================
-- HIGH FIX: Fix daily_sales_summary trigger functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_daily_sales_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- SECURITY CHECK: Verify user has access to this company
    IF NOT stockly.stockly_company_access(NEW.company_id) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to insert sales data for this company';
    END IF;

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
DECLARE
    v_existing_company_id UUID;
BEGIN
    -- Get existing record's company_id
    SELECT company_id INTO v_existing_company_id
    FROM stockly.daily_sales_summary WHERE id = OLD.id;

    -- SECURITY CHECK: Verify user has access to the existing record's company
    IF NOT stockly.stockly_company_access(v_existing_company_id) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to update sales data for this company';
    END IF;

    -- SECURITY CHECK: Prevent changing company_id to a different company
    IF NEW.company_id IS DISTINCT FROM v_existing_company_id THEN
        RAISE EXCEPTION 'Security violation: Cannot change company_id of existing record';
    END IF;

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

-- ============================================================================
-- HIGH FIX: Fix sales_imports trigger functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_sales_imports()
RETURNS TRIGGER AS $$
BEGIN
    -- SECURITY CHECK: Verify user has access to this company
    IF NOT stockly.stockly_company_access(NEW.company_id) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to create sales imports for this company';
    END IF;

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
DECLARE
    v_existing_company_id UUID;
BEGIN
    -- Get existing record's company_id
    SELECT company_id INTO v_existing_company_id
    FROM stockly.sales_imports WHERE id = OLD.id;

    -- SECURITY CHECK: Verify user has access to the existing record's company
    IF NOT stockly.stockly_company_access(v_existing_company_id) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to update sales imports for this company';
    END IF;

    -- SECURITY CHECK: Prevent changing company_id
    IF NEW.company_id IS DISTINCT FROM v_existing_company_id THEN
        RAISE EXCEPTION 'Security violation: Cannot change company_id of existing record';
    END IF;

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

-- ============================================================================
-- HIGH FIX: Fix sales trigger functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_sales()
RETURNS TRIGGER AS $$
BEGIN
    -- SECURITY CHECK: Verify user has access to this company
    IF NOT stockly.stockly_company_access(NEW.company_id) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to insert sales for this company';
    END IF;

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
DECLARE
    v_existing_company_id UUID;
BEGIN
    -- Get existing record's company_id
    SELECT company_id INTO v_existing_company_id
    FROM stockly.sales WHERE id = OLD.id;

    -- SECURITY CHECK: Verify user has access to the existing record's company
    IF NOT stockly.stockly_company_access(v_existing_company_id) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to update sales for this company';
    END IF;

    -- SECURITY CHECK: Prevent changing company_id
    IF NEW.company_id IS DISTINCT FROM v_existing_company_id THEN
        RAISE EXCEPTION 'Security violation: Cannot change company_id of existing record';
    END IF;

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

-- ============================================================================
-- HIGH FIX: Fix sale_items trigger function (uses sale_id to get company)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_sale_items()
RETURNS TRIGGER AS $$
DECLARE
    v_sale_company_id UUID;
BEGIN
    -- Get company_id from the parent sale
    SELECT company_id INTO v_sale_company_id
    FROM stockly.sales WHERE id = NEW.sale_id;

    -- SECURITY CHECK: Verify user has access to this company
    IF v_sale_company_id IS NOT NULL AND NOT stockly.stockly_company_access(v_sale_company_id) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to insert sale items for this company';
    END IF;

    INSERT INTO stockly.sale_items (
        id, sale_id, item_name, category_name, quantity, unit_price, line_total, created_at
    ) VALUES (
        NEW.id, NEW.sale_id, NEW.item_name, NEW.category_name, NEW.quantity, NEW.unit_price, NEW.line_total, NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HIGH FIX: Fix recipes trigger functions (if they exist)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_recipes') THEN
        EXECUTE $func$
            CREATE OR REPLACE FUNCTION public.insert_recipes()
            RETURNS TRIGGER AS $inner$
            BEGIN
                -- SECURITY CHECK: Verify user has access to this company
                IF NOT stockly.stockly_company_access(NEW.company_id) THEN
                    RAISE EXCEPTION 'Access denied: You do not have permission to create recipes for this company';
                END IF;

                INSERT INTO stockly.recipes (
                    id, company_id, name, recipe_type, yield_quantity, yield_unit,
                    sell_price, target_gp_percent, total_cost, cost_per_portion,
                    actual_gp_percent, is_active, created_at, updated_at
                ) VALUES (
                    COALESCE(NEW.id, gen_random_uuid()), NEW.company_id, NEW.name, NEW.recipe_type,
                    NEW.yield_quantity, NEW.yield_unit, NEW.sell_price, NEW.target_gp_percent,
                    NEW.total_cost, NEW.cost_per_portion, NEW.actual_gp_percent, NEW.is_active,
                    COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW())
                );
                RETURN NEW;
            END;
            $inner$ LANGUAGE plpgsql SECURITY DEFINER;
        $func$;
        RAISE NOTICE 'Fixed insert_recipes trigger with company access check';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_recipes') THEN
        EXECUTE $func$
            CREATE OR REPLACE FUNCTION public.update_recipes()
            RETURNS TRIGGER AS $inner$
            DECLARE
                v_existing_company_id UUID;
            BEGIN
                -- Get existing record's company_id
                SELECT company_id INTO v_existing_company_id
                FROM stockly.recipes WHERE id = OLD.id;

                -- SECURITY CHECK: Verify user has access to the existing record's company
                IF NOT stockly.stockly_company_access(v_existing_company_id) THEN
                    RAISE EXCEPTION 'Access denied: You do not have permission to update recipes for this company';
                END IF;

                -- SECURITY CHECK: Prevent changing company_id
                IF NEW.company_id IS DISTINCT FROM v_existing_company_id THEN
                    RAISE EXCEPTION 'Security violation: Cannot change company_id of existing record';
                END IF;

                UPDATE stockly.recipes SET
                    name = NEW.name,
                    recipe_type = NEW.recipe_type,
                    yield_quantity = NEW.yield_quantity,
                    yield_unit = NEW.yield_unit,
                    sell_price = NEW.sell_price,
                    target_gp_percent = NEW.target_gp_percent,
                    total_cost = NEW.total_cost,
                    cost_per_portion = NEW.cost_per_portion,
                    actual_gp_percent = NEW.actual_gp_percent,
                    is_active = NEW.is_active,
                    updated_at = NOW()
                WHERE id = OLD.id;
                RETURN NEW;
            END;
            $inner$ LANGUAGE plpgsql SECURITY DEFINER;
        $func$;
        RAISE NOTICE 'Fixed update_recipes trigger with company access check';
    END IF;
END $$;

-- ============================================================================
-- HIGH FIX: Fix deliveries trigger functions (if they exist)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_deliveries') THEN
        EXECUTE $func$
            CREATE OR REPLACE FUNCTION public.insert_deliveries()
            RETURNS TRIGGER AS $inner$
            BEGIN
                -- SECURITY CHECK: Verify user has access to this company
                IF NOT stockly.stockly_company_access(NEW.company_id) THEN
                    RAISE EXCEPTION 'Access denied: You do not have permission to create deliveries for this company';
                END IF;

                INSERT INTO stockly.deliveries (
                    id, company_id, site_id, supplier_id, delivery_date, invoice_number,
                    invoice_total, status, notes, created_at, updated_at
                ) VALUES (
                    COALESCE(NEW.id, gen_random_uuid()), NEW.company_id, NEW.site_id, NEW.supplier_id,
                    NEW.delivery_date, NEW.invoice_number, NEW.invoice_total, NEW.status,
                    NEW.notes, COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW())
                );
                RETURN NEW;
            END;
            $inner$ LANGUAGE plpgsql SECURITY DEFINER;
        $func$;
        RAISE NOTICE 'Fixed insert_deliveries trigger with company access check';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_deliveries') THEN
        EXECUTE $func$
            CREATE OR REPLACE FUNCTION public.update_deliveries()
            RETURNS TRIGGER AS $inner$
            DECLARE
                v_existing_company_id UUID;
            BEGIN
                -- Get existing record's company_id
                SELECT company_id INTO v_existing_company_id
                FROM stockly.deliveries WHERE id = OLD.id;

                -- SECURITY CHECK: Verify user has access to the existing record's company
                IF NOT stockly.stockly_company_access(v_existing_company_id) THEN
                    RAISE EXCEPTION 'Access denied: You do not have permission to update deliveries for this company';
                END IF;

                -- SECURITY CHECK: Prevent changing company_id
                IF NEW.company_id IS DISTINCT FROM v_existing_company_id THEN
                    RAISE EXCEPTION 'Security violation: Cannot change company_id of existing record';
                END IF;

                UPDATE stockly.deliveries SET
                    site_id = NEW.site_id,
                    supplier_id = NEW.supplier_id,
                    delivery_date = NEW.delivery_date,
                    invoice_number = NEW.invoice_number,
                    invoice_total = NEW.invoice_total,
                    status = NEW.status,
                    notes = NEW.notes,
                    updated_at = NOW()
                WHERE id = OLD.id;
                RETURN NEW;
            END;
            $inner$ LANGUAGE plpgsql SECURITY DEFINER;
        $func$;
        RAISE NOTICE 'Fixed update_deliveries trigger with company access check';
    END IF;
END $$;

COMMIT;

SELECT 'Security fix applied: Public view triggers now include company access checks' as result;
