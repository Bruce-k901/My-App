-- Task Templates Table
-- Blueprint for all compliance tasks with scheduling, assignment, and evidence tracking

CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Basic Info
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  
  -- Categorization
  category TEXT NOT NULL CHECK (category IN ('food_safety', 'h_and_s', 'fire', 'cleaning', 'compliance')),
  
  -- Scheduling
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'triggered', 'once')),
  recurrence_pattern JSONB, -- {days: [1,3,5], weeks: [1,2], date_of_month: 1}
  time_of_day TEXT, -- 'before_open', '09:00', 'after_service', 'anytime'
  dayparts TEXT[], -- ['before_open', 'during_service', 'after_service']
  
  -- Assignment
  assigned_to_role TEXT, -- 'kitchen_manager', 'chef', 'floor_manager', etc
  assigned_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  asset_type TEXT, -- 'fridge', 'freezer', 'fire_alarm', 'fryer'
  
  -- Content
  instructions TEXT, -- Task steps/SOP content
  repeatable_field_name TEXT, -- For multi-record tasks (e.g., "fridge_name")
  
  -- Evidence Requirements
  evidence_types TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['photo', 'temperature', 'pass_fail', 'text_note', 'signature']
  
  -- Linking
  requires_sop BOOLEAN DEFAULT false,
  linked_sop_id UUID REFERENCES public.sops(id) ON DELETE SET NULL,
  linked_risk_id UUID, -- Will reference risk_assessments table when created
  
  -- Compliance
  compliance_standard TEXT, -- "Food Safety Act", "HACCP", "Fire Safety Order 2005"
  audit_category TEXT, -- For reporting grouping
  is_critical BOOLEAN DEFAULT false, -- Non-negotiable compliance
  
  -- Automation
  triggers_contractor_on_failure BOOLEAN DEFAULT false,
  contractor_type TEXT, -- 'pest_control', 'fire_engineer', 'equipment_repair'
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_template_library BOOLEAN DEFAULT true, -- Part of plug-and-play library
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_templates_company_category 
  ON public.task_templates(company_id, category) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_task_templates_library 
  ON public.task_templates(is_template_library) 
  WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_templates_slug 
  ON public.task_templates(company_id, slug);

CREATE INDEX IF NOT EXISTS idx_task_templates_site 
  ON public.task_templates(site_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_task_templates_asset 
  ON public.task_templates(asset_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_task_templates_frequency 
  ON public.task_templates(frequency) 
  WHERE is_active = true;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.task_templates_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_task_templates_updated ON public.task_templates;
CREATE TRIGGER trg_task_templates_updated
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.task_templates_set_updated_at();

-- Enable RLS
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY task_templates_select_company ON public.task_templates
  FOR SELECT USING (
    company_id IS NULL OR -- Global templates visible to all
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = task_templates.company_id
    )
  );

CREATE POLICY task_templates_insert_company ON public.task_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = task_templates.company_id
        AND p.role IN ('owner', 'admin')
    )
  );

CREATE POLICY task_templates_update_company ON public.task_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = task_templates.company_id
        AND p.role IN ('owner', 'admin')
    )
  );

CREATE POLICY task_templates_delete_company ON public.task_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = task_templates.company_id
        AND p.role IN ('owner', 'admin')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_templates TO authenticated;

-- Comments
COMMENT ON TABLE public.task_templates IS 'Core library templates for compliance tasks. Blueprint for all tasks with frequency, assignment, fields, and compliance metadata.';
COMMENT ON COLUMN public.task_templates.company_id IS 'NULL for global library templates, company_id for custom templates';
COMMENT ON COLUMN public.task_templates.repeatable_field_name IS 'For multi-record tasks (e.g., "fridge_name" allows multiple fridge checks in one task)';
COMMENT ON COLUMN public.task_templates.evidence_types IS 'Array of required evidence types: photo, temperature, pass_fail, text_note, signature';
COMMENT ON COLUMN public.task_templates.is_template_library IS 'True for plug-and-play library templates, false for customized instances';

