-- ============================================
-- Update RLS Policies for serving_equipment_library
-- ============================================
-- This script updates the Row Level Security policies for serving_equipment_library
-- to ensure they match the pattern used in other library tables.
-- Safe to run multiple times (idempotent).

-- Enable RLS if not already enabled
ALTER TABLE serving_equipment_library ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if they exist) before recreating them
-- This ensures we can update the policies safely

DROP POLICY IF EXISTS "Users can view serving equipment from their own company" ON serving_equipment_library;
CREATE POLICY "Users can view serving equipment from their own company"
  ON serving_equipment_library FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create serving equipment for their own company" ON serving_equipment_library;
CREATE POLICY "Users can create serving equipment for their own company"
  ON serving_equipment_library FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update serving equipment from their own company" ON serving_equipment_library;
CREATE POLICY "Users can update serving equipment from their own company"
  ON serving_equipment_library FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete serving equipment from their own company" ON serving_equipment_library;
CREATE POLICY "Users can delete serving equipment from their own company"
  ON serving_equipment_library FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Ensure permissions are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON serving_equipment_library TO authenticated;

-- Verify policies exist (optional - uncomment to check)
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'serving_equipment_library';

