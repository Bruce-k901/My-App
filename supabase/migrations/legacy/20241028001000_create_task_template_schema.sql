-- Migration: 001_create_task_template_schema.sql
-- Description: Creates complete task template system schema with all tables, indexes, constraints, and RLS policies
-- Author: Task System Team
-- Date: 2025-01-23
-- 
-- Tables Created:
-- 1. task_templates - Core library templates
-- 2. task_fields - Dynamic fields for templates
-- 3. task_instances - Scheduled task instances
-- 4. task_completion_logs - Completion data and evidence
-- 5. task_repeatable_labels - Predefined labels for repeatable fields
--
-- This migration is REVERSIBLE - run with DOWN suffix to rollback

-- ============================================================================
-- UP MIGRATION: Create Tables
-- ============================================================================

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

-- Indexes for task_templates
-- WHY: Query performance for filtering by company, category, library status, and frequency
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

-- Indexes for task_fields
-- WHY: Fast lookups by template and ordering fields in form
CREATE INDEX IF NOT EXISTS idx_task_fields_template 
  ON public.task_fields(task_template_id);

CREATE INDEX IF NOT EXISTS idx_task_fields_order 
  ON public.task_fields(task_template_id, display_order);

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

-- Indexes for task_instances
-- WHY: Fast queries for scheduled tasks, status filtering, assignment lookup, and reporting
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

-- Indexes for task_completion_logs
-- WHY: Fast lookups by instance, completion date, user, and failure analysis
CREATE INDEX IF NOT EXISTS idx_task_completion_logs_instance 
  ON public.task_completion_logs(task_instance_id);

CREATE INDEX IF NOT EXISTS idx_task_completion_logs_completed 
  ON public.task_completion_logs(completed_at);

CREATE INDEX IF NOT EXISTS idx_task_completion_logs_user 
  ON public.task_completion_logs(completed_by_user_id);

CREATE INDEX IF NOT EXISTS idx_task_completion_logs_passed 
  ON public.task_completion_logs(passed) 
  WHERE passed = false;

-- Task Repeatable Labels Table
-- Predefined labels for repeatable fields (e.g., fridge names, extinguisher locations)
CREATE TABLE IF NOT EXISTS public.task_repeatable_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  
  -- Label Info
  label_text TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for task_repeatable_labels
-- WHY: Fast lookups by template and proper ordering
CREATE INDEX IF NOT EXISTS idx_task_repeatable_labels_template 
  ON public.task_repeatable_labels(task_template_id);

CREATE INDEX IF NOT EXISTS idx_task_repeatable_labels_order 
  ON public.task_repeatable_labels(task_template_id, display_order);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers for all tables with updated_at columns
CREATE OR REPLACE FUNCTION public.task_templates_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION public.task_fields_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION public.task_instances_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_task_templates_updated ON public.task_templates;
CREATE TRIGGER trg_task_templates_updated
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.task_templates_set_updated_at();

DROP TRIGGER IF EXISTS trg_task_fields_updated ON public.task_fields;
CREATE TRIGGER trg_task_fields_updated
  BEFORE UPDATE ON public.task_fields
  FOR EACH ROW EXECUTE FUNCTION public.task_fields_set_updated_at();

DROP TRIGGER IF EXISTS trg_task_instances_updated ON public.task_instances;
CREATE TRIGGER trg_task_instances_updated
  BEFORE UPDATE ON public.task_instances
  FOR EACH ROW EXECUTE FUNCTION public.task_instances_set_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_repeatable_labels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_templates
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

-- RLS Policies for task_fields (inherit from task_templates)
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

-- RLS Policies for task_instances
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

-- RLS Policies for task_completion_logs (inherit from task_instances)
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

-- RLS Policies for task_repeatable_labels (inherit from task_templates)
CREATE POLICY task_repeatable_labels_select ON public.task_repeatable_labels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      JOIN public.profiles p ON p.company_id = tt.company_id
      WHERE tt.id = task_repeatable_labels.task_template_id
        AND p.id = auth.uid()
    )
  );

CREATE POLICY task_repeatable_labels_insert ON public.task_repeatable_labels
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      JOIN public.profiles p ON p.company_id = tt.company_id
      WHERE tt.id = task_repeatable_labels.task_template_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
    )
  );

CREATE POLICY task_repeatable_labels_update ON public.task_repeatable_labels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      JOIN public.profiles p ON p.company_id = tt.company_id
      WHERE tt.id = task_repeatable_labels.task_template_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
    )
  );

CREATE POLICY task_repeatable_labels_delete ON public.task_repeatable_labels
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      JOIN public.profiles p ON p.company_id = tt.company_id
      WHERE tt.id = task_repeatable_labels.task_template_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_completion_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_repeatable_labels TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.task_templates IS 'Core library templates for compliance tasks. Blueprint for all tasks with frequency, assignment, fields, and compliance metadata.';
COMMENT ON TABLE public.task_fields IS 'Dynamic fields for task templates supporting temperature, checkbox, pass/fail, signatures, etc.';
COMMENT ON TABLE public.task_instances IS 'Individual instances of tasks scheduled from templates with status tracking and completion metadata.';
COMMENT ON TABLE public.task_completion_logs IS 'Actual completion data with field values, evidence (photos/signatures), and results.';
COMMENT ON TABLE public.task_repeatable_labels IS 'Predefined labels for repeatable fields in task templates (e.g., specific fridge names, extinguisher locations).';

COMMENT ON COLUMN public.task_templates.company_id IS 'NULL for global library templates, company_id for custom templates';
COMMENT ON COLUMN public.task_templates.repeatable_field_name IS 'For multi-record tasks (e.g., "fridge_name" allows multiple fridge checks in one task)';
COMMENT ON COLUMN public.task_templates.evidence_types IS 'Array of required evidence types: photo, temperature, pass_fail, text_note, signature';
COMMENT ON COLUMN public.task_templates.is_template_library IS 'True for plug-and-play library templates, false for customized instances';
COMMENT ON COLUMN public.task_completion_logs.field_responses IS 'JSONB object with field_name keys and user-entered values';
COMMENT ON COLUMN public.task_completion_logs.photos IS 'Array of photo URLs for evidence';

