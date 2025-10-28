-- Quick fix for task_templates table
-- Run this in Supabase SQL Editor

-- Check if task_templates table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'task_templates'
);

-- If the table doesn't exist, create it
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
  recurrence_pattern JSONB,
  time_of_day TEXT,
  dayparts TEXT[],
  
  -- Assignment
  assigned_to_role TEXT,
  assigned_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  asset_type TEXT,
  
  -- Content
  instructions TEXT,
  repeatable_field_name TEXT,
  
  -- Evidence Requirements
  evidence_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Linking
  requires_sop BOOLEAN DEFAULT false,
  linked_sop_id UUID,
  linked_risk_id UUID,
  
  -- Compliance
  compliance_standard TEXT,
  audit_category TEXT,
  is_critical BOOLEAN DEFAULT false,
  
  -- Automation
  triggers_contractor_on_failure BOOLEAN DEFAULT false,
  contractor_type TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_template_library BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_templates_company_id ON public.task_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_category ON public.task_templates(category);
CREATE INDEX IF NOT EXISTS idx_task_templates_frequency ON public.task_templates(frequency);
CREATE INDEX IF NOT EXISTS idx_task_templates_site_id ON public.task_templates(site_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_asset_id ON public.task_templates(asset_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_is_active ON public.task_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_task_templates_is_template_library ON public.task_templates(is_template_library);

-- Create unique constraint for slug per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_templates_company_slug ON public.task_templates(company_id, slug);

-- Enable RLS
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view task templates from their company" ON public.task_templates;
CREATE POLICY "Users can view task templates from their company" ON public.task_templates
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert task templates for their company" ON public.task_templates;
CREATE POLICY "Users can insert task templates for their company" ON public.task_templates
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update task templates from their company" ON public.task_templates;
CREATE POLICY "Users can update task templates from their company" ON public.task_templates
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete task templates from their company" ON public.task_templates;
CREATE POLICY "Users can delete task templates from their company" ON public.task_templates
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON public.task_templates TO authenticated;
GRANT ALL ON public.task_templates TO service_role;

-- Verify table creation
SELECT 'task_templates table created successfully' as status;
SELECT COUNT(*) as existing_templates FROM public.task_templates;
