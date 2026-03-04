-- Fix: Allow service-role (auth.uid() IS NULL) to insert into sales_imports.
-- The sync engine and debug endpoints use getSupabaseAdmin() which bypasses RLS
-- but INSTEAD OF triggers still fire. When auth.uid() is NULL the
-- stockly_company_access check fails, blocking import record creation.

CREATE OR REPLACE FUNCTION public.insert_sales_imports()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow service-role requests (auth.uid() IS NULL) to bypass the check.
    -- Regular user requests still go through company access verification.
    IF auth.uid() IS NOT NULL
       AND NOT stockly.stockly_company_access(NEW.company_id) THEN
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

-- Also fix the update trigger for sales_imports (same issue on import completion)
CREATE OR REPLACE FUNCTION public.update_sales_imports()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IS NOT NULL
       AND NOT stockly.stockly_company_access(NEW.company_id) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to update sales imports for this company';
    END IF;

    UPDATE stockly.sales_imports SET
        records_total = NEW.records_total,
        records_imported = NEW.records_imported,
        records_failed = NEW.records_failed,
        revenue_total = NEW.revenue_total,
        status = NEW.status,
        completed_at = NEW.completed_at
    WHERE id = OLD.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
