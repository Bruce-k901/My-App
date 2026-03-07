-- Migration: Add recipe links to process templates and processing groups
-- Purpose: Enable automatic ingredient calculation for Dough Mix and Dough Sheets sections in Production Plan
-- Note: Recipe IDs reference the recipes view. Validation is done at the application level
--       since foreign keys cannot reference views.

-- ============================================================================
-- 1. Add recipe link and label to planly_process_templates
-- ============================================================================

ALTER TABLE planly_process_templates
  ADD COLUMN IF NOT EXISTS base_dough_recipe_id UUID,
  ADD COLUMN IF NOT EXISTS production_plan_label VARCHAR(100);

COMMENT ON COLUMN planly_process_templates.base_dough_recipe_id IS
  'Links to the base/foundation dough recipe (e.g., "Sweet Pastry Base Mix"). Used for Day -3/-2 ingredient scaling in Dough Mix sections. References recipes view (validated at app level).';

COMMENT ON COLUMN planly_process_templates.production_plan_label IS
  'User-defined label for production plan sections. Defaults to template name. Example: "Pastries" displays as "Dough Mix - Pastries"';

-- ============================================================================
-- 2. Add laminated sheet recipe link and label to planly_processing_groups
-- ============================================================================

ALTER TABLE planly_processing_groups
  ADD COLUMN IF NOT EXISTS laminated_sheet_recipe_id UUID,
  ADD COLUMN IF NOT EXISTS production_plan_label VARCHAR(100);

COMMENT ON COLUMN planly_processing_groups.laminated_sheet_recipe_id IS
  'Links to the finished laminated/prepared dough recipe (e.g., "Laminated Sheets - Buns"). Used for Day -1 sheet calculations in Dough Sheets sections.';

COMMENT ON COLUMN planly_processing_groups.production_plan_label IS
  'User-defined label for production plan display. Defaults to group name. Example: "Croissants" displays as "Croissants: 12 sheets"';

-- ============================================================================
-- 3. Create indexes for recipe lookups (partial indexes for non-null values)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_process_templates_base_recipe
  ON planly_process_templates(base_dough_recipe_id)
  WHERE base_dough_recipe_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_processing_groups_laminated_recipe
  ON planly_processing_groups(laminated_sheet_recipe_id)
  WHERE laminated_sheet_recipe_id IS NOT NULL;

-- ============================================================================
-- 4. Grant necessary permissions (if not already inherited)
-- ============================================================================

-- No additional grants needed as columns inherit table-level permissions
