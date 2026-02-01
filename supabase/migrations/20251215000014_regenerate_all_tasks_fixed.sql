-- ============================================================================
-- Migration: Regenerate All Tasks from Configurations and Due Dates (FIXED)
-- Description: Generates tasks from site_checklists and all due/expiry dates
-- Date: 2026-01-20
-- ============================================================================
-- Fixed: Explicitly casts return type to avoid function ambiguity
-- ============================================================================

BEGIN;

-- Step 1: Generate tasks from site_checklists (user-configured recurring tasks)
DO $$
DECLARE
  v_checklist RECORD;
  v_today DATE := CURRENT_DATE;
  v_day_of_week INTEGER := EXTRACT(DOW FROM CURRENT_DATE); -- 0 = Sunday
  v_date_of_month INTEGER := EXTRACT(DAY FROM CURRENT_DATE);
  v_assigned_user_id UUID;
  v_daypart TEXT;
  v_time TEXT;
  v_tasks_created INTEGER := 0;
  v_daypart_times JSONB;
  v_time_array JSONB;
BEGIN
  -- Skip if required tables don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_checklists') THEN
    RAISE NOTICE '⚠️ site_checklists table does not exist - skipping task generation';
    RETURN;
  END IF;

  RAISE NOTICE 'Generating tasks from site_checklists...';
  
  FOR v_checklist IN
    SELECT 
      sc.id,
      sc.site_id,
      sc.company_id,
      sc.template_id,
      sc.name,
      sc.frequency,
      sc.daypart_times,
      sc.equipment_config,
      sc.days_of_week,
      sc.date_of_month,
      sc.anniversary_date,
      tt.assigned_to_user_id as template_assigned_to,
      s.gm_user_id as site_gm_id
    FROM site_checklists sc
    LEFT JOIN task_templates tt ON sc.template_id = tt.id
    LEFT JOIN sites s ON sc.site_id = s.id
    WHERE sc.active = true
  LOOP
    -- Check if this checklist should run today based on frequency
    DECLARE
      v_should_run BOOLEAN := false;
    BEGIN
      IF v_checklist.frequency = 'daily' THEN
        v_should_run := true;
      ELSIF v_checklist.frequency = 'weekly' THEN
        IF v_checklist.days_of_week IS NOT NULL AND array_length(v_checklist.days_of_week, 1) > 0 THEN
          v_should_run := v_day_of_week = ANY(v_checklist.days_of_week);
        ELSE
          v_should_run := v_day_of_week = 1; -- Default to Monday
        END IF;
      ELSIF v_checklist.frequency = 'monthly' THEN
        IF v_checklist.date_of_month IS NOT NULL THEN
          v_should_run := v_date_of_month = v_checklist.date_of_month;
        ELSE
          v_should_run := v_date_of_month = 1; -- Default to 1st
        END IF;
      ELSIF v_checklist.frequency = 'annually' THEN
        IF v_checklist.anniversary_date IS NOT NULL THEN
          v_should_run := EXTRACT(DOY FROM v_today) = EXTRACT(DOY FROM v_checklist.anniversary_date);
        END IF;
      END IF;
      
      IF NOT v_should_run THEN
        CONTINUE;
      END IF;
      
      -- Determine assigned user: template assigned_to > site GM > null
      v_assigned_user_id := COALESCE(v_checklist.template_assigned_to, v_checklist.site_gm_id);
      
      -- Determine dayparts and times
      v_daypart_times := v_checklist.daypart_times;
      
      IF v_daypart_times IS NOT NULL AND jsonb_typeof(v_daypart_times) = 'object' THEN
        -- Multiple dayparts with times
        FOR v_daypart, v_time_array IN 
          SELECT key, value 
          FROM jsonb_each(v_daypart_times)
        LOOP
          -- Handle array of times for same daypart
          IF jsonb_typeof(v_time_array) = 'array' THEN
            FOR v_time IN 
              SELECT jsonb_array_elements_text(v_time_array)
            LOOP
              -- Check if task already exists
              IF NOT EXISTS (
                SELECT 1 FROM checklist_tasks
                WHERE site_checklist_id = v_checklist.id
                  AND due_date = v_today
                  AND daypart = v_daypart
                  AND due_time = v_time::TIME
              ) THEN
                INSERT INTO checklist_tasks (
                  site_checklist_id,
                  template_id,
                  company_id,
                  site_id,
                  custom_name,
                  due_date,
                  due_time,
                  daypart,
                  assigned_to_user_id,
                  status,
                  priority,
                  generated_at,
                  task_data
                ) VALUES (
                  v_checklist.id,
                  v_checklist.template_id,
                  v_checklist.company_id,
                  v_checklist.site_id,
                  v_checklist.name,
                  v_today,
                  v_time::TIME,
                  v_daypart,
                  v_assigned_user_id,
                  'pending',
                  'medium',
                  NOW(),
                  jsonb_build_object(
                    'source_type', 'site_checklist',
                    'equipment_config', v_checklist.equipment_config
                  )
                );
                v_tasks_created := v_tasks_created + 1;
              END IF;
            END LOOP;
          ELSE
            -- Single time for daypart (stored as string)
            v_time := v_time_array::text;
            -- Remove quotes if present
            v_time := trim(both '"' from v_time);
            
            -- Check if task already exists
            IF NOT EXISTS (
              SELECT 1 FROM checklist_tasks
              WHERE site_checklist_id = v_checklist.id
                AND due_date = v_today
                AND daypart = v_daypart
                AND (due_time = v_time::TIME OR (v_time IS NULL AND due_time IS NULL))
            ) THEN
              INSERT INTO checklist_tasks (
                site_checklist_id,
                template_id,
                company_id,
                site_id,
                custom_name,
                due_date,
                due_time,
                daypart,
                assigned_to_user_id,
                status,
                priority,
                generated_at,
                task_data
              ) VALUES (
                v_checklist.id,
                v_checklist.template_id,
                v_checklist.company_id,
                v_checklist.site_id,
                v_checklist.name,
                v_today,
                CASE WHEN v_time IS NOT NULL AND v_time != '' THEN v_time::TIME ELSE NULL END,
                v_daypart,
                v_assigned_user_id,
                'pending',
                'medium',
                NOW(),
                jsonb_build_object(
                  'source_type', 'site_checklist',
                  'equipment_config', v_checklist.equipment_config
                )
              );
              v_tasks_created := v_tasks_created + 1;
            END IF;
          END IF;
        END LOOP;
      ELSE
        -- No daypart_times specified, create single task with 'anytime'
        IF NOT EXISTS (
          SELECT 1 FROM checklist_tasks
          WHERE site_checklist_id = v_checklist.id
            AND due_date = v_today
            AND (daypart IS NULL OR daypart = 'anytime')
        ) THEN
          INSERT INTO checklist_tasks (
            site_checklist_id,
            template_id,
            company_id,
            site_id,
            custom_name,
            due_date,
            due_time,
            daypart,
            assigned_to_user_id,
            status,
            priority,
            generated_at,
            task_data
          ) VALUES (
            v_checklist.id,
            v_checklist.template_id,
            v_checklist.company_id,
            v_checklist.site_id,
            v_checklist.name,
            v_today,
            '09:00'::TIME,
            'anytime',
            v_assigned_user_id,
            'pending',
            'medium',
            NOW(),
            jsonb_build_object(
              'source_type', 'site_checklist',
              'equipment_config', v_checklist.equipment_config
            )
          );
          v_tasks_created := v_tasks_created + 1;
        END IF;
      END IF;
    END;
  END LOOP;
  
  RAISE NOTICE 'Created % tasks from site_checklists', v_tasks_created;
END $$;

-- Step 2: Generate tasks from certificates, documents, PPM, SOPs, RAs, closures
-- Inlined logic to avoid function ambiguity
DO $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_warning_days INTEGER := 30;
  v_warning_date DATE := v_today + (v_warning_days || ' days')::interval;
  v_profile RECORD;
  v_doc RECORD;
  v_ppm RECORD;
  v_sop RECORD;
  v_ra RECORD;
  v_closure RECORD;
  v_certificate_count INTEGER := 0;
  v_document_count INTEGER := 0;
  v_ppm_count INTEGER := 0;
  v_sop_count INTEGER := 0;
  v_ra_count INTEGER := 0;
  v_closure_count INTEGER := 0;
BEGIN
  -- Skip if required tables don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE NOTICE '⚠️ profiles table does not exist - skipping certificate/document task generation';
    RETURN;
  END IF;

  RAISE NOTICE 'Generating tasks from certificates, documents, PPM, SOPs, RAs...';
  
  -- ===== CERTIFICATES =====
  FOR v_profile IN
    SELECT 
      p.id as profile_id,
      p.company_id,
      COALESCE(p.site_id, p.home_site) as site_id,
      p.full_name,
      p.food_safety_level,
      p.food_safety_expiry_date,
      p.h_and_s_level,
      p.h_and_s_expiry_date,
      p.fire_marshal_expiry_date,
      p.first_aid_expiry_date,
      p.cossh_expiry_date
    FROM profiles p
    WHERE p.company_id IS NOT NULL
      AND (p.site_id IS NOT NULL OR p.home_site IS NOT NULL)
  LOOP
    -- Food Safety Certificate
    IF v_profile.food_safety_expiry_date IS NOT NULL 
       AND v_profile.food_safety_expiry_date <= v_warning_date 
       AND v_profile.food_safety_expiry_date > v_today THEN
      INSERT INTO checklist_tasks (
        template_id, company_id, site_id, due_date, due_time, daypart,
        assigned_to_role, assigned_to_user_id, status, priority,
        generated_at, expires_at, task_data
      )
      SELECT NULL, v_profile.company_id, v_profile.site_id, v_profile.food_safety_expiry_date - INTERVAL '30 days',
             '09:00'::TIME, 'anytime', 'manager', NULL, 'pending', 'high',
             NOW(), v_profile.food_safety_expiry_date,
             jsonb_build_object(
               'source', 'cron',
               'type', 'certificate_renewal',
               'certificate_type', 'food_safety',
               'profile_id', v_profile.profile_id,
               'profile_name', v_profile.full_name,
               'level', v_profile.food_safety_level,
               'expiry_date', v_profile.food_safety_expiry_date
             )
      WHERE NOT EXISTS (
        SELECT 1 FROM checklist_tasks
        WHERE company_id = v_profile.company_id
          AND site_id = v_profile.site_id
          AND due_date = v_profile.food_safety_expiry_date - INTERVAL '30 days'
          AND task_data->>'type' = 'certificate_renewal'
          AND task_data->>'certificate_type' = 'food_safety'
          AND task_data->>'profile_id' = v_profile.profile_id::text
      );
      v_certificate_count := v_certificate_count + 1;
    END IF;

    -- H&S Certificate
    IF v_profile.h_and_s_expiry_date IS NOT NULL 
       AND v_profile.h_and_s_expiry_date <= v_warning_date 
       AND v_profile.h_and_s_expiry_date > v_today THEN
      INSERT INTO checklist_tasks (
        template_id, company_id, site_id, due_date, due_time, daypart,
        assigned_to_role, assigned_to_user_id, status, priority,
        generated_at, expires_at, task_data
      )
      SELECT NULL, v_profile.company_id, v_profile.site_id, v_profile.h_and_s_expiry_date - INTERVAL '30 days',
             '09:00'::TIME, 'anytime', 'manager', NULL, 'pending', 'high',
             NOW(), v_profile.h_and_s_expiry_date,
             jsonb_build_object(
               'source', 'cron',
               'type', 'certificate_renewal',
               'certificate_type', 'h_and_s',
               'profile_id', v_profile.profile_id,
               'profile_name', v_profile.full_name,
               'level', v_profile.h_and_s_level,
               'expiry_date', v_profile.h_and_s_expiry_date
             )
      WHERE NOT EXISTS (
        SELECT 1 FROM checklist_tasks
        WHERE company_id = v_profile.company_id
          AND site_id = v_profile.site_id
          AND due_date = v_profile.h_and_s_expiry_date - INTERVAL '30 days'
          AND task_data->>'type' = 'certificate_renewal'
          AND task_data->>'certificate_type' = 'h_and_s'
          AND task_data->>'profile_id' = v_profile.profile_id::text
      );
      v_certificate_count := v_certificate_count + 1;
    END IF;

    -- Fire Marshal Certificate
    IF v_profile.fire_marshal_expiry_date IS NOT NULL 
       AND v_profile.fire_marshal_expiry_date <= v_warning_date 
       AND v_profile.fire_marshal_expiry_date > v_today THEN
      INSERT INTO checklist_tasks (
        template_id, company_id, site_id, due_date, due_time, daypart,
        assigned_to_role, assigned_to_user_id, status, priority,
        generated_at, expires_at, task_data
      )
      SELECT NULL, v_profile.company_id, v_profile.site_id, v_profile.fire_marshal_expiry_date - INTERVAL '30 days',
             '09:00'::TIME, 'anytime', 'manager', NULL, 'pending', 'high',
             NOW(), v_profile.fire_marshal_expiry_date,
             jsonb_build_object(
               'source', 'cron',
               'type', 'certificate_renewal',
               'certificate_type', 'fire_marshal',
               'profile_id', v_profile.profile_id,
               'profile_name', v_profile.full_name,
               'expiry_date', v_profile.fire_marshal_expiry_date
             )
      WHERE NOT EXISTS (
        SELECT 1 FROM checklist_tasks
        WHERE company_id = v_profile.company_id
          AND site_id = v_profile.site_id
          AND due_date = v_profile.fire_marshal_expiry_date - INTERVAL '30 days'
          AND task_data->>'type' = 'certificate_renewal'
          AND task_data->>'certificate_type' = 'fire_marshal'
          AND task_data->>'profile_id' = v_profile.profile_id::text
      );
      v_certificate_count := v_certificate_count + 1;
    END IF;

    -- First Aid Certificate
    IF v_profile.first_aid_expiry_date IS NOT NULL 
       AND v_profile.first_aid_expiry_date <= v_warning_date 
       AND v_profile.first_aid_expiry_date > v_today THEN
      INSERT INTO checklist_tasks (
        template_id, company_id, site_id, due_date, due_time, daypart,
        assigned_to_role, assigned_to_user_id, status, priority,
        generated_at, expires_at, task_data
      )
      SELECT NULL, v_profile.company_id, v_profile.site_id, v_profile.first_aid_expiry_date - INTERVAL '30 days',
             '09:00'::TIME, 'anytime', 'manager', NULL, 'pending', 'high',
             NOW(), v_profile.first_aid_expiry_date,
             jsonb_build_object(
               'source', 'cron',
               'type', 'certificate_renewal',
               'certificate_type', 'first_aid',
               'profile_id', v_profile.profile_id,
               'profile_name', v_profile.full_name,
               'expiry_date', v_profile.first_aid_expiry_date
             )
      WHERE NOT EXISTS (
        SELECT 1 FROM checklist_tasks
        WHERE company_id = v_profile.company_id
          AND site_id = v_profile.site_id
          AND due_date = v_profile.first_aid_expiry_date - INTERVAL '30 days'
          AND task_data->>'type' = 'certificate_renewal'
          AND task_data->>'certificate_type' = 'first_aid'
          AND task_data->>'profile_id' = v_profile.profile_id::text
      );
      v_certificate_count := v_certificate_count + 1;
    END IF;

    -- COSSH Certificate
    IF v_profile.cossh_expiry_date IS NOT NULL 
       AND v_profile.cossh_expiry_date <= v_warning_date 
       AND v_profile.cossh_expiry_date > v_today THEN
      INSERT INTO checklist_tasks (
        template_id, company_id, site_id, due_date, due_time, daypart,
        assigned_to_role, assigned_to_user_id, status, priority,
        generated_at, expires_at, task_data
      )
      SELECT NULL, v_profile.company_id, v_profile.site_id, v_profile.cossh_expiry_date - INTERVAL '30 days',
             '09:00'::TIME, 'anytime', 'manager', NULL, 'pending', 'high',
             NOW(), v_profile.cossh_expiry_date,
             jsonb_build_object(
               'source', 'cron',
               'type', 'certificate_renewal',
               'certificate_type', 'cossh',
               'profile_id', v_profile.profile_id,
               'profile_name', v_profile.full_name,
               'expiry_date', v_profile.cossh_expiry_date
             )
      WHERE NOT EXISTS (
        SELECT 1 FROM checklist_tasks
        WHERE company_id = v_profile.company_id
          AND site_id = v_profile.site_id
          AND due_date = v_profile.cossh_expiry_date - INTERVAL '30 days'
          AND task_data->>'type' = 'certificate_renewal'
          AND task_data->>'certificate_type' = 'cossh'
          AND task_data->>'profile_id' = v_profile.profile_id::text
      );
      v_certificate_count := v_certificate_count + 1;
    END IF;
  END LOOP;

  -- ===== DOCUMENTS (COSHH) =====
  FOR v_doc IN
    SELECT 
      cds.id,
      cds.company_id,
      cds.product_name,
      cds.expiry_date,
      a.site_id
    FROM coshh_data_sheets cds
    LEFT JOIN chemicals_library cl ON cds.chemical_id = cl.id
    LEFT JOIN assets a ON cl.id = a.id
    WHERE cds.expiry_date IS NOT NULL
      AND cds.expiry_date <= v_warning_date
      AND cds.expiry_date > v_today
      AND cds.status = 'Active'
  LOOP
    INSERT INTO checklist_tasks (
      template_id, company_id, site_id, due_date, due_time, daypart,
      assigned_to_role, assigned_to_user_id, status, priority,
      generated_at, expires_at, task_data
    )
    SELECT NULL, v_doc.company_id, v_doc.site_id, v_doc.expiry_date - INTERVAL '30 days',
           '09:00'::TIME, 'anytime', 'manager', NULL, 'pending', 'medium',
           NOW(), v_doc.expiry_date,
           jsonb_build_object(
             'source', 'cron',
             'type', 'document_expiry',
             'document_type', 'coshh',
             'document_id', v_doc.id,
             'product_name', v_doc.product_name,
             'expiry_date', v_doc.expiry_date
           )
    WHERE NOT EXISTS (
      SELECT 1 FROM checklist_tasks
      WHERE company_id = v_doc.company_id
        AND due_date = v_doc.expiry_date - INTERVAL '30 days'
        AND task_data->>'type' = 'document_expiry'
        AND task_data->>'document_id' = v_doc.id::text
    );
    v_document_count := v_document_count + 1;
  END LOOP;

  -- ===== PPM SERVICE DATES =====
  -- Check which column exists: next_service_date or next_due_date
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ppm_schedule' 
    AND column_name = 'next_service_date'
  ) THEN
    FOR v_ppm IN
      SELECT 
        ps.id,
        ps.asset_id,
        ps.next_service_date as service_date,
        a.company_id,
        a.site_id,
        a.name as asset_name
      FROM ppm_schedule ps
      JOIN assets a ON ps.asset_id = a.id
      WHERE ps.next_service_date <= v_warning_date
        AND ps.next_service_date > v_today
        AND ps.status IN ('upcoming', 'due')
        AND a.archived = false
    LOOP
      INSERT INTO checklist_tasks (
        template_id, company_id, site_id, due_date, due_time, daypart,
        assigned_to_role, assigned_to_user_id, status, priority,
        generated_at, expires_at, task_data
      )
      SELECT NULL, v_ppm.company_id, v_ppm.site_id, v_ppm.service_date - INTERVAL '30 days',
             '09:00'::TIME, 'anytime', 'manager', NULL, 'pending', 'medium',
             NOW(), v_ppm.service_date,
             jsonb_build_object(
               'source', 'cron',
               'type', 'ppm_service',
               'ppm_id', v_ppm.id,
               'asset_id', v_ppm.asset_id,
               'asset_name', v_ppm.asset_name,
               'service_date', v_ppm.service_date
             )
      WHERE NOT EXISTS (
        SELECT 1 FROM checklist_tasks
        WHERE company_id = v_ppm.company_id
          AND site_id = v_ppm.site_id
          AND due_date = v_ppm.service_date - INTERVAL '30 days'
          AND task_data->>'type' = 'ppm_service'
          AND task_data->>'ppm_id' = v_ppm.id::text
      );
      v_ppm_count := v_ppm_count + 1;
    END LOOP;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ppm_schedule' 
    AND column_name = 'next_due_date'
  ) THEN
    FOR v_ppm IN
      SELECT 
        ps.id,
        ps.asset_id,
        ps.next_due_date as service_date,
        a.company_id,
        a.site_id,
        a.name as asset_name
      FROM ppm_schedule ps
      JOIN assets a ON ps.asset_id = a.id
      WHERE ps.next_due_date <= v_warning_date
        AND ps.next_due_date > v_today
        AND ps.status IN ('upcoming', 'due')
        AND a.archived = false
    LOOP
      INSERT INTO checklist_tasks (
        template_id, company_id, site_id, due_date, due_time, daypart,
        assigned_to_role, assigned_to_user_id, status, priority,
        generated_at, expires_at, task_data
      )
      SELECT NULL, v_ppm.company_id, v_ppm.site_id, v_ppm.service_date - INTERVAL '30 days',
             '09:00'::TIME, 'anytime', 'manager', NULL, 'pending', 'medium',
             NOW(), v_ppm.service_date,
             jsonb_build_object(
               'source', 'cron',
               'type', 'ppm_service',
               'ppm_id', v_ppm.id,
               'asset_id', v_ppm.asset_id,
               'asset_name', v_ppm.asset_name,
               'service_date', v_ppm.service_date
             )
      WHERE NOT EXISTS (
        SELECT 1 FROM checklist_tasks
        WHERE company_id = v_ppm.company_id
          AND site_id = v_ppm.site_id
          AND due_date = v_ppm.service_date - INTERVAL '30 days'
          AND task_data->>'type' = 'ppm_service'
          AND task_data->>'ppm_id' = v_ppm.id::text
      );
      v_ppm_count := v_ppm_count + 1;
    END LOOP;
  END IF;

  -- ===== SOP REVIEWS =====
  FOR v_sop IN
    SELECT 
      se.id,
      se.company_id,
      se.title,
      se.ref_code,
      (se.sop_data->>'review_date')::date as review_date
    FROM sop_entries se
    WHERE se.status = 'Published'
      AND (se.sop_data->>'review_date')::date IS NOT NULL
      AND (se.sop_data->>'review_date')::date <= v_warning_date
      AND (se.sop_data->>'review_date')::date > v_today
  LOOP
    INSERT INTO checklist_tasks (
      template_id, company_id, site_id, due_date, due_time, daypart,
      assigned_to_role, assigned_to_user_id, status, priority,
      generated_at, expires_at, task_data
    )
    SELECT NULL, v_sop.company_id, NULL, v_sop.review_date - INTERVAL '30 days',
           '09:00'::TIME, 'anytime', 'manager', NULL, 'pending', 'medium',
           NOW(), v_sop.review_date,
           jsonb_build_object(
             'source', 'cron',
             'type', 'sop_review',
             'sop_id', v_sop.id,
             'sop_title', v_sop.title,
             'sop_ref_code', v_sop.ref_code,
             'review_date', v_sop.review_date
           )
    WHERE NOT EXISTS (
      SELECT 1 FROM checklist_tasks
      WHERE company_id = v_sop.company_id
        AND due_date = v_sop.review_date - INTERVAL '30 days'
        AND task_data->>'type' = 'sop_review'
        AND task_data->>'sop_id' = v_sop.id::text
    );
    v_sop_count := v_sop_count + 1;
  END LOOP;

  -- ===== RISK ASSESSMENTS =====
  FOR v_ra IN
    SELECT 
      ra.id,
      ra.company_id,
      ra.site_id,
      ra.title,
      ra.ref_code,
      ra.next_review_date
    FROM risk_assessments ra
    WHERE ra.next_review_date IS NOT NULL
      AND ra.next_review_date <= v_warning_date
      AND ra.next_review_date > v_today
      AND ra.status = 'Published'
  LOOP
    INSERT INTO checklist_tasks (
      template_id, company_id, site_id, due_date, due_time, daypart,
      assigned_to_role, assigned_to_user_id, status, priority,
      generated_at, expires_at, task_data
    )
    SELECT NULL, v_ra.company_id, v_ra.site_id, v_ra.next_review_date - INTERVAL '30 days',
           '09:00'::TIME, 'anytime', 'manager', NULL, 'pending', 'medium',
           NOW(), v_ra.next_review_date,
           jsonb_build_object(
             'source', 'cron',
             'type', 'risk_assessment_review',
             'ra_id', v_ra.id,
             'ra_title', v_ra.title,
             'ra_ref_code', v_ra.ref_code,
             'review_date', v_ra.next_review_date
           )
    WHERE NOT EXISTS (
      SELECT 1 FROM checklist_tasks
      WHERE company_id = v_ra.company_id
        AND site_id = v_ra.site_id
        AND due_date = v_ra.next_review_date - INTERVAL '30 days'
        AND task_data->>'type' = 'risk_assessment_review'
        AND task_data->>'ra_id' = v_ra.id::text
    );
    v_ra_count := v_ra_count + 1;
  END LOOP;

  -- ===== SITE CLOSURES =====
  FOR v_closure IN
    SELECT 
      sc.id,
      sc.site_id,
      sc.closure_start,
      sc.closure_end,
      sc.notes,
      s.company_id,
      s.name as site_name
    FROM site_closures sc
    JOIN sites s ON sc.site_id = s.id
    WHERE sc.is_active = true
      AND sc.closure_start <= (v_today + INTERVAL '7 days')
      AND sc.closure_start > v_today
  LOOP
    INSERT INTO checklist_tasks (
      template_id, company_id, site_id, due_date, due_time, daypart,
      assigned_to_role, assigned_to_user_id, status, priority,
      generated_at, expires_at, task_data
    )
    SELECT NULL, v_closure.company_id, v_closure.site_id, v_closure.closure_start - INTERVAL '7 days',
           '09:00'::TIME, 'anytime', 'manager', NULL, 'pending', 'medium',
           NOW(), v_closure.closure_start,
           jsonb_build_object(
             'source', 'cron',
             'type', 'site_closure_reminder',
             'closure_id', v_closure.id,
             'site_name', v_closure.site_name,
             'closure_start', v_closure.closure_start,
             'closure_end', v_closure.closure_end,
             'notes', COALESCE(v_closure.notes, '')
           )
    WHERE NOT EXISTS (
      SELECT 1 FROM checklist_tasks
      WHERE company_id = v_closure.company_id
        AND site_id = v_closure.site_id
        AND due_date = v_closure.closure_start - INTERVAL '7 days'
        AND task_data->>'type' = 'site_closure_reminder'
        AND task_data->>'closure_id' = v_closure.id::text
    );
    v_closure_count := v_closure_count + 1;
  END LOOP;

  RAISE NOTICE 'Task generation results:';
  RAISE NOTICE '  Certificate tasks: %', v_certificate_count;
  RAISE NOTICE '  Document tasks: %', v_document_count;
  RAISE NOTICE '  PPM tasks: %', v_ppm_count;
  RAISE NOTICE '  SOP tasks: %', v_sop_count;
  RAISE NOTICE '  RA tasks: %', v_ra_count;
  RAISE NOTICE '  Closure tasks: %', v_closure_count;
END $$;

-- Step 3: Final verification
DO $$
DECLARE
  v_total_tasks INTEGER;
  v_site_checklist_tasks INTEGER;
  v_cron_tasks INTEGER;
BEGIN
  -- Skip if required tables don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_tasks') THEN
    RAISE NOTICE '⚠️ checklist_tasks table does not exist - skipping verification';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_total_tasks FROM checklist_tasks WHERE due_date = CURRENT_DATE;
  SELECT COUNT(*) INTO v_site_checklist_tasks FROM checklist_tasks WHERE due_date = CURRENT_DATE AND task_data->>'source_type' = 'site_checklist';
  SELECT COUNT(*) INTO v_cron_tasks FROM checklist_tasks WHERE due_date = CURRENT_DATE AND task_data->>'source' = 'cron';
  
  RAISE NOTICE 'Final task counts for today:';
  RAISE NOTICE '  Total tasks: %', v_total_tasks;
  RAISE NOTICE '  From site_checklists: %', v_site_checklist_tasks;
  RAISE NOTICE '  From certificates/documents/PPM/SOPs/RAs: %', v_cron_tasks;
END $$;

COMMIT;
