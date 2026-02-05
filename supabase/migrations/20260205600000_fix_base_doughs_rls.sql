-- Migration: Fix RLS policies for base_doughs and lamination_styles
-- Use has_planly_site_access() function to match other planly tables

-- ============================================================================
-- FIX BASE DOUGHS RLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view base doughs for their sites" ON planly_base_doughs;
DROP POLICY IF EXISTS "Users can insert base doughs for their sites" ON planly_base_doughs;
DROP POLICY IF EXISTS "Users can update base doughs for their sites" ON planly_base_doughs;
DROP POLICY IF EXISTS "Users can delete base doughs for their sites" ON planly_base_doughs;

CREATE POLICY "base_doughs_select" ON planly_base_doughs FOR SELECT
  USING (has_planly_site_access(site_id));

CREATE POLICY "base_doughs_insert" ON planly_base_doughs FOR INSERT
  WITH CHECK (has_planly_site_access(site_id));

CREATE POLICY "base_doughs_update" ON planly_base_doughs FOR UPDATE
  USING (has_planly_site_access(site_id));

CREATE POLICY "base_doughs_delete" ON planly_base_doughs FOR DELETE
  USING (has_planly_site_access(site_id));

-- ============================================================================
-- FIX LAMINATION STYLES RLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view lamination styles for their sites" ON planly_lamination_styles;
DROP POLICY IF EXISTS "Users can insert lamination styles for their sites" ON planly_lamination_styles;
DROP POLICY IF EXISTS "Users can update lamination styles for their sites" ON planly_lamination_styles;
DROP POLICY IF EXISTS "Users can delete lamination styles for their sites" ON planly_lamination_styles;

-- Lamination styles access through their parent base_dough
CREATE POLICY "lamination_styles_select" ON planly_lamination_styles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM planly_base_doughs bd
      WHERE bd.id = planly_lamination_styles.base_dough_id
        AND has_planly_site_access(bd.site_id)
    )
  );

CREATE POLICY "lamination_styles_insert" ON planly_lamination_styles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM planly_base_doughs bd
      WHERE bd.id = planly_lamination_styles.base_dough_id
        AND has_planly_site_access(bd.site_id)
    )
  );

CREATE POLICY "lamination_styles_update" ON planly_lamination_styles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM planly_base_doughs bd
      WHERE bd.id = planly_lamination_styles.base_dough_id
        AND has_planly_site_access(bd.site_id)
    )
  );

CREATE POLICY "lamination_styles_delete" ON planly_lamination_styles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM planly_base_doughs bd
      WHERE bd.id = planly_lamination_styles.base_dough_id
        AND has_planly_site_access(bd.site_id)
    )
  );
