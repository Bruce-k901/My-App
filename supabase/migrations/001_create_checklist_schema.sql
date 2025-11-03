-- Migration: 001_create_checklist_schema.sql
-- Description: Creates complete checklist/task template system per DEV_BRIEF_Checklist_Database.md
-- Tables: task_templates, template_fields, template_repeatable_labels, checklist_tasks, task_completion_records, contractor_callouts
-- Author: Checkly Development Team
-- Date: 2025-01-23

-- ============================================================================
-- TABLE 1: task_templates - The compliance library blueprint
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Identity
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  
  -- Categorization
  category TEXT NOT NULL CHECK (category IN ('food_safety', 'h_and_s', 'fire', 'cleaning', 'compliance')),
  audit_category TEXT,
  
  -- Scheduling
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually', 'triggered', 'once')),
  recurrence_pattern JSONB,
  time_of_day TEXT,
  dayparts TEXT[] DEFAULT '{}',
  
  -- Assignment
  assigned_to_role TEXT,
  assigned_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Context
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  asset_type TEXT,
  
  -- Content
  instructions TEXT,
  repeatable_field_name TEXT,
  
  -- Evidence & Requirements
  evidence_types TEXT[] DEFAULT '{}',
  requires_sop BOOLEAN DEFAULT FALSE,
  requires_risk_assessment BOOLEAN DEFAULT FALSE,
  linked_sop_id UUID REFERENCES public.sop_entries(id) ON DELETE SET NULL,
  linked_risk_id UUID REFERENCES public.risk_assessments(id) ON DELETE SET NULL,
  
  -- Compliance Metadata
  compliance_standard TEXT,
  is_critical BOOLEAN DEFAULT FALSE,
  
  -- Contractor Integration
  triggers_contractor_on_failure BOOLEAN DEFAULT FALSE,
  contractor_type TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_template_library BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_slug_per_company UNIQUE(company_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_task_templates_company_active ON public.task_templates(company_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_task_templates_library ON public.task_templates(is_template_library) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_task_templates_category ON public.task_templates(category, company_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_task_templates_site ON public.task_templates(site_id) WHERE is_active = TRUE;

-- ============================================================================
-- TABLE 2: template_fields - Define custom fields for each template
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  
  -- Field Definition
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'repeatable_record', 'photo', 'pass_fail', 'signature', 'date', 'time')),
  label TEXT NOT NULL,
  placeholder TEXT,
  
  -- Validation
  required BOOLEAN DEFAULT FALSE,
  min_value NUMERIC,
  max_value NUMERIC,
  warn_threshold NUMERIC,
  fail_threshold NUMERIC,
  
  -- Options for select/radio fields
  options JSONB,
  
  -- Display
  field_order INTEGER NOT NULL DEFAULT 0,
  help_text TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_fields_template_id ON public.template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_template_fields_order ON public.template_fields(template_id, field_order);

-- ============================================================================
-- TABLE 3: template_repeatable_labels - Pre-defined options for repeatable fields
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.template_repeatable_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  
  -- Pre-defined labels users can add
  label TEXT NOT NULL,
  label_value TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_label_per_template UNIQUE(template_id, label)
);

CREATE INDEX IF NOT EXISTS idx_repeatable_labels_template_id ON public.template_repeatable_labels(template_id);

-- ============================================================================
-- TABLE 4: checklist_tasks - Generated task instances
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.checklist_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  
  -- Scheduling
  due_date DATE NOT NULL,
  due_time TIME,
  daypart TEXT,
  
  -- Assignment
  assigned_to_role TEXT,
  assigned_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed', 'overdue')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Completion
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completion_notes TEXT,
  
  -- Flags & Escalation
  flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  escalated BOOLEAN DEFAULT FALSE,
  escalated_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  escalation_reason TEXT,
  
  -- Contractor Integration
  contractor_notify_on_fail BOOLEAN DEFAULT FALSE,
  contractor_type TEXT,
  contractor_notified_at TIMESTAMPTZ,
  
  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_tasks_site_status ON public.checklist_tasks(site_id, status);
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_due_date ON public.checklist_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_assigned_user ON public.checklist_tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_template_date ON public.checklist_tasks(template_id, due_date);
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_company_site_date ON public.checklist_tasks(company_id, site_id, due_date);

-- ============================================================================
-- TABLE 5: task_completion_records - Immutable audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_completion_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.checklist_tasks(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  
  -- Who & When
  completed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER,
  
  -- Evidence & Data
  completion_data JSONB NOT NULL,
  evidence_attachments TEXT[],
  
  -- Flags
  flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  
  -- Acknowledgments
  sop_acknowledged BOOLEAN DEFAULT FALSE,
  risk_acknowledged BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_evidence_not_empty CHECK (completion_data IS NOT NULL AND completion_data != '{}'::jsonb)
);

CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON public.task_completion_records(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_template_date ON public.task_completion_records(template_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_task_completions_site_date ON public.task_completion_records(site_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_task_completions_completed_by ON public.task_completion_records(completed_by);
CREATE INDEX IF NOT EXISTS idx_task_completions_company_date ON public.task_completion_records(company_id, completed_at);

-- ============================================================================
-- TABLE 6: contractor_callouts - Triggered when tasks fail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contractor_callouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  
  -- Trigger
  triggered_by_task_id UUID REFERENCES public.checklist_tasks(id) ON DELETE SET NULL,
  triggered_by_template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE RESTRICT,
  
  -- Contractor Details
  contractor_type TEXT NOT NULL,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  
  -- Request
  issue_description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
  requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  
  -- Evidence & Notes
  contractor_notes TEXT,
  completion_photos TEXT[],
  invoice_reference TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contractor_callouts_site ON public.contractor_callouts(site_id);
CREATE INDEX IF NOT EXISTS idx_contractor_callouts_status ON public.contractor_callouts(status);
CREATE INDEX IF NOT EXISTS idx_contractor_callouts_contractor ON public.contractor_callouts(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_callouts_requested_date ON public.contractor_callouts(requested_date);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.task_templates_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION public.checklist_tasks_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION public.contractor_callouts_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_task_templates_updated ON public.task_templates;
CREATE TRIGGER trg_task_templates_updated
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.task_templates_set_updated_at();

DROP TRIGGER IF EXISTS trg_checklist_tasks_updated ON public.checklist_tasks;
CREATE TRIGGER trg_checklist_tasks_updated
  BEFORE UPDATE ON public.checklist_tasks
  FOR EACH ROW EXECUTE FUNCTION public.checklist_tasks_set_updated_at();

DROP TRIGGER IF EXISTS trg_contractor_callouts_updated ON public.contractor_callouts;
CREATE TRIGGER trg_contractor_callouts_updated
  BEFORE UPDATE ON public.contractor_callouts
  FOR EACH ROW EXECUTE FUNCTION public.contractor_callouts_set_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_repeatable_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completion_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_callouts ENABLE ROW LEVEL SECURITY;

-- task_templates policies
DROP POLICY IF EXISTS "Users can view templates for their company" ON public.task_templates;
CREATE POLICY "Users can view templates for their company"
  ON public.task_templates FOR SELECT
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    OR company_id IS NULL
  );

DROP POLICY IF EXISTS "Admins can create templates" ON public.task_templates;
CREATE POLICY "Admins can create templates"
  ON public.task_templates FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT app_role FROM public.profiles WHERE id = auth.uid()) IN ('Owner', 'Admin')
  );

DROP POLICY IF EXISTS "Admins can update templates" ON public.task_templates;
CREATE POLICY "Admins can update templates"
  ON public.task_templates FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT app_role FROM public.profiles WHERE id = auth.uid()) IN ('Owner', 'Admin')
  );

DROP POLICY IF EXISTS "Admins can delete templates" ON public.task_templates;
CREATE POLICY "Admins can delete templates"
  ON public.task_templates FOR DELETE
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT app_role FROM public.profiles WHERE id = auth.uid()) IN ('Owner', 'Admin')
  );

-- template_fields policies (inherit from task_templates)
DROP POLICY IF EXISTS "Users can view fields for accessible templates" ON public.template_fields;
CREATE POLICY "Users can view fields for accessible templates"
  ON public.template_fields FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM public.task_templates
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR company_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Admins can modify fields" ON public.template_fields;
CREATE POLICY "Admins can modify fields"
  ON public.template_fields FOR ALL
  USING (
    template_id IN (
      SELECT id FROM public.task_templates
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND (SELECT app_role FROM public.profiles WHERE id = auth.uid()) IN ('Owner', 'Admin')
    )
  );

-- template_repeatable_labels policies (inherit from task_templates)
DROP POLICY IF EXISTS "Users can view repeatable labels for accessible templates" ON public.template_repeatable_labels;
CREATE POLICY "Users can view repeatable labels for accessible templates"
  ON public.template_repeatable_labels FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM public.task_templates
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR company_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Admins can modify repeatable labels" ON public.template_repeatable_labels;
CREATE POLICY "Admins can modify repeatable labels"
  ON public.template_repeatable_labels FOR ALL
  USING (
    template_id IN (
      SELECT id FROM public.task_templates
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND (SELECT app_role FROM public.profiles WHERE id = auth.uid()) IN ('Owner', 'Admin')
    )
  );

-- checklist_tasks policies
DROP POLICY IF EXISTS "Users can view tasks for their company" ON public.checklist_tasks;
CREATE POLICY "Users can view tasks for their company"
  ON public.checklist_tasks FOR SELECT
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their assigned tasks" ON public.checklist_tasks;
CREATE POLICY "Users can update their assigned tasks"
  ON public.checklist_tasks FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert tasks for their company" ON public.checklist_tasks;
CREATE POLICY "Users can insert tasks for their company"
  ON public.checklist_tasks FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- task_completion_records policies
DROP POLICY IF EXISTS "Users can view completions for their company" ON public.task_completion_records;
CREATE POLICY "Users can view completions for their company"
  ON public.task_completion_records FOR SELECT
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert completions for their company" ON public.task_completion_records;
CREATE POLICY "Users can insert completions for their company"
  ON public.task_completion_records FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- contractor_callouts policies
DROP POLICY IF EXISTS "Users can view contractor calls for their company" ON public.contractor_callouts;
CREATE POLICY "Users can view contractor calls for their company"
  ON public.contractor_callouts FOR SELECT
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update contractor calls" ON public.contractor_callouts;
CREATE POLICY "Admins can update contractor calls"
  ON public.contractor_callouts FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT app_role FROM public.profiles WHERE id = auth.uid()) IN ('Owner', 'Admin')
  );

DROP POLICY IF EXISTS "Users can insert contractor calls for their company" ON public.contractor_callouts;
CREATE POLICY "Users can insert contractor calls for their company"
  ON public.contractor_callouts FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_repeatable_labels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_completion_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_callouts TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.task_templates IS 'Core library templates for compliance tasks with scheduling, assignment, evidence, and compliance metadata';
COMMENT ON TABLE public.template_fields IS 'Dynamic fields for task templates supporting temperature, checkbox, pass/fail, signatures, etc.';
COMMENT ON TABLE public.template_repeatable_labels IS 'Predefined labels for repeatable fields in task templates (e.g., specific fridge names, extinguisher locations)';
COMMENT ON TABLE public.checklist_tasks IS 'Generated task instances scheduled from templates with status tracking and completion metadata';
COMMENT ON TABLE public.task_completion_records IS 'Immutable audit trail with completion data, evidence, and acknowledgments';
COMMENT ON TABLE public.contractor_callouts IS 'Contractor callouts triggered when tasks fail or require maintenance';

