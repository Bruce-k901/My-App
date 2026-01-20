-- ============================================================================
-- Migration: Verify and Fix Suppliers View Access
-- Description: Ensures the public.suppliers view has proper permissions
-- and can access stockly.suppliers data through RLS
-- Date: 2025-12-15
-- ============================================================================

-- First, let's verify suppliers exist in stockly.suppliers
DO $$
DECLARE
  v_count INTEGER;
  v_company_id UUID;
  v_sample_supplier RECORD;
BEGIN
  -- Check if any suppliers exist
  SELECT COUNT(*) INTO v_count FROM stockly.suppliers;
  RAISE NOTICE 'Total suppliers in stockly.suppliers: %', v_count;
  
  -- Show sample suppliers (check which columns exist first)
  FOR v_sample_supplier IN 
    SELECT id, company_id, name, code, is_active
    FROM stockly.suppliers 
    LIMIT 5
  LOOP
    RAISE NOTICE 'Sample supplier: id=%, company_id=%, name=%, code=%, is_active=%', 
      v_sample_supplier.id, 
      v_sample_supplier.company_id, 
      v_sample_supplier.name, 
      v_sample_supplier.code,
      v_sample_supplier.is_active;
  END LOOP;
  
  -- Check if is_approved column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'suppliers' 
    AND column_name = 'is_approved'
  ) THEN
    RAISE NOTICE 'Column is_approved exists in stockly.suppliers';
  ELSE
    RAISE WARNING 'Column is_approved does NOT exist in stockly.suppliers - may need to add it';
  END IF;
  
  -- Check suppliers per company
  FOR v_company_id IN 
    SELECT DISTINCT company_id FROM stockly.suppliers LIMIT 10
  LOOP
    SELECT COUNT(*) INTO v_count 
    FROM stockly.suppliers 
    WHERE company_id = v_company_id;
    RAISE NOTICE 'Company % has % suppliers', v_company_id, v_count;
  END LOOP;
END $$;

-- Ensure the view exists and points to the right table
DO $$
BEGIN
  -- Drop and recreate the view to ensure it's correct
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'suppliers') THEN
    DROP VIEW IF EXISTS public.suppliers CASCADE;
  END IF;
  
  -- Recreate the view
  CREATE VIEW public.suppliers AS
  SELECT * FROM stockly.suppliers;
  
  -- Set security_invoker so RLS from underlying table applies
  ALTER VIEW public.suppliers SET (security_invoker = true);
  
  -- Grant permissions to authenticated users
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
  
  RAISE NOTICE 'View public.suppliers recreated and permissions granted';
END $$;

-- Create INSERT trigger function (must be outside DO block)
-- Dynamically handle is_approved column if it exists
CREATE OR REPLACE FUNCTION public.insert_suppliers()
RETURNS TRIGGER AS $$
DECLARE
  v_has_is_approved BOOLEAN;
BEGIN
  -- Check if is_approved column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'suppliers' 
    AND column_name = 'is_approved'
  ) INTO v_has_is_approved;
  
  IF v_has_is_approved THEN
    INSERT INTO stockly.suppliers (
      id, company_id, name, code, contact_name, email, phone, address,
      ordering_method, ordering_config, payment_terms_days, minimum_order_value,
      delivery_days, lead_time_days, account_number, is_active, is_approved,
      created_at, updated_at
    ) VALUES (
      COALESCE(NEW.id, gen_random_uuid()), NEW.company_id, NEW.name, NEW.code,
      NEW.contact_name, NEW.email, NEW.phone, NEW.address, NEW.ordering_method,
      NEW.ordering_config, NEW.payment_terms_days, NEW.minimum_order_value,
      NEW.delivery_days, NEW.lead_time_days, NEW.account_number,
      COALESCE(NEW.is_active, true), COALESCE(NEW.is_approved, true),
      COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW())
    );
  ELSE
    INSERT INTO stockly.suppliers (
      id, company_id, name, code, contact_name, email, phone, address,
      ordering_method, ordering_config, payment_terms_days, minimum_order_value,
      delivery_days, lead_time_days, account_number, is_active,
      created_at, updated_at
    ) VALUES (
      COALESCE(NEW.id, gen_random_uuid()), NEW.company_id, NEW.name, NEW.code,
      NEW.contact_name, NEW.email, NEW.phone, NEW.address, NEW.ordering_method,
      NEW.ordering_config, NEW.payment_terms_days, NEW.minimum_order_value,
      NEW.delivery_days, NEW.lead_time_days, NEW.account_number,
      COALESCE(NEW.is_active, true),
      COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create UPDATE trigger function
CREATE OR REPLACE FUNCTION public.update_suppliers()
RETURNS TRIGGER AS $$
DECLARE
  v_has_is_approved BOOLEAN;
BEGIN
  -- Check if is_approved column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'suppliers' 
    AND column_name = 'is_approved'
  ) INTO v_has_is_approved;
  
  IF v_has_is_approved THEN
    UPDATE stockly.suppliers SET 
      company_id = NEW.company_id,
      name = NEW.name,
      code = NEW.code,
      contact_name = NEW.contact_name,
      email = NEW.email,
      phone = NEW.phone,
      address = NEW.address,
      ordering_method = NEW.ordering_method,
      ordering_config = NEW.ordering_config,
      payment_terms_days = NEW.payment_terms_days,
      minimum_order_value = NEW.minimum_order_value,
      delivery_days = NEW.delivery_days,
      lead_time_days = NEW.lead_time_days,
      account_number = NEW.account_number,
      is_active = NEW.is_active,
      is_approved = NEW.is_approved,
      updated_at = NOW()
    WHERE id = NEW.id;
  ELSE
    UPDATE stockly.suppliers SET 
      company_id = NEW.company_id,
      name = NEW.name,
      code = NEW.code,
      contact_name = NEW.contact_name,
      email = NEW.email,
      phone = NEW.phone,
      address = NEW.address,
      ordering_method = NEW.ordering_method,
      ordering_config = NEW.ordering_config,
      payment_terms_days = NEW.payment_terms_days,
      minimum_order_value = NEW.minimum_order_value,
      delivery_days = NEW.delivery_days,
      lead_time_days = NEW.lead_time_days,
      account_number = NEW.account_number,
      is_active = NEW.is_active,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create DELETE trigger function
CREATE OR REPLACE FUNCTION public.delete_suppliers()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.suppliers WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create INSERT/UPDATE/DELETE triggers for suppliers view
DO $$
BEGIN
  -- Drop existing triggers if they exist
  DROP TRIGGER IF EXISTS suppliers_insert_trigger ON public.suppliers;
  DROP TRIGGER IF EXISTS suppliers_update_trigger ON public.suppliers;
  DROP TRIGGER IF EXISTS suppliers_delete_trigger ON public.suppliers;
  
  -- Create triggers
  CREATE TRIGGER suppliers_insert_trigger
    INSTEAD OF INSERT ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.insert_suppliers();
  
  CREATE TRIGGER suppliers_update_trigger
    INSTEAD OF UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.update_suppliers();
  
  CREATE TRIGGER suppliers_delete_trigger
    INSTEAD OF DELETE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.delete_suppliers();
  
  RAISE NOTICE 'INSERT/UPDATE/DELETE triggers created for public.suppliers';
END $$;

-- Verify RLS is enabled on the underlying table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stockly' AND table_name = 'suppliers') THEN
    -- Enable RLS if not already enabled
    ALTER TABLE stockly.suppliers ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on stockly.suppliers';
  END IF;
END $$;

-- Check if the RLS policy exists and is correct
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stockly' AND table_name = 'suppliers') THEN
    -- Verify policy exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'stockly' 
      AND tablename = 'suppliers' 
      AND policyname = 'suppliers_company'
    ) THEN
      RAISE WARNING 'RLS policy suppliers_company does not exist on stockly.suppliers';
    ELSE
      RAISE NOTICE 'RLS policy suppliers_company exists on stockly.suppliers';
      
      -- Check if policy has WITH CHECK clause
      IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'stockly' 
        AND tablename = 'suppliers' 
        AND policyname = 'suppliers_company'
        AND with_check IS NOT NULL
      ) THEN
        RAISE NOTICE 'RLS policy has WITH CHECK clause (good for INSERT)';
      ELSE
        RAISE WARNING 'RLS policy missing WITH CHECK clause - INSERT may fail';
      END IF;
    END IF;
  END IF;
END $$;

-- Test querying the view (this will show if RLS is blocking)
DO $$
DECLARE
  v_view_count INTEGER;
  v_table_count INTEGER;
BEGIN
  -- Count from underlying table (bypasses view)
  SELECT COUNT(*) INTO v_table_count FROM stockly.suppliers;
  
  -- Count from view (subject to RLS)
  SELECT COUNT(*) INTO v_view_count FROM public.suppliers;
  
  RAISE NOTICE 'Direct table count: %, View count: %', v_table_count, v_view_count;
  
  IF v_table_count > 0 AND v_view_count = 0 THEN
    RAISE WARNING 'Suppliers exist in table but view returns 0 - RLS may be blocking access';
  ELSIF v_table_count = 0 THEN
    RAISE WARNING 'No suppliers found in stockly.suppliers table - backfill may not have run or created any suppliers';
  ELSE
    RAISE NOTICE 'View is accessible and returning data correctly';
  END IF;
END $$;
