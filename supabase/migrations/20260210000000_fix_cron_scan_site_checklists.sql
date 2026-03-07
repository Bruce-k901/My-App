-- ============================================================================
-- Migration: Fix cron to also scan site_checklists for task generation
-- Problem: The cron only pattern-matches from existing checklist_tasks.
--          If no seed task exists (chicken-and-egg), the cron never generates tasks.
-- Fix: Add Part 1b that scans site_checklists (active=true) directly
--       and creates checklist_tasks based on frequency/schedule.
-- ============================================================================

-- Update the generate_daily_tasks function to also scan site_checklists
CREATE OR REPLACE FUNCTION generate_daily_tasks()
RETURNS TABLE(
  active_tasks_created bigint,
  certificate_tasks_created bigint,
  document_tasks_created bigint,
  ppm_tasks_created bigint,
  sop_tasks_created bigint,
  ra_tasks_created bigint,
  closure_tasks_created bigint,
  errors text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_count bigint := 0;
  v_certificate_count bigint := 0;
  v_document_count bigint := 0;
  v_ppm_count bigint := 0;
  v_sop_count bigint := 0;
  v_ra_count bigint := 0;
  v_closure_count bigint := 0;
  v_errors text[] := '{}';
  v_today date;
  v_task_pattern record;
  v_final_time TIME;
  v_existing_task_id uuid;
BEGIN
  v_today := CURRENT_DATE;

  -- ===== PART 1: GENERATE TASKS FROM ACTIVE TASKS (existing pattern-match) =====
  -- Scan Active Tasks (manually created, NOT cron-generated) and create instances for today
  BEGIN
    FOR v_task_pattern IN
      SELECT DISTINCT ON (ct.template_id, ct.site_id, ct.daypart, ct.due_time)
        ct.template_id,
        ct.company_id,
        ct.site_id,
        ct.daypart,
        ct.due_time,
        ct.assigned_to_role,
        ct.assigned_to_user_id,
        ct.priority,
        ct.task_data,
        tt.frequency,
        tt.recurrence_pattern as template_recurrence_pattern,
        tt.is_active
      FROM checklist_tasks ct
      INNER JOIN task_templates tt ON ct.template_id = tt.id
      WHERE (ct.task_data->>'source' IS NULL OR ct.task_data->>'source' != 'cron')
        AND ct.template_id IS NOT NULL
        AND ct.site_id IS NOT NULL
        AND (tt.is_active = true OR tt.is_active IS NULL)
      ORDER BY ct.template_id, ct.site_id, ct.daypart, ct.due_time, ct.created_at DESC
    LOOP
      BEGIN
        -- Check if task already exists for today
        SELECT id INTO v_existing_task_id
        FROM checklist_tasks
        WHERE template_id = v_task_pattern.template_id
          AND site_id = v_task_pattern.site_id
          AND daypart = v_task_pattern.daypart
          AND due_time = v_task_pattern.due_time
          AND due_date = v_today
        LIMIT 1;

        IF v_existing_task_id IS NULL THEN
          -- Convert daypart names to time if needed
          IF v_task_pattern.due_time IS NULL OR v_task_pattern.due_time::text IN ('before_open', 'during_service', 'after_service', 'anytime') THEN
            CASE COALESCE(v_task_pattern.daypart, 'anytime')
              WHEN 'before_open' THEN v_final_time := '08:00'::TIME;
              WHEN 'during_service' THEN v_final_time := '12:00'::TIME;
              WHEN 'after_service' THEN v_final_time := '18:00'::TIME;
              ELSE v_final_time := '09:00'::TIME;
            END CASE;
          ELSE
            BEGIN
              v_final_time := v_task_pattern.due_time::TIME;
            EXCEPTION WHEN OTHERS THEN
              v_final_time := '09:00'::TIME;
            END;
          END IF;

          -- Handle frequency: daily tasks run every day, weekly/monthly check dates
          DECLARE
            v_should_create boolean := false;
            v_pattern JSONB;
          BEGIN
            -- Get recurrence pattern from task_data or template
            v_pattern := COALESCE(
              v_task_pattern.task_data->'recurrence_pattern',
              v_task_pattern.template_recurrence_pattern
            );

            IF v_task_pattern.frequency = 'daily' THEN
              v_should_create := true;
            ELSIF v_task_pattern.frequency = 'weekly' THEN
              IF v_pattern ? 'days' THEN
                v_should_create := EXTRACT(DOW FROM v_today) = ANY(ARRAY(SELECT jsonb_array_elements_text(v_pattern->'days')::int));
              ELSE
                v_should_create := EXTRACT(DOW FROM v_today) = 1;
              END IF;
            ELSIF v_task_pattern.frequency = 'monthly' THEN
              IF v_pattern ? 'date_of_month' THEN
                v_should_create := EXTRACT(DAY FROM v_today) = (v_pattern->>'date_of_month')::int;
              ELSE
                v_should_create := EXTRACT(DAY FROM v_today) = 1;
              END IF;
            END IF;

            IF v_should_create THEN
              INSERT INTO checklist_tasks (
                template_id, company_id, site_id, due_date, due_time, daypart,
                assigned_to_role, assigned_to_user_id, status, priority,
                generated_at, expires_at, task_data
              ) VALUES (
                v_task_pattern.template_id,
                v_task_pattern.company_id,
                v_task_pattern.site_id,
                v_today,
                v_final_time,
                v_task_pattern.daypart,
                v_task_pattern.assigned_to_role,
                v_task_pattern.assigned_to_user_id,
                'pending',
                COALESCE(v_task_pattern.priority, 'medium'),
                NOW(),
                v_today + INTERVAL '1 day',
                jsonb_build_object(
                  'source', 'cron',
                  'original_task_data', COALESCE(v_task_pattern.task_data, '{}'::jsonb)
                )
              );
              v_active_count := v_active_count + 1;
            END IF;
          END;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_errors := array_append(v_errors, 'Active task error: ' || SQLERRM);
      END;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    v_errors := array_append(v_errors, 'Active tasks scanning error: ' || SQLERRM);
  END;

  -- ===== PART 1b: GENERATE TASKS FROM SITE_CHECKLISTS (NEW) =====
  -- Scan site_checklists (active=true) and create checklist_tasks for today.
  -- This ensures tasks are generated even when no seed checklist_task exists
  -- (fixes the chicken-and-egg problem with Part 1's pattern-matching approach).
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_checklists') THEN
      DECLARE
        v_sc record;
        v_sc_should_create boolean;
        v_sc_final_time TIME;
        v_daypart_key text;
        v_time_val jsonb;
        v_time_text text;
      BEGIN
        FOR v_sc IN
          SELECT
            sc.id as sc_id,
            sc.template_id,
            sc.company_id,
            sc.site_id,
            sc.name,
            sc.frequency,
            sc.daypart_times,
            sc.equipment_config,
            sc.days_of_week,
            sc.date_of_month,
            sc.anniversary_date,
            tt.recurrence_pattern
          FROM site_checklists sc
          INNER JOIN task_templates tt ON sc.template_id = tt.id
          WHERE sc.active = true
            AND sc.site_id IS NOT NULL
            AND sc.company_id IS NOT NULL
        LOOP
          BEGIN
            -- Check frequency against today
            v_sc_should_create := false;

            IF v_sc.frequency = 'daily' THEN
              v_sc_should_create := true;
            ELSIF v_sc.frequency = 'weekly' THEN
              IF v_sc.days_of_week IS NOT NULL AND array_length(v_sc.days_of_week, 1) > 0 THEN
                v_sc_should_create := EXTRACT(DOW FROM v_today)::int = ANY(v_sc.days_of_week);
              ELSE
                v_sc_should_create := EXTRACT(DOW FROM v_today) = 1;
              END IF;
            ELSIF v_sc.frequency = 'monthly' THEN
              IF v_sc.date_of_month IS NOT NULL THEN
                v_sc_should_create := EXTRACT(DAY FROM v_today)::int = v_sc.date_of_month;
              ELSE
                v_sc_should_create := EXTRACT(DAY FROM v_today) = 1;
              END IF;
            ELSIF v_sc.frequency = 'annually' THEN
              IF v_sc.anniversary_date IS NOT NULL THEN
                v_sc_should_create := (
                  EXTRACT(MONTH FROM v_today) = EXTRACT(MONTH FROM v_sc.anniversary_date)
                  AND EXTRACT(DAY FROM v_today) = EXTRACT(DAY FROM v_sc.anniversary_date)
                );
              END IF;
            END IF;

            IF v_sc_should_create THEN
              -- Generate tasks per daypart from daypart_times JSON
              -- Format: {"before_open": "07:00", "during_service": "12:00"} or {"before_open": ["07:00","08:00"]}
              IF v_sc.daypart_times IS NOT NULL AND v_sc.daypart_times != '{}'::jsonb THEN
                FOR v_daypart_key IN SELECT jsonb_object_keys(v_sc.daypart_times)
                LOOP
                  v_time_val := v_sc.daypart_times->v_daypart_key;

                  -- Handle both string and array values
                  IF jsonb_typeof(v_time_val) = 'array' THEN
                    FOR v_time_text IN SELECT jsonb_array_elements_text(v_time_val)
                    LOOP
                      -- Check if task already exists for today + daypart + time
                      SELECT id INTO v_existing_task_id
                      FROM checklist_tasks
                      WHERE template_id = v_sc.template_id
                        AND site_id = v_sc.site_id
                        AND due_date = v_today
                        AND daypart = v_daypart_key
                        AND due_time::text = v_time_text
                      LIMIT 1;

                      IF v_existing_task_id IS NULL THEN
                        BEGIN
                          v_sc_final_time := v_time_text::TIME;
                        EXCEPTION WHEN OTHERS THEN
                          v_sc_final_time := '09:00'::TIME;
                        END;

                        INSERT INTO checklist_tasks (
                          template_id, company_id, site_id, custom_name,
                          due_date, due_time, daypart, status, priority,
                          generated_at, expires_at, task_data
                        ) VALUES (
                          v_sc.template_id,
                          v_sc.company_id,
                          v_sc.site_id,
                          v_sc.name,
                          v_today,
                          v_sc_final_time,
                          v_daypart_key,
                          'pending',
                          'medium',
                          NOW(),
                          v_today + INTERVAL '1 day',
                          jsonb_build_object(
                            'source', 'cron',
                            'from_site_checklist', v_sc.sc_id,
                            'default_checklist_items', COALESCE(v_sc.recurrence_pattern->'default_checklist_items', '[]'::jsonb),
                            'equipment_config', COALESCE(to_jsonb(v_sc.equipment_config), '[]'::jsonb)
                          )
                        );
                        v_active_count := v_active_count + 1;
                      END IF;
                      v_existing_task_id := NULL;
                    END LOOP;
                  ELSE
                    -- Single string value
                    v_time_text := v_time_val #>> '{}';

                    SELECT id INTO v_existing_task_id
                    FROM checklist_tasks
                    WHERE template_id = v_sc.template_id
                      AND site_id = v_sc.site_id
                      AND due_date = v_today
                      AND daypart = v_daypart_key
                    LIMIT 1;

                    IF v_existing_task_id IS NULL THEN
                      BEGIN
                        v_sc_final_time := v_time_text::TIME;
                      EXCEPTION WHEN OTHERS THEN
                        v_sc_final_time := '09:00'::TIME;
                      END;

                      INSERT INTO checklist_tasks (
                        template_id, company_id, site_id, custom_name,
                        due_date, due_time, daypart, status, priority,
                        generated_at, expires_at, task_data
                      ) VALUES (
                        v_sc.template_id,
                        v_sc.company_id,
                        v_sc.site_id,
                        v_sc.name,
                        v_today,
                        v_sc_final_time,
                        v_daypart_key,
                        'pending',
                        'medium',
                        NOW(),
                        v_today + INTERVAL '1 day',
                        jsonb_build_object(
                          'source', 'cron',
                          'from_site_checklist', v_sc.sc_id,
                          'default_checklist_items', COALESCE(v_sc.recurrence_pattern->'default_checklist_items', '[]'::jsonb),
                          'equipment_config', COALESCE(to_jsonb(v_sc.equipment_config), '[]'::jsonb)
                        )
                      );
                      v_active_count := v_active_count + 1;
                    END IF;
                    v_existing_task_id := NULL;
                  END IF;
                END LOOP;
              ELSE
                -- No daypart_times defined - create single task with default time
                SELECT id INTO v_existing_task_id
                FROM checklist_tasks
                WHERE template_id = v_sc.template_id
                  AND site_id = v_sc.site_id
                  AND due_date = v_today
                LIMIT 1;

                IF v_existing_task_id IS NULL THEN
                  INSERT INTO checklist_tasks (
                    template_id, company_id, site_id, custom_name,
                    due_date, due_time, daypart, status, priority,
                    generated_at, expires_at, task_data
                  ) VALUES (
                    v_sc.template_id,
                    v_sc.company_id,
                    v_sc.site_id,
                    v_sc.name,
                    v_today,
                    '09:00'::TIME,
                    'anytime',
                    'pending',
                    'medium',
                    NOW(),
                    v_today + INTERVAL '1 day',
                    jsonb_build_object(
                      'source', 'cron',
                      'from_site_checklist', v_sc.sc_id,
                      'default_checklist_items', COALESCE(v_sc.recurrence_pattern->'default_checklist_items', '[]'::jsonb),
                      'equipment_config', COALESCE(to_jsonb(v_sc.equipment_config), '[]'::jsonb)
                    )
                  );
                  v_active_count := v_active_count + 1;
                END IF;
                v_existing_task_id := NULL;
              END IF;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            v_errors := array_append(v_errors, 'Site checklist error (sc_id=' || v_sc.sc_id || '): ' || SQLERRM);
          END;
        END LOOP;
      END;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_errors := array_append(v_errors, 'Site checklists scanning error: ' || SQLERRM);
  END;

  -- ===== PART 2: SCAN TRAINING CERTIFICATES =====
  -- Create tasks 30 days before certificate expiry dates
  BEGIN
    DECLARE
      v_warning_days int := 30;
      v_warning_date date := v_today + (v_warning_days || ' days')::interval;
      v_profile record;
    BEGIN
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
    END;
  EXCEPTION WHEN OTHERS THEN
    v_errors := array_append(v_errors, 'Certificate scanning error: ' || SQLERRM);
  END;

  -- ===== PART 3: SCAN ORG/DOCUMENTS FOR EXPIRY DATES =====
  -- Scan COSHH data sheets and other documents with expiry dates
  BEGIN
    DECLARE
      v_warning_days int := 30;
      v_warning_date date := v_today + (v_warning_days || ' days')::interval;
      v_doc record;
    BEGIN
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
    END;
  EXCEPTION WHEN OTHERS THEN
    v_errors := array_append(v_errors, 'Document scanning error: ' || SQLERRM);
  END;

  -- ===== PART 4: SCAN ASSETS FOR PPM SERVICE DATES =====
  BEGIN
    DECLARE
      v_warning_days int := 30;
      v_warning_date date := v_today + (v_warning_days || ' days')::interval;
      v_ppm record;
    BEGIN
      FOR v_ppm IN
        SELECT
          ps.id,
          ps.asset_id,
          ps.next_service_date,
          a.company_id,
          a.site_id,
          a.name as asset_name
        FROM ppm_schedule ps
        JOIN assets a ON ps.asset_id = a.id
        WHERE ps.next_service_date <= v_warning_date
          AND ps.next_service_date > v_today
          AND ps.status IN ('upcoming', 'due')
      LOOP
        INSERT INTO checklist_tasks (
          template_id, company_id, site_id, due_date, due_time, daypart,
          assigned_to_role, assigned_to_user_id, status, priority,
          generated_at, expires_at, task_data
        )
        SELECT NULL, v_ppm.company_id, v_ppm.site_id, v_ppm.next_service_date - INTERVAL '30 days',
               '09:00'::TIME, 'anytime', 'manager', NULL, 'pending', 'medium',
               NOW(), v_ppm.next_service_date,
               jsonb_build_object(
                 'source', 'cron',
                 'type', 'ppm_service',
                 'ppm_id', v_ppm.id,
                 'asset_id', v_ppm.asset_id,
                 'asset_name', v_ppm.asset_name,
                 'service_date', v_ppm.next_service_date
               )
        WHERE NOT EXISTS (
          SELECT 1 FROM checklist_tasks
          WHERE company_id = v_ppm.company_id
            AND site_id = v_ppm.site_id
            AND due_date = v_ppm.next_service_date - INTERVAL '30 days'
            AND task_data->>'type' = 'ppm_service'
            AND task_data->>'ppm_id' = v_ppm.id::text
        );
        v_ppm_count := v_ppm_count + 1;
      END LOOP;
    END;
  EXCEPTION WHEN OTHERS THEN
    v_errors := array_append(v_errors, 'PPM scanning error: ' || SQLERRM);
  END;

  -- ===== PART 5: SCAN SOPs FOR REVIEW DATES =====
  BEGIN
    DECLARE
      v_warning_days int := 30;
      v_warning_date date := v_today + (v_warning_days || ' days')::interval;
      v_sop record;
    BEGIN
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
    END;
  EXCEPTION WHEN OTHERS THEN
    v_errors := array_append(v_errors, 'SOP scanning error: ' || SQLERRM);
  END;

  -- ===== PART 6: SCAN RISK ASSESSMENTS FOR REVIEW DATES =====
  BEGIN
    DECLARE
      v_warning_days int := 30;
      v_warning_date date := v_today + (v_warning_days || ' days')::interval;
      v_ra record;
    BEGIN
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
    END;
  EXCEPTION WHEN OTHERS THEN
    v_errors := array_append(v_errors, 'Risk Assessment scanning error: ' || SQLERRM);
  END;

  -- ===== PART 7: SCAN SITES FOR PLANNED CLOSURES =====
  BEGIN
    DECLARE
      v_warning_days int := 7;
      v_warning_date date := v_today + (v_warning_days || ' days')::interval;
      v_closure record;
    BEGIN
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
          AND sc.closure_start <= v_warning_date
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
    END;
  EXCEPTION WHEN OTHERS THEN
    v_errors := array_append(v_errors, 'Site closure scanning error: ' || SQLERRM);
  END;

  -- ===== PART 8: MANAGER CALENDAR TASKS & REMINDERS =====
  -- Note: If manager_calendar table exists, scan it here
  -- For now, skipping as table structure not confirmed

  RETURN QUERY SELECT v_active_count, v_certificate_count, v_document_count, v_ppm_count, v_sop_count, v_ra_count, v_closure_count, v_errors;
END;
$$;

-- Update comment
COMMENT ON FUNCTION generate_daily_tasks() IS
'Generates daily task instances from:
- Active Tasks (pattern-matching from existing checklist_tasks)
- Site Checklists (directly from site_checklists table - belt-and-suspenders)
- Training certificates expiring (30 days warning)
- Document expiry dates (COSHH sheets)
- PPM service dates (30 days warning)
- SOP review dates (30 days warning)
- Risk Assessment review dates (30 days warning)
- Planned site closures (7 days warning)
Runs daily at 3:00 AM BST (2:00 AM UTC).';
