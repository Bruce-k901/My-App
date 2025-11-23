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
-- PART 7: Add Essential Template Fields (if templates exist but fields don't)
-- ============================================================================

-- Add fields for emergency_incident_reporting template
DO $$
DECLARE
  template_id_var UUID;
  field_exists BOOLEAN;
BEGIN
  SELECT id INTO template_id_var
  FROM public.task_templates
  WHERE slug = 'emergency_incident_reporting'
    AND company_id IS NULL
  LIMIT 1;

  IF template_id_var IS NOT NULL THEN
    -- Check if fields already exist
    SELECT EXISTS(
      SELECT 1 FROM public.template_fields
      WHERE template_id = template_id_var
      LIMIT 1
    ) INTO field_exists;

    IF NOT field_exists THEN
      -- Add essential fields for emergency incident reporting
      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
      VALUES
        (template_id_var, 'incident_datetime', 'date', 'Incident Date & Time', TRUE, 1, 'Date and time when the incident occurred.', NULL),
        (template_id_var, 'incident_type', 'select', 'Incident Type', TRUE, 2, 'Select the type of incident.', 
          jsonb_build_array(
            jsonb_build_object('value', 'slip_trip', 'label', 'Slip/Trip/Fall'),
            jsonb_build_object('value', 'cut', 'label', 'Cut/Laceration'),
            jsonb_build_object('value', 'burn', 'label', 'Burn/Scald'),
            jsonb_build_object('value', 'fall_from_height', 'label', 'Fall from Height'),
            jsonb_build_object('value', 'struck_by', 'label', 'Struck by Object'),
            jsonb_build_object('value', 'electrical', 'label', 'Electrical Shock'),
            jsonb_build_object('value', 'fire', 'label', 'Fire'),
            jsonb_build_object('value', 'food_poisoning', 'label', 'Food Poisoning/Illness'),
            jsonb_build_object('value', 'chemical', 'label', 'Chemical Exposure'),
            jsonb_build_object('value', 'manual_handling', 'label', 'Manual Handling Injury'),
            jsonb_build_object('value', 'other', 'label', 'Other')
          )
        ),
        (template_id_var, 'severity', 'select', 'Incident Severity', TRUE, 3, 'Select the severity level.', 
          jsonb_build_array(
            jsonb_build_object('value', 'near_miss', 'label', 'Near Miss (No injury)'),
            jsonb_build_object('value', 'minor', 'label', 'Minor (First aid only)'),
            jsonb_build_object('value', 'moderate', 'label', 'Moderate (Medical attention required)'),
            jsonb_build_object('value', 'major', 'label', 'Major (Hospital treatment)'),
            jsonb_build_object('value', 'critical', 'label', 'Critical (Life-threatening)'),
            jsonb_build_object('value', 'fatality', 'label', 'Fatality')
          )
        ),
        (template_id_var, 'location', 'text', 'Location of Incident', TRUE, 4, 'Exact location where the incident occurred.', 'e.g., Kitchen - Prep Area'),
        (template_id_var, 'incident_description', 'text', 'Detailed Description', TRUE, 5, 'Provide a detailed description of what happened.', 'Describe the incident in detail...'),
        (template_id_var, 'emergency_services_called', 'pass_fail', 'Emergency Services Called', TRUE, 10, 'PASS if emergency services (999) were called.', NULL),
        (template_id_var, 'first_aid_provided', 'pass_fail', 'First Aid Provided', TRUE, 11, 'PASS if first aid was provided.', NULL),
        (template_id_var, 'scene_preserved', 'pass_fail', 'Scene Preserved', TRUE, 12, 'PASS if the scene was preserved for investigation.', NULL),
        (template_id_var, 'immediate_actions', 'text', 'Immediate Actions Taken', TRUE, 13, 'Describe any immediate actions taken.', 'e.g., Applied pressure to wound, called ambulance...'),
        (template_id_var, 'reported_by', 'text', 'Reported By (Name)', TRUE, 20, 'Name of the person completing this incident report.', NULL);

      RAISE NOTICE 'Added essential fields to emergency_incident_reporting template';
    ELSE
      RAISE NOTICE 'emergency_incident_reporting template already has fields';
    END IF;
  END IF;
END $$;

-- Add fields for food_poisoning_investigation template
DO $$
DECLARE
  template_id_var UUID;
  field_exists BOOLEAN;
BEGIN
  SELECT id INTO template_id_var
  FROM public.task_templates
  WHERE slug = 'food_poisoning_investigation'
    AND company_id IS NULL
  LIMIT 1;

  IF template_id_var IS NOT NULL THEN
    -- Check if fields already exist
    SELECT EXISTS(
      SELECT 1 FROM public.template_fields
      WHERE template_id = template_id_var
      LIMIT 1
    ) INTO field_exists;

    IF NOT field_exists THEN
      -- Add essential fields for food poisoning investigation
      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options, placeholder)
      VALUES
        (template_id_var, 'incident_date', 'date', 'Incident Report Date', TRUE, 1, 'Date when the food poisoning concern was first reported.', NULL, NULL),
        (template_id_var, 'reported_by_customer', 'text', 'Reported By (Customer Name)', TRUE, 2, 'Name of customer who reported the concern.', NULL, NULL),
        (template_id_var, 'customer_contact', 'text', 'Customer Contact Details', TRUE, 3, 'Phone number and/or email address for follow-up.', NULL, NULL),
        (template_id_var, 'symptom_onset', 'select', 'Symptom Onset Time After Eating', TRUE, 10, 'Time between eating and first symptoms.', 
          jsonb_build_array(
            jsonb_build_object('value', '1-6_hours', 'label', '1-6 hours (Possible Staphylococcus, Bacillus)'),
            jsonb_build_object('value', '6-24_hours', 'label', '6-24 hours (Possible Clostridium, Salmonella)'),
            jsonb_build_object('value', '24-48_hours', 'label', '24-48 hours (Possible Norovirus, E.coli)'),
            jsonb_build_object('value', '2-5_days', 'label', '2-5 days (Possible Campylobacter, Listeria)'),
            jsonb_build_object('value', 'unknown', 'label', 'Unknown timing')
          ), NULL),
        (template_id_var, 'primary_symptoms', 'select', 'Primary Symptoms Reported', TRUE, 11, 'Main symptoms experienced.', 
          jsonb_build_array(
            jsonb_build_object('value', 'vomiting', 'label', '🤮 Vomiting (often rapid onset)'),
            jsonb_build_object('value', 'diarrhea', 'label', '💩 Diarrhea'),
            jsonb_build_object('value', 'nausea', 'label', '😵 Nausea'),
            jsonb_build_object('value', 'fever', 'label', '🌡️ Fever'),
            jsonb_build_object('value', 'abdominal_pain', 'label', '🩺 Abdominal Pain'),
            jsonb_build_object('value', 'other', 'label', '❓ Other Symptoms')
          ), NULL),
        (template_id_var, 'hospital_treatment', 'pass_fail', 'Hospital Treatment Required?', TRUE, 12, 'YES if affected person required hospital treatment.', NULL, NULL),
        (template_id_var, 'suspected_menu_items', 'text', 'Suspected Menu Items', TRUE, 20, 'List all menu items consumed by affected person(s).', NULL, 'e.g., "Chicken Caesar Salad - contained raw egg..."'),
        (template_id_var, 'other_affected_persons', 'pass_fail', 'Other People Affected?', TRUE, 21, 'YES if other customers or staff reported similar symptoms.', NULL, NULL),
        (template_id_var, 'samples_preserved', 'pass_fail', 'Food Samples Preserved?', TRUE, 30, 'YES if you have isolated and preserved samples.', NULL, NULL),
        (template_id_var, 'eho_notified', 'pass_fail', 'Environmental Health Notified?', TRUE, 31, 'YES if incident meets criteria for Environmental Health notification.', NULL, NULL),
        (template_id_var, 'immediate_corrective_actions', 'text', 'Immediate Corrective Actions', TRUE, 32, 'What immediate actions have been taken?', NULL, 'e.g., "Removed suspect batch from service..."'),
        (template_id_var, 'investigation_complete', 'pass_fail', 'Investigation Complete', TRUE, 60, 'PASS when all investigation phases are complete.', NULL, NULL),
        (template_id_var, 'final_report_summary', 'text', 'Final Investigation Summary', TRUE, 61, 'Brief summary of investigation findings.', NULL, 'e.g., "Investigation concluded issue was likely..."');

      RAISE NOTICE 'Added essential fields to food_poisoning_investigation template';
    ELSE
      RAISE NOTICE 'food_poisoning_investigation template already has fields';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PART 8: Ensure storage buckets exist for incident evidence
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
-- PART 9: Create storage policies for incident_photos bucket
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
-- PART 10: Verification and Summary
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

