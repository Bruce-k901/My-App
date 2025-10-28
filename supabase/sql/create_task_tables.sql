-- Task Fields Table
-- Dynamic fields for task templates (temperature ranges, checkboxes, text inputs, etc.)

CREATE TABLE IF NOT EXISTS public.task_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  
  -- Field Definition
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'temperature', 'checkbox', 'pass_fail', 'select', 'date', 'signature')),
  
  -- Validation
  is_required BOOLEAN DEFAULT false,
  min_value NUMERIC,
  max_value NUMERIC,
  options JSONB, -- For select fields: [{"value": "pass", "label": "Pass"}, ...]
  
  -- Display
  display_order INTEGER DEFAULT 0,
  help_text TEXT,
  
  -- Special handling
  triggers_action TEXT, -- 'fail_if_over', 'alert_if_under', etc
  action_value NUMERIC,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_fields_template 
  ON public.task_fields(task_template_id);

CREATE INDEX IF NOT EXISTS idx_task_fields_order 
  ON public.task_fields(task_template_id, display_order);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.task_fields_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_task_fields_updated ON public.task_fields;
CREATE TRIGGER trg_task_fields_updated
  BEFORE UPDATE ON public.task_fields
  FOR EACH ROW EXECUTE FUNCTION public.task_fields_set_updated_at();

-- Enable RLS
ALTER TABLE public.task_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from task_templates)
CREATE POLICY task_fields_select ON public.task_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      JOIN public.profiles p ON p.company_id = tt.company_id
      WHERE tt.id = task_fields.task_template_id
        AND p.id = auth.uid()
    )
  );

CREATE POLICY task_fields_insert ON public.task_fields
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      JOIN public.profiles p ON p.company_id = tt.company_id
      WHERE tt.id = task_fields.task_template_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
    )
  );

CREATE POLICY task_fields_update ON public.task_fields
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      JOIN public.profiles p ON p.company_id = tt.company_id
      WHERE tt.id = task_fields.task_template_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
    )
  );

CREATE POLICY task_fields_delete ON public.task_fields
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      JOIN public.profiles p ON p.company_id = tt.company_id
      WHERE tt.id = task_fields.task_template_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_fields TO authenticated;

-- Task Instances Table
-- Individual instances of tasks scheduled from templates

CREATE TABLE IF NOT EXISTS public.task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  due_datetime TIMESTAMPTZ,
  
  -- Assignment
  assigned_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  
  -- Customization (if template was cloned)
  custom_name TEXT,
  custom_instructions TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'overdue', 'failed')),
  
  -- Completion tracking
  completed_at TIMESTAMPTZ,
  completed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Failure handling
  failure_reason TEXT,
  contractor_notified BOOLEAN DEFAULT false,
  contractor_notified_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_instances_template 
  ON public.task_instances(task_template_id);

CREATE INDEX IF NOT EXISTS idx_task_instances_company 
  ON public.task_instances(company_id);

CREATE INDEX IF NOT EXISTS idx_task_instances_scheduled 
  ON public.task_instances(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_task_instances_status 
  ON public.task_instances(status) 
  WHERE status IN ('pending', 'in_progress', 'overdue');

CREATE INDEX IF NOT EXISTS idx_task_instances_assigned 
  ON public.task_instances(assigned_to_user_id) 
  WHERE status IN ('pending', 'in_progress', 'overdue');

CREATE INDEX IF NOT EXISTS idx_task_instances_site 
  ON public.task_instances(site_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.task_instances_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_task_instances_updated ON public.task_instances;
CREATE TRIGGER trg_task_instances_updated
  BEFORE UPDATE ON public.task_instances
  FOR EACH ROW EXECUTE FUNCTION public.task_instances_set_updated_at();

-- Enable RLS
ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY task_instances_select_company ON public.task_instances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = task_instances.company_id
    )
  );

CREATE POLICY task_instances_insert_company ON public.task_instances
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = task_instances.company_id
    )
  );

CREATE POLICY task_instances_update_company ON public.task_instances
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = task_instances.company_id
    )
  );

CREATE POLICY task_instances_delete_company ON public.task_instances
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = task_instances.company_id
        AND p.role IN ('owner', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_instances TO authenticated;

-- Task Completion Logs Table
-- Actual completion data with field values and evidence

CREATE TABLE IF NOT EXISTS public.task_completion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_instance_id UUID NOT NULL REFERENCES public.task_instances(id) ON DELETE CASCADE,
  
  -- Field responses
  field_responses JSONB NOT NULL DEFAULT '{}'::JSONB, -- {field_name: value, ...}
  
  -- Evidence
  photos TEXT[], -- URLs to uploaded photos
  signatures JSONB, -- Array of signature objects
  
  -- Metadata
  completed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completion_location JSONB, -- GPS coordinates if available
  
  -- Results
  passed BOOLEAN,
  failure_reason TEXT,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_completion_logs_instance 
  ON public.task_completion_logs(task_instance_id);

CREATE INDEX IF NOT EXISTS idx_task_completion_logs_completed 
  ON public.task_completion_logs(completed_at);

CREATE INDEX IF NOT EXISTS idx_task_completion_logs_user 
  ON public.task_completion_logs(completed_by_user_id);

CREATE INDEX IF NOT EXISTS idx_task_completion_logs_passed 
  ON public.task_completion_logs(passed) 
  WHERE passed = false;

-- Enable RLS
ALTER TABLE public.task_completion_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from task_instances)
CREATE POLICY task_completion_logs_select ON public.task_completion_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.task_instances ti
      JOIN public.profiles p ON p.company_id = ti.company_id
      WHERE ti.id = task_completion_logs.task_instance_id
        AND p.id = auth.uid()
    )
  );

CREATE POLICY task_completion_logs_insert ON public.task_completion_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.task_instances ti
      JOIN public.profiles p ON p.company_id = ti.company_id
      WHERE ti.id = task_completion_logs.task_instance_id
        AND p.id = auth.uid()
    )
  );

CREATE POLICY task_completion_logs_update ON public.task_completion_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.task_instances ti
      JOIN public.profiles p ON p.company_id = ti.company_id
      WHERE ti.id = task_completion_logs.task_instance_id
        AND p.id = auth.uid()
    )
  );

CREATE POLICY task_completion_logs_delete ON public.task_completion_logs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.task_instances ti
      JOIN public.profiles p ON p.company_id = ti.company_id
      WHERE ti.id = task_completion_logs.task_instance_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_completion_logs TO authenticated;

-- Comments
COMMENT ON TABLE public.task_fields IS 'Dynamic fields for task templates';
COMMENT ON TABLE public.task_instances IS 'Individual instances of tasks scheduled from templates';
COMMENT ON TABLE public.task_completion_logs IS 'Actual completion data with field values and evidence';

