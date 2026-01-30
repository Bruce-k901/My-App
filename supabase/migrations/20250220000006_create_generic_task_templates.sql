-- ============================================================================
-- Migration: Create Generic Templates for Auto-Generated Tasks
-- ============================================================================
-- 
-- These templates are used by the Edge Function for tasks generated from
-- external sources (certificates, SOPs, RAs, PPM, callouts) rather than
-- from user-configured task templates.
--
-- NOTE: Templates are identified by slug, not ID. The Edge Function will
-- look up templates by slug when creating tasks.
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
DECLARE
  template_count INTEGER;
BEGIN
  -- Only proceed if task_templates table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN

    -- 1. Certificate Renewal Template
    IF EXISTS (
      SELECT 1 FROM public.task_templates 
      WHERE slug = 'certificate-renewal-generic' AND company_id IS NULL
    ) THEN
      UPDATE public.task_templates
      SET name = 'Certificate Renewal',
          description = 'Reminder to renew expiring certificates',
          is_active = true
      WHERE slug = 'certificate-renewal-generic' AND company_id IS NULL;
    ELSE
      INSERT INTO public.task_templates (
        company_id, name, slug, description, category, frequency,
        is_active, is_template_library, evidence_types, is_critical
      ) VALUES (
        NULL, 'Certificate Renewal', 'certificate-renewal-generic',
        'Reminder to renew expiring certificates', 'compliance', 'triggered',
        true, true, ARRAY['text_note']::TEXT[], false
      );
    END IF;

    -- 2. SOP Review Template
    IF EXISTS (
      SELECT 1 FROM public.task_templates 
      WHERE slug = 'sop-review-generic' AND company_id IS NULL
    ) THEN
      UPDATE public.task_templates
      SET name = 'SOP Review',
          description = 'Review and update Standard Operating Procedure',
          is_active = true
      WHERE slug = 'sop-review-generic' AND company_id IS NULL;
    ELSE
      INSERT INTO public.task_templates (
        company_id, name, slug, description, category, frequency,
        is_active, is_template_library, evidence_types, is_critical
      ) VALUES (
        NULL, 'SOP Review', 'sop-review-generic',
        'Review and update Standard Operating Procedure', 'compliance', 'triggered',
        true, true, ARRAY['text_note', 'signature']::TEXT[], false
      );
    END IF;

    -- 3. Risk Assessment Review Template
    IF EXISTS (
      SELECT 1 FROM public.task_templates 
      WHERE slug = 'ra-review-generic' AND company_id IS NULL
    ) THEN
      UPDATE public.task_templates
      SET name = 'Risk Assessment Review',
          description = 'Review and update Risk Assessment',
          is_active = true
      WHERE slug = 'ra-review-generic' AND company_id IS NULL;
    ELSE
      INSERT INTO public.task_templates (
        company_id, name, slug, description, category, frequency,
        is_active, is_template_library, evidence_types, is_critical
      ) VALUES (
        NULL, 'Risk Assessment Review', 'ra-review-generic',
        'Review and update Risk Assessment', 'h_and_s', 'triggered',
        true, true, ARRAY['text_note', 'signature']::TEXT[], false
      );
    END IF;

    -- 4. PPM Overdue Template
    IF EXISTS (
      SELECT 1 FROM public.task_templates 
      WHERE slug = 'ppm-overdue-generic' AND company_id IS NULL
    ) THEN
      UPDATE public.task_templates
      SET name = 'PPM Overdue',
          description = 'Asset requires preventative maintenance',
          is_active = true
      WHERE slug = 'ppm-overdue-generic' AND company_id IS NULL;
    ELSE
      INSERT INTO public.task_templates (
        company_id, name, slug, description, category, frequency,
        is_active, is_template_library, evidence_types, is_critical
      ) VALUES (
        NULL, 'PPM Overdue', 'ppm-overdue-generic',
        'Asset requires preventative maintenance', 'h_and_s', 'triggered',
        true, true, ARRAY['text_note', 'photo']::TEXT[], true
      );
    END IF;

    -- 5. Callout Follow-up Template
    IF EXISTS (
      SELECT 1 FROM public.task_templates 
      WHERE slug = 'callout-followup-generic' AND company_id IS NULL
    ) THEN
      UPDATE public.task_templates
      SET name = 'Callout Follow-up',
          description = 'Follow up on open contractor callout',
          is_active = true
      WHERE slug = 'callout-followup-generic' AND company_id IS NULL;
    ELSE
      INSERT INTO public.task_templates (
        company_id, name, slug, description, category, frequency,
        is_active, is_template_library, evidence_types, is_critical
      ) VALUES (
        NULL, 'Callout Follow-up', 'callout-followup-generic',
        'Follow up on open contractor callout', 'h_and_s', 'daily',
        true, true, ARRAY['text_note']::TEXT[], false
      );
    END IF;

    -- 6. Messaging Task Template
    IF EXISTS (
      SELECT 1 FROM public.task_templates 
      WHERE slug = 'messaging-task-generic' AND company_id IS NULL
    ) THEN
      UPDATE public.task_templates
      SET name = 'Task from Message',
          description = 'Task created from messaging module',
          is_active = true
      WHERE slug = 'messaging-task-generic' AND company_id IS NULL;
    ELSE
      INSERT INTO public.task_templates (
        company_id, name, slug, description, category, frequency,
        is_active, is_template_library, evidence_types, is_critical
      ) VALUES (
        NULL, 'Task from Message', 'messaging-task-generic',
        'Task created from messaging module', 'general', 'triggered',
        true, true, ARRAY['text_note', 'photo']::TEXT[], false
      );
    END IF;

    -- 7. Document Review Template
    IF EXISTS (
      SELECT 1 FROM public.task_templates 
      WHERE slug = 'document-review-generic' AND company_id IS NULL
    ) THEN
      UPDATE public.task_templates
      SET name = 'Document Review',
          description = 'Review and update expiring document or policy',
          is_active = true
      WHERE slug = 'document-review-generic' AND company_id IS NULL;
    ELSE
      INSERT INTO public.task_templates (
        company_id, name, slug, description, category, frequency,
        is_active, is_template_library, evidence_types, is_critical
      ) VALUES (
        NULL, 'Document Review', 'document-review-generic',
        'Review and update expiring document or policy', 'compliance', 'triggered',
        true, true, ARRAY['text_note', 'signature']::TEXT[], false
      );
    END IF;

    -- ============================================================================
    -- Verification: Check templates were created
    -- ============================================================================
    SELECT COUNT(*) INTO template_count
    FROM public.task_templates
    WHERE slug IN (
      'certificate-renewal-generic',
      'sop-review-generic',
      'ra-review-generic',
      'ppm-overdue-generic',
      'callout-followup-generic',
      'messaging-task-generic',
      'document-review-generic'
    );
    
    IF template_count = 7 THEN
      RAISE NOTICE '✅ All 7 generic templates created successfully';
    ELSE
      RAISE WARNING '⚠️ Only % generic templates found (expected 7)', template_count;
    END IF;

  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping generic templates creation';
  END IF;
END $$;

