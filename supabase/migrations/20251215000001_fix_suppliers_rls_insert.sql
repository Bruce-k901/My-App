-- ============================================================================
-- Migration: Fix Suppliers RLS Policy for INSERT Operations
-- Description: Adds WITH CHECK clause to suppliers RLS policy to allow INSERTs
-- Date: 2025-12-15
-- ============================================================================

-- Fix the suppliers RLS policy to include WITH CHECK for INSERT operations
-- The existing policy only has USING which works for SELECT/UPDATE/DELETE
-- but INSERT operations require WITH CHECK clause
-- 
-- Note: The actual table is stockly.suppliers, not public.suppliers (which is a view)
-- The view inherits RLS from the underlying table

DO $$
BEGIN
  -- Check if stockly.suppliers table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stockly' AND table_name = 'suppliers') THEN
    -- Drop the existing policy
    DROP POLICY IF EXISTS suppliers_company ON stockly.suppliers;
    
    -- Recreate with both USING and WITH CHECK clauses
    -- USING is for SELECT/UPDATE/DELETE, WITH CHECK is for INSERT/UPDATE
    CREATE POLICY suppliers_company ON stockly.suppliers 
      FOR ALL 
      USING (stockly.stockly_company_access(company_id))
      WITH CHECK (stockly.stockly_company_access(company_id));
  END IF;
END $$;
