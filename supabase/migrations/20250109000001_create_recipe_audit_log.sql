-- Create audit log for recipe changes (excluding price/cost which use existing tables)
-- This migration only runs if stockly schema exists
DO $$
BEGIN
  -- Check if stockly schema exists - exit early if it doesn't
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping create_recipe_audit_log migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'stockly schema found - proceeding with create_recipe_audit_log migration';
END $$;

-- Only proceed if schema exists (checked above)
DO $$
BEGIN
  -- Check if stockly schema exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RETURN;
  END IF;

  -- 1. Create recipe audit log table
  CREATE TABLE IF NOT EXISTS stockly.recipe_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  recipe_id UUID NOT NULL REFERENCES stockly.recipes(id) ON DELETE CASCADE,
  
  -- Type of change
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',
    'ingredient_added',
    'ingredient_removed',
    'ingredient_quantity_changed',
    'ingredient_supplier_changed',
    'allergen_changed',
    'shelf_life_changed',
    'storage_changed',
    'status_changed',
    'version_created',
    'name_changed'
  )),
  
  -- Details
  change_summary TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  
  -- Who and when
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
    -- Additional data
    metadata JSONB
  );

  -- 2. Indexes
  CREATE INDEX IF NOT EXISTS idx_recipe_audit_recipe ON stockly.recipe_audit_log(recipe_id, changed_at DESC);
  CREATE INDEX IF NOT EXISTS idx_recipe_audit_company ON stockly.recipe_audit_log(company_id);
  CREATE INDEX IF NOT EXISTS idx_recipe_audit_event_type ON stockly.recipe_audit_log(event_type);

  -- 3. RLS
  ALTER TABLE stockly.recipe_audit_log ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS recipe_audit_select_policy ON stockly.recipe_audit_log;
  CREATE POLICY recipe_audit_select_policy ON stockly.recipe_audit_log
    FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
    );

  -- 4. Grant permissions
  GRANT SELECT ON stockly.recipe_audit_log TO authenticated;

END $$;

