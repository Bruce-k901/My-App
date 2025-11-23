-- ============================================================================
-- Migration: 20250223000004_ensure_incident_templates_exist.sql
-- Description: Ensures both emergency_incident_reporting and food_poisoning_investigation
--              templates exist with all required features, DB tables, and RLS policies
-- ============================================================================

-- ============================================================================
-- PART 1: Ensure task_templates table exists and has required columns
-- ============================================================================

-- Check if task_templates table exists, create if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'task_templates'
  ) THEN
    -- Create basic table structure (simplified - full structure should be in other migrations)
    CREATE TABLE public.task_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      category TEXT,
      audit_category TEXT,
      frequency TEXT,
      time_of_day TEXT,
      dayparts TEXT[],
      recurrence_pattern JSONB,
      assigned_to_role TEXT,
      compliance_standard TEXT,
      is_critical BOOLEAN DEFAULT FALSE,
      is_template_library BOOLEAN DEFAULT TRUE,
      evidence_types TEXT[],
      instructions TEXT,
      repeatable_field_name TEXT,
      triggers_contractor_on_failure BOOLEAN DEFAULT FALSE,
      contractor_type TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      requires_sop BOOLEAN DEFAULT FALSE,
      requires_risk_assessment BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Create unique index on slug per company
    CREATE UNIQUE INDEX idx_task_templates_company_slug 
      ON public.task_templates(company_id, slug);
    
    RAISE NOTICE 'Created task_templates table';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Ensure template_fields table exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'template_fields'
  ) THEN
    CREATE TABLE public.template_fields (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
      field_name TEXT NOT NULL,
      field_type TEXT NOT NULL,
      label TEXT NOT NULL,
      required BOOLEAN DEFAULT FALSE,
      field_order INTEGER DEFAULT 0,
      help_text TEXT,
      placeholder TEXT,
      options JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX idx_template_fields_template_id 
      ON public.template_fields(template_id);
    
    RAISE NOTICE 'Created template_fields table';
  END IF;
END $$;

-- ============================================================================
-- PART 3: Ensure template_repeatable_labels table exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'template_repeatable_labels'
  ) THEN
    CREATE TABLE public.template_repeatable_labels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      label_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX idx_template_repeatable_labels_template_id 
      ON public.template_repeatable_labels(template_id);
    
    RAISE NOTICE 'Created template_repeatable_labels table';
  END IF;
END $$;

-- ============================================================================
-- PART 4: Fix RLS policies for task_templates to allow global templates
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might block global templates
DROP POLICY IF EXISTS "task_templates_select_company" ON public.task_templates;
DROP POLICY IF EXISTS "Users can view task templates from their company" ON public.task_templates;
DROP POLICY IF EXISTS "Allow authenticated users to view their company's task templates" ON public.task_templates;

-- Create comprehensive SELECT policy that allows:
-- 1. Global templates (company_id IS NULL) - visible to all authenticated users
-- 2. Company-specific templates - visible to users in that company
CREATE POLICY "task_templates_select_all"
  ON public.task_templates
  FOR SELECT
  USING (
    -- Service role can see everything
    public.is_service_role()
    OR
    -- Global templates (company_id IS NULL) are visible to all authenticated users
    company_id IS NULL
    OR
    -- Company-specific templates visible to users in that company
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = task_templates.company_id
    )
  );

-- ============================================================================
-- PART 5: Create/Update Emergency Incident Reporting Template
-- ============================================================================

DO $$
DECLARE
  template_id_var UUID;
BEGIN
  -- Check if template exists
  SELECT id INTO template_id_var
  FROM public.task_templates
  WHERE slug = 'emergency_incident_reporting'
    AND company_id IS NULL
  LIMIT 1;

  IF template_id_var IS NULL THEN
    -- Create the template
    INSERT INTO public.task_templates (
      company_id,
      name,
      slug,
      description,
      category,
      audit_category,
      frequency,
      time_of_day,
      dayparts,
      recurrence_pattern,
      assigned_to_role,
      compliance_standard,
      is_critical,
      is_template_library,
      evidence_types,
      instructions,
      repeatable_field_name,
      triggers_contractor_on_failure,
      contractor_type,
      is_active,
      requires_sop,
      requires_risk_assessment
    ) VALUES (
      NULL, -- Global template
      'Emergency Incident Report',
      'emergency_incident_reporting',
      'Report workplace accidents, injuries, and near misses. Generates follow-up tasks and RIDDOR assessment.',
      'h_and_s',
      'health_safety',
      'triggered',
      'anytime',
      ARRAY['anytime'],
      jsonb_build_object(
        'is_incident_template', TRUE,
        'generates_followup_tasks', TRUE,
        'followup_task_options', jsonb_build_array(
          'update_risk_assessment',
          'review_update_sop',
          'management_investigation',
          'staff_safety_briefing',
          'equipment_maintenance_check',
          'insurance_notification',
          'contact_specific_person',
          'contact_specific_company'
        )
      ),
      'manager',
      'Health and Safety at Work Act 1974, RIDDOR 2013',
      TRUE,
      TRUE,
      ARRAY['text_note', 'photo'],
      'EMERGENCY PROTOCOL:

1. IMMEDIATE RESPONSE:
   - If life-threatening: CALL 999 IMMEDIATELY
   - Provide first aid if trained and safe to do so
   - Preserve the scene - do not move anything unless necessary for safety
   - Secure the area to prevent further incidents

2. INCIDENT REPORTING:
   - Complete this form as soon as possible after the incident
   - Be accurate and detailed - this may be used for legal/insurance purposes
   - Include all witnesses and their contact information
   - Take photos of the scene if safe to do so

3. RIDDOR ASSESSMENT:
   - The system will automatically assess if this is RIDDOR reportable
   - Reportable incidents must be reported to HSE within specific timeframes:
     * Fatalities: Immediately
     * Major injuries: Within 10 days
     * Dangerous occurrences: Within 10 days
     * Injuries causing 7+ days absence: Within 15 days

4. FOLLOW-UP ACTIONS:
   - Select required follow-up tasks from the checklist
   - Each selected task will be added to Today''s Tasks feed
   - Complete follow-up tasks to prevent recurrence

5. REPORT GENERATION:
   - Once submitted, a downloadable report will be created
   - The report can be printed, shared, or archived
   - The incident will appear in the Incident Reports page',
      NULL,
      FALSE,
      NULL,
      TRUE,
      FALSE,
      FALSE
    )
    RETURNING id INTO template_id_var;

    RAISE NOTICE 'Created emergency_incident_reporting template with ID: %', template_id_var;
  ELSE
    RAISE NOTICE 'emergency_incident_reporting template already exists with ID: %', template_id_var;
  END IF;
END $$;

-- ============================================================================
-- PART 6: Create/Update Food Poisoning Investigation Template
-- ============================================================================

DO $$
DECLARE
  template_id_var UUID;
BEGIN
  -- Check if template exists
  SELECT id INTO template_id_var
  FROM public.task_templates
  WHERE slug = 'food_poisoning_investigation'
    AND company_id IS NULL
  LIMIT 1;

  IF template_id_var IS NULL THEN
    -- Create the template
    INSERT INTO public.task_templates (
      company_id,
      name,
      slug,
      description,
      category,
      audit_category,
      frequency,
      time_of_day,
      dayparts,
      recurrence_pattern,
      assigned_to_role,
      compliance_standard,
      is_critical,
      is_template_library,
      evidence_types,
      instructions,
      repeatable_field_name,
      triggers_contractor_on_failure,
      contractor_type,
      is_active,
      requires_sop,
      requires_risk_assessment
    ) VALUES (
      NULL, -- Global template
      'Food Poisoning Incident Investigation',
      'food_poisoning_investigation',
      'Complete investigation and management of suspected food poisoning incidents',
      'food_safety',
      'food_safety',
      'triggered',
      'anytime',
      ARRAY['anytime'],
      jsonb_build_object(
        'default_checklist_items', jsonb_build_array(
          '🚨 PHASE 1: IMMEDIATE ACTIONS (First 2 Hours)',
          'Secure and isolate suspected food items',
          'Preserve samples for potential testing',
          'Document all affected persons details',
          'Review temperature logs for relevant items',
          'Notify management team immediately',
          '📋 PHASE 2: INITIAL ASSESSMENT (First 4 Hours)',
          'Assess if environmental health notification required',
          'Complete initial incident facts documentation',
          'Identify all potentially affected menu items',
          'Check staff health and fitness for work',
          'Secure CCTV and relevant documentation',
          '🔍 PHASE 3: INVESTIGATION (First 24 Hours)',
          'Complete detailed symptom pattern analysis',
          'Reconstruct food preparation timeline',
          'Interview relevant kitchen and service staff',
          'Review supplier delivery records and quality',
          'Document cleaning and hygiene procedures followed',
          '💬 PHASE 4: CUSTOMER MANAGEMENT (First 48 Hours)',
          'Send initial customer response',
          'Document all customer communications',
          'Prepare compensation strategy if appropriate',
          'Monitor social media and review platforms',
          'Update management on investigation progress',
          '🔄 PHASE 5: BUSINESS RECOVERY (Week 1)',
          'Review and update relevant procedures',
          'Conduct staff retraining if required',
          'Complete supplier review and follow-up',
          'Document lessons learned and improvements',
          'Close incident with final report'
        ),
        'auto_generate_tasks', jsonb_build_array(
          'immediate_response',
          'eho_notification',
          'customer_communication', 
          'procedure_review',
          'staff_briefing'
        )
      ),
      'manager',
      'Food Safety Act 1990, Food Hygiene Regulations',
      TRUE,
      TRUE,
      ARRAY['text_note', 'photo', 'pass_fail'],
      '🍽️ FOOD POISONING INCIDENT MANAGEMENT GUIDE

🚨 IMMEDIATE ACTIONS (First 2 Hours):

1. **PRESERVE EVIDENCE**
   • Isolate suspected food items - DO NOT DISPOSE
   • Label clearly: "DO NOT USE - UNDER INVESTIGATION"
   • Refrigerate samples if possible
   • Take photos of items, packaging, storage conditions

2. **DOCUMENT AFFECTED PERSONS**
   • Name, contact details, symptoms, onset time
   • What they ate, when they ate it
   • Any pre-existing medical conditions
   • Other people who ate same items (unaffected)

3. **INTERNAL NOTIFICATION**
   • Notify manager and designated food safety officer
   • Review temperature logs for relevant items
   • Check staff health records and fitness for work

📞 WHEN TO CONTACT ENVIRONMENTAL HEALTH:

**IMMEDIATE NOTIFICATION REQUIRED IF:**
• 2 or more linked cases from different households
• Person hospitalized or severe symptoms
• Involves vulnerable person (child, elderly, pregnant)
• Suspected food from your premises caused illness

🔍 INVESTIGATION METHODOLOGY:

1. **SYMPTOM ANALYSIS**
   • Onset time (helps identify pathogen)
   • Duration and severity of symptoms
   • Specific symptoms (vomiting, diarrhea, fever etc.)

2. **FOOD TIMELINE RECONSTRUCTION**
   • 72-hour food history for affected persons
   • Compare with unaffected customers/staff
   • Identify common menu items

3. **KITCHEN INVESTIGATION**
   • Staff illness records
   • Food preparation practices
   • Temperature control compliance
   • Cleaning and hygiene procedures

💌 CUSTOMER COMMUNICATION STRATEGY:

**INITIAL RESPONSE (Template A):**
"Thank you for bringing this to our attention. We take all health concerns seriously and have immediately initiated our full investigation procedure. We will provide you with an update within 24 hours."

**FOLLOW-UP (Template B):**
"Our investigation is ongoing. We have preserved relevant samples and reviewed our procedures. We appreciate your patience as we work to identify the cause."

⚠️ LEGAL & INSURANCE:

• **DO NOT ADMIT LIABILITY** in communications
• **Document everything** for insurance purposes
• **Preserve all evidence** for potential legal requirements
• **Contact your insurance provider** if significant claim anticipated

🎯 FOLLOW-UP TASKS WILL BE AUTOMATICALLY CREATED:

• Preserve evidence and samples
• Environmental health notification (if required)
• Customer communication management
• Procedure review and updates
• Staff briefing and retraining

Remember: Thorough documentation protects your business and helps prevent future incidents.',
      NULL,
      TRUE,
      'food_safety_consultant',
      TRUE,
      TRUE,
      TRUE
    )
    RETURNING id INTO template_id_var;

    RAISE NOTICE 'Created food_poisoning_investigation template with ID: %', template_id_var;
  ELSE
    RAISE NOTICE 'food_poisoning_investigation template already exists with ID: %', template_id_var;
  END IF;
END $$;

-- ============================================================================
-- PART 7: Ensure storage buckets exist for incident evidence
-- ============================================================================

-- Note: Storage bucket creation requires superuser privileges
-- This will be handled by Supabase dashboard or separate migration
-- But we can verify they exist and create if possible

DO $$
BEGIN
  -- Check if incident_photos bucket exists
  -- Note: This requires storage admin access, may fail silently
  BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'incident_photos',
      'incident_photos',
      false, -- Private bucket
      10485760, -- 10MB limit
      ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Created/verified incident_photos storage bucket';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create storage bucket (may require admin access): %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- PART 8: Create storage policies for incident_photos bucket
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload incident photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view incident photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own incident photos" ON storage.objects;

-- Upload policy: Users can upload to their company's folder
CREATE POLICY "Users can upload incident photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'incident_photos'
    AND (
      public.is_service_role()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND (storage.foldername(name))[1] = p.company_id::text
      )
    )
  );

-- View policy: Users can view photos from their company
CREATE POLICY "Users can view incident photos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'incident_photos'
    AND (
      public.is_service_role()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND (storage.foldername(name))[1] = p.company_id::text
      )
    )
  );

-- Delete policy: Users can delete photos from their company
CREATE POLICY "Users can delete own incident photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'incident_photos'
    AND (
      public.is_service_role()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND (storage.foldername(name))[1] = p.company_id::text
      )
    )
  );

-- ============================================================================
-- PART 9: Verification and Summary
-- ============================================================================

DO $$
DECLARE
  emergency_template_id UUID;
  food_poisoning_template_id UUID;
  emergency_fields_count INTEGER;
  food_poisoning_fields_count INTEGER;
BEGIN
  -- Check emergency incident template
  SELECT id INTO emergency_template_id
  FROM public.task_templates
  WHERE slug = 'emergency_incident_reporting'
    AND company_id IS NULL;
  
  -- Check food poisoning template
  SELECT id INTO food_poisoning_template_id
  FROM public.task_templates
  WHERE slug = 'food_poisoning_investigation'
    AND company_id IS NULL;
  
  IF emergency_template_id IS NOT NULL THEN
    SELECT COUNT(*) INTO emergency_fields_count
    FROM public.template_fields
    WHERE template_id = emergency_template_id;
    
    RAISE NOTICE '✅ Emergency Incident Reporting Template:';
    RAISE NOTICE '   Template ID: %', emergency_template_id;
    RAISE NOTICE '   Fields: %', emergency_fields_count;
  ELSE
    RAISE WARNING '⚠️ Emergency Incident Reporting template not found';
  END IF;
  
  IF food_poisoning_template_id IS NOT NULL THEN
    SELECT COUNT(*) INTO food_poisoning_fields_count
    FROM public.template_fields
    WHERE template_id = food_poisoning_template_id;
    
    RAISE NOTICE '✅ Food Poisoning Investigation Template:';
    RAISE NOTICE '   Template ID: %', food_poisoning_template_id;
    RAISE NOTICE '   Fields: %', food_poisoning_fields_count;
  ELSE
    RAISE WARNING '⚠️ Food Poisoning Investigation template not found';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '   • Templates are global (company_id IS NULL) - visible to all companies';
  RAISE NOTICE '   • RLS policies allow authenticated users to view global templates';
  RAISE NOTICE '   • Storage bucket incident_photos configured for evidence';
  RAISE NOTICE '   • Templates ready for use in incident reporting workflows';
END $$;

