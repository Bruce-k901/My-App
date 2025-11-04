-- ============================================
-- Update RLS Policies for packaging_library
-- ============================================
-- This script updates the Row Level Security policies for packaging_library
-- to ensure they match the pattern used in other library tables.
-- Safe to run multiple times (idempotent).

-- Enable RLS if not already enabled
ALTER TABLE packaging_library ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if they exist) before recreating them
-- This ensures we can update the policies safely

DROP POLICY IF EXISTS "Users can view packaging from their own company" ON packaging_library;
CREATE POLICY "Users can view packaging from their own company"
  ON packaging_library FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create packaging for their own company" ON packaging_library;
CREATE POLICY "Users can create packaging for their own company"
  ON packaging_library FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update packaging from their own company" ON packaging_library;
CREATE POLICY "Users can update packaging from their own company"
  ON packaging_library FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete packaging from their own company" ON packaging_library;
CREATE POLICY "Users can delete packaging from their own company"
  ON packaging_library FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Ensure permissions are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON packaging_library TO authenticated;

-- Verify policies exist (optional - uncomment to check)
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'packaging_library';

