-- ============================================================================
-- Migration: Fix deliveries trigger functions to use correct column names
-- Description: The security migration (20260204300002) overwrote the correct
--              insert_deliveries and update_deliveries triggers with versions
--              referencing non-existent columns (invoice_total, notes).
--              This migration restores the correct column references.
-- ============================================================================

-- Fix INSERT trigger to handle all actual stockly.deliveries columns
CREATE OR REPLACE FUNCTION public.insert_deliveries()
RETURNS TRIGGER AS $$
DECLARE
    new_id UUID;
BEGIN
    -- SECURITY CHECK: Verify user has access to this company
    IF NOT stockly.stockly_company_access(NEW.company_id) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to create deliveries for this company';
    END IF;

    INSERT INTO stockly.deliveries (
        id, company_id, site_id, supplier_id, purchase_order_id,
        delivery_date, delivery_note_number, invoice_number, invoice_date,
        subtotal, vat_total, total, tax,
        ai_processed, ai_confidence, ai_extraction,
        requires_review, document_urls,
        status, received_by, confirmed_by, confirmed_at,
        created_at, updated_at
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.company_id, NEW.site_id, NEW.supplier_id, NEW.purchase_order_id,
        COALESCE(NEW.delivery_date, CURRENT_DATE), NEW.delivery_note_number,
        NEW.invoice_number, NEW.invoice_date,
        NEW.subtotal, NEW.vat_total, NEW.total, NEW.tax,
        COALESCE(NEW.ai_processed, FALSE), NEW.ai_confidence, NEW.ai_extraction,
        COALESCE(NEW.requires_review, FALSE), NEW.document_urls,
        COALESCE(NEW.status, 'draft'), NEW.received_by, NEW.confirmed_by, NEW.confirmed_at,
        COALESCE(NEW.created_at, NOW()), NOW()
    )
    RETURNING id INTO new_id;
    NEW.id := new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix UPDATE trigger to handle all actual stockly.deliveries columns
CREATE OR REPLACE FUNCTION public.update_deliveries()
RETURNS TRIGGER AS $$
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
        delivery_note_number = NEW.delivery_note_number,
        invoice_number = NEW.invoice_number,
        invoice_date = NEW.invoice_date,
        subtotal = COALESCE(NEW.subtotal, OLD.subtotal),
        vat_total = COALESCE(NEW.vat_total, OLD.vat_total),
        total = COALESCE(NEW.total, OLD.total),
        tax = COALESCE(NEW.tax, OLD.tax),
        status = COALESCE(NEW.status, OLD.status),
        ai_processed = COALESCE(NEW.ai_processed, OLD.ai_processed),
        ai_confidence = COALESCE(NEW.ai_confidence, OLD.ai_confidence),
        ai_extraction = COALESCE(NEW.ai_extraction, OLD.ai_extraction),
        requires_review = COALESCE(NEW.requires_review, OLD.requires_review),
        document_urls = COALESCE(NEW.document_urls, OLD.document_urls),
        confirmed_by = NEW.confirmed_by,
        confirmed_at = NEW.confirmed_at,
        updated_at = NOW()
    WHERE id = OLD.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
