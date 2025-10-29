-- Check if task_templates table exists and create if needed
-- Run this in Supabase SQL Editor

-- Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'task_templates'
) as table_exists;

-- If the above returns false, run this to create the table:
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_templates') THEN
        -- Create task_templates table
        CREATE TABLE public.task_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
            
            -- Basic Info
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            description TEXT,
            
            -- Categorization
            category TEXT NOT NULL CHECK (category IN ('food_safety', 'h_and_s', 'fire', 'cleaning', 'compliance')),
            
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
            
            -- Compliance Metadata
            compliance_standard TEXT,
            is_critical BOOLEAN DEFAULT FALSE,
            
            -- Contractor Integration
            triggers_contractor_on_failure BOOLEAN DEFAULT FALSE,
            contractor_type TEXT,
            
            -- Status
            is_active BOOLEAN DEFAULT TRUE,
            is_template_library BOOLEAN DEFAULT FALSE,
            
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_task_templates_company_id ON public.task_templates(company_id);
        CREATE INDEX IF NOT EXISTS idx_task_templates_category ON public.task_templates(category);
        CREATE INDEX IF NOT EXISTS idx_task_templates_frequency ON public.task_templates(frequency);
        CREATE UNIQUE INDEX IF NOT EXISTS uq_task_templates_company_name ON public.task_templates(company_id, name);
        CREATE UNIQUE INDEX IF NOT EXISTS uq_task_templates_company_slug ON public.task_templates(company_id, slug);

        -- Enable RLS
        ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY "Allow authenticated users to view their company's task templates" ON public.task_templates
        FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE company_id = task_templates.company_id));

        CREATE POLICY "Allow authenticated users to insert their company's task templates" ON public.task_templates
        FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE company_id = task_templates.company_id));

        CREATE POLICY "Allow authenticated users to update their company's task templates" ON public.task_templates
        FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE company_id = task_templates.company_id));

        CREATE POLICY "Allow authenticated users to delete their company's task templates" ON public.task_templates
        FOR DELETE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE company_id = task_templates.company_id));

        -- Grant permissions
        GRANT ALL ON TABLE public.task_templates TO postgres;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.task_templates TO authenticated;
        
        RAISE NOTICE 'Table task_templates created successfully!';
    ELSE
        RAISE NOTICE 'Table task_templates already exists.';
    END IF;
END
$$;

-- Verify table was created
SELECT COUNT(*) as template_count FROM public.task_templates;
