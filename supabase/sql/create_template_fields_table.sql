-- Create template_fields table (renamed from task_fields per CHECKLIST_SCHEMA_UPDATES.md)
-- This table stores dynamic fields for task templates

CREATE TABLE IF NOT EXISTS public.template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  
  -- Field Definition
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'temperature', 'checkbox', 'pass_fail', 'select', 'date', 'signature', 'repeatable_record')),
  label TEXT NOT NULL, -- Renamed from field_label per schema updates
  
  -- Validation
  required BOOLEAN DEFAULT false, -- Renamed from is_required
  min_value NUMERIC,
  max_value NUMERIC,
  warn_threshold NUMERIC, -- Added per schema updates
  fail_threshold NUMERIC, -- Added per schema updates
  options JSONB, -- For select fields: [{"value": "pass", "label": "Pass"}, ...]
  
  -- Display
  field_order INTEGER DEFAULT 0, -- Renamed from display_order per schema updates
  help_text TEXT,
  label_value TEXT, -- Added per schema updates for repeatable labels
  
  -- Special handling
  triggers_action TEXT, -- 'fail_if_over', 'alert_if_under', etc
  action_value NUMERIC,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_template_fields_template 
  ON public.template_fields(template_id);

CREATE INDEX IF NOT EXISTS idx_template_fields_order 
  ON public.template_fields(template_id, field_order);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.template_fields_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_template_fields_updated ON public.template_fields;
CREATE TRIGGER trg_template_fields_updated
  BEFORE UPDATE ON public.template_fields
  FOR EACH ROW EXECUTE FUNCTION public.template_fields_set_updated_at();

-- Enable RLS
ALTER TABLE public.template_fields ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS template_fields_select ON public.template_fields;
DROP POLICY IF EXISTS template_fields_select_library ON public.template_fields;
DROP POLICY IF EXISTS template_fields_insert ON public.template_fields;
DROP POLICY IF EXISTS template_fields_update ON public.template_fields;
DROP POLICY IF EXISTS template_fields_delete ON public.template_fields;

-- RLS Policy: SELECT - Allow access to fields for templates the user can see
-- This includes both company templates and library templates (company_id IS NULL)
CREATE POLICY template_fields_select ON public.template_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      WHERE tt.id = template_fields.template_id
        AND (
          -- Library templates (company_id IS NULL) - accessible to all authenticated users
          tt.company_id IS NULL
          OR
          -- Company templates - only accessible to users in the same company
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.company_id = tt.company_id
          )
        )
    )
  );

-- RLS Policy: INSERT - Only admins/owners can insert
CREATE POLICY template_fields_insert ON public.template_fields
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      JOIN public.profiles p ON p.company_id = tt.company_id
      WHERE tt.id = template_fields.template_id
        AND p.id = auth.uid()
        AND LOWER(p.app_role::text) IN ('admin', 'owner')
    )
  );

-- RLS Policy: UPDATE - Only admins/owners can update
CREATE POLICY template_fields_update ON public.template_fields
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      JOIN public.profiles p ON p.company_id = tt.company_id
      WHERE tt.id = template_fields.template_id
        AND p.id = auth.uid()
        AND LOWER(p.app_role::text) IN ('admin', 'owner')
    )
  );

-- RLS Policy: DELETE - Only admins/owners can delete
CREATE POLICY template_fields_delete ON public.template_fields
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      JOIN public.profiles p ON p.company_id = tt.company_id
      WHERE tt.id = template_fields.template_id
        AND p.id = auth.uid()
        AND LOWER(p.app_role::text) IN ('admin', 'owner')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_fields TO authenticated;

-- Comments
COMMENT ON TABLE public.template_fields IS 'Dynamic fields for task templates. Stores field definitions, validation rules, and display order.';
COMMENT ON COLUMN public.template_fields.template_id IS 'References task_templates.id - links field to its template';
COMMENT ON COLUMN public.template_fields.field_order IS 'Display order of fields in the form (0 = first)';
COMMENT ON COLUMN public.template_fields.warn_threshold IS 'Warning threshold for numeric fields (e.g., temperature)';
COMMENT ON COLUMN public.template_fields.fail_threshold IS 'Failure threshold for numeric fields (e.g., temperature)';

