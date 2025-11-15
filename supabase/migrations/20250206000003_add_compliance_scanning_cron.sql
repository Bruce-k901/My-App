-- ============================================
-- ADD COMPLIANCE SCANNING TO CRON JOB
-- Extends existing cron function to scan for:
-- - Upcoming PPM services (ppm_schedule.next_service_date)
-- - Certificate expiry (profiles.*_expiry_date)
-- - SOP review dates (sop_entries - annual review based on updated_at)
-- - RA review dates (risk_assessments.next_review_date)
-- Creates tasks in checklist_tasks table marked with source='cron'
-- ============================================

-- Update the cron function to include compliance scanning
-- This extends the existing function from 20250206000002_fix_cron_task_source.sql
CREATE OR REPLACE FUNCTION generate_daily_tasks_direct()
RETURNS TABLE(
  daily_created bigint,
  weekly_created bigint,
  monthly_created bigint,
  errors text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_daily_count bigint := 0;
  v_weekly_count bigint := 0;
  v_monthly_count bigint := 0;
  v_ppm_count bigint := 0;
  v_certificate_count bigint := 0;
  v_sop_review_count bigint := 0;
  v_ra_review_count bigint := 0;
  v_errors text[] := '{}';
  v_today date;
  v_day_of_week int;
  v_date_of_month int;
  v_template record;
  v_site record;
  v_dayparts text[];
  v_daypart text;
  v_existing_dayparts text[];
  v_warning_days int := 30; -- Create tasks 30 days before due dates
  v_final_time TIME; -- For converting time strings to TIME type
BEGIN
  v_today := CURRENT_DATE;
  v_day_of_week := EXTRACT(DOW FROM v_today); -- 0=Sunday, 1=Monday, etc.
  v_date_of_month := EXTRACT(DAY FROM v_today);
  
  -- ===== DAILY TASKS =====
  FOR v_template IN 
    SELECT * FROM task_templates 
    WHERE frequency = 'daily' 
      AND is_active = true
  LOOP
    BEGIN
      v_dayparts := v_template.dayparts;
      IF v_dayparts IS NULL OR array_length(v_dayparts, 1) IS NULL THEN
        v_dayparts := ARRAY['anytime'];
      END IF;
      
      FOR v_site IN 
        SELECT id, company_id FROM sites 
        WHERE (status IS NULL OR status != 'inactive')
          AND (v_template.site_id IS NULL OR id = v_template.site_id)
          AND (v_template.company_id IS NULL OR company_id = v_template.company_id)
      LOOP
        DECLARE
          v_existing_combinations TEXT[];
          v_daypart_times JSONB;
          v_times_for_daypart TEXT[];
          v_daypart_time_value JSONB;
          v_time_str TEXT;
        BEGIN
          IF v_template.recurrence_pattern ? 'daypart_times' THEN
            v_daypart_times := v_template.recurrence_pattern->'daypart_times';
          END IF;
          
          SELECT array_agg(DISTINCT COALESCE(daypart, '') || '|' || COALESCE(due_time::text, '')) 
          INTO v_existing_combinations
          FROM checklist_tasks
          WHERE template_id = v_template.id
            AND site_id = v_site.id
            AND due_date = v_today;
          
          FOREACH v_daypart IN ARRAY v_dayparts
          LOOP
            IF v_daypart_times IS NOT NULL AND v_daypart_times ? v_daypart THEN
              v_daypart_time_value := v_daypart_times->v_daypart;
              
              IF jsonb_typeof(v_daypart_time_value) = 'array' THEN
                SELECT array_agg(value::text) INTO v_times_for_daypart
                FROM jsonb_array_elements_text(v_daypart_time_value);
              ELSIF jsonb_typeof(v_daypart_time_value) = 'string' THEN
                v_time_str := trim(both '"' from v_daypart_time_value::text);
                IF v_time_str LIKE '%,%' THEN
                  v_times_for_daypart := string_to_array(v_time_str, ',');
                  SELECT array_agg(trim(both ' ' from unnest)) INTO v_times_for_daypart
                  FROM unnest(v_times_for_daypart);
                ELSE
                  v_times_for_daypart := ARRAY[v_time_str];
                END IF;
              END IF;
            END IF;
            
            IF v_times_for_daypart IS NULL OR array_length(v_times_for_daypart, 1) IS NULL THEN
              IF v_template.time_of_day IS NOT NULL THEN
                -- Check if time_of_day is a daypart name or actual time
                IF v_template.time_of_day IN ('before_open', 'during_service', 'after_service', 'anytime', 'morning', 'afternoon', 'evening') THEN
                  CASE v_template.time_of_day
                    WHEN 'before_open' THEN v_times_for_daypart := ARRAY['08:00'];
                    WHEN 'during_service' THEN v_times_for_daypart := ARRAY['12:00'];
                    WHEN 'after_service' THEN v_times_for_daypart := ARRAY['18:00'];
                    WHEN 'morning' THEN v_times_for_daypart := ARRAY['08:00'];
                    WHEN 'afternoon' THEN v_times_for_daypart := ARRAY['12:00'];
                    WHEN 'evening' THEN v_times_for_daypart := ARRAY['18:00'];
                    ELSE v_times_for_daypart := ARRAY['09:00']; -- anytime or unknown
                  END CASE;
                ELSE
                  v_times_for_daypart := ARRAY[v_template.time_of_day];
                END IF;
              ELSE
                v_times_for_daypart := ARRAY['09:00'];
              END IF;
            END IF;
            
            FOREACH v_time_str IN ARRAY v_times_for_daypart
            LOOP
              DECLARE
                v_combination TEXT;
              BEGIN
                -- Convert time string to TIME, handling daypart names
                IF v_time_str IN ('before_open', 'during_service', 'after_service', 'anytime', 'morning', 'afternoon', 'evening') THEN
                  CASE v_time_str
                    WHEN 'before_open' THEN v_final_time := '08:00'::TIME;
                    WHEN 'during_service' THEN v_final_time := '12:00'::TIME;
                    WHEN 'after_service' THEN v_final_time := '18:00'::TIME;
                    WHEN 'morning' THEN v_final_time := '08:00'::TIME;
                    WHEN 'afternoon' THEN v_final_time := '12:00'::TIME;
                    WHEN 'evening' THEN v_final_time := '18:00'::TIME;
                    ELSE v_final_time := '09:00'::TIME; -- anytime or unknown
                  END CASE;
                ELSE
                  BEGIN
                    v_final_time := v_time_str::TIME;
                  EXCEPTION WHEN OTHERS THEN
                    v_final_time := '09:00'::TIME;
                  END;
                END IF;
                
                v_combination := COALESCE(v_daypart, '') || '|' || COALESCE(v_final_time::text, '');
                
                IF v_existing_combinations IS NULL OR NOT (v_combination = ANY(v_existing_combinations)) THEN
                  INSERT INTO checklist_tasks (
                    template_id, company_id, site_id, due_date, due_time, daypart,
                    assigned_to_role, assigned_to_user_id, status, priority,
                    generated_at, expires_at, task_data
                  ) VALUES (
                    v_template.id, v_site.company_id, v_site.id, v_today, v_final_time, v_daypart,
                    v_template.assigned_to_role, v_template.assigned_to_user_id, 'pending',
                    CASE WHEN v_template.is_critical THEN 'critical' ELSE 'medium' END,
                    NOW(), v_today + INTERVAL '1 day',
                    jsonb_build_object(
                      'source', 'cron',
                      'dayparts', v_dayparts, 'daypart_times', v_daypart_times,
                      'daypart', v_daypart, 'time', v_final_time::text,
                      'checklistItems', COALESCE((v_template.recurrence_pattern->'default_checklist_items')::jsonb, '[]'::jsonb)
                    )
                  );
                  v_daily_count := v_daily_count + 1;
                END IF;
              END;
            END LOOP;
          END LOOP;
        END;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Daily template ' || v_template.id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  -- ===== WEEKLY TASKS =====
  FOR v_template IN 
    SELECT * FROM task_templates 
    WHERE frequency = 'weekly' 
      AND is_active = true
  LOOP
    BEGIN
      DECLARE
        v_pattern jsonb := v_template.recurrence_pattern;
        v_target_days int[];
      BEGIN
        IF v_pattern ? 'days' THEN
          v_target_days := ARRAY(SELECT jsonb_array_elements_text(v_pattern->'days')::int);
        ELSE
          v_target_days := ARRAY[1];
        END IF;
        
        IF NOT (v_day_of_week = ANY(v_target_days)) THEN
          CONTINUE;
        END IF;
        
        v_dayparts := v_template.dayparts;
        IF v_dayparts IS NULL OR array_length(v_dayparts, 1) IS NULL THEN
          v_dayparts := ARRAY['anytime'];
        END IF;
        
        FOR v_site IN 
          SELECT id, company_id FROM sites 
          WHERE (status IS NULL OR status != 'inactive')
            AND (v_template.site_id IS NULL OR id = v_template.site_id)
            AND (v_template.company_id IS NULL OR company_id = v_template.company_id)
        LOOP
          DECLARE
            v_existing_combinations TEXT[];
            v_daypart_times JSONB;
            v_times_for_daypart TEXT[];
            v_daypart_time_value JSONB;
            v_time_str TEXT;
          BEGIN
            IF v_pattern ? 'daypart_times' THEN
              v_daypart_times := v_pattern->'daypart_times';
            END IF;
            
            SELECT array_agg(DISTINCT COALESCE(daypart, '') || '|' || COALESCE(due_time::text, '')) 
            INTO v_existing_combinations
            FROM checklist_tasks
            WHERE template_id = v_template.id
              AND site_id = v_site.id
              AND due_date = v_today;
            
            FOREACH v_daypart IN ARRAY v_dayparts
            LOOP
              v_times_for_daypart := NULL;
              IF v_daypart_times IS NOT NULL AND v_daypart_times ? v_daypart THEN
                v_daypart_time_value := v_daypart_times->v_daypart;
                
                IF jsonb_typeof(v_daypart_time_value) = 'array' THEN
                  SELECT array_agg(value::text) INTO v_times_for_daypart
                  FROM jsonb_array_elements_text(v_daypart_time_value);
                ELSIF jsonb_typeof(v_daypart_time_value) = 'string' THEN
                  v_time_str := trim(both '"' from v_daypart_time_value::text);
                  IF v_time_str LIKE '%,%' THEN
                    v_times_for_daypart := string_to_array(v_time_str, ',');
                    SELECT array_agg(trim(both ' ' from unnest)) INTO v_times_for_daypart
                    FROM unnest(v_times_for_daypart);
                  ELSE
                    v_times_for_daypart := ARRAY[v_time_str];
                  END IF;
                END IF;
              END IF;
              
              IF v_times_for_daypart IS NULL OR array_length(v_times_for_daypart, 1) IS NULL THEN
                IF v_template.time_of_day IS NOT NULL THEN
                  IF v_template.time_of_day IN ('before_open', 'during_service', 'after_service', 'anytime', 'morning', 'afternoon', 'evening') THEN
                    CASE v_template.time_of_day
                      WHEN 'before_open' THEN v_times_for_daypart := ARRAY['08:00'];
                      WHEN 'during_service' THEN v_times_for_daypart := ARRAY['12:00'];
                      WHEN 'after_service' THEN v_times_for_daypart := ARRAY['18:00'];
                      WHEN 'morning' THEN v_times_for_daypart := ARRAY['08:00'];
                      WHEN 'afternoon' THEN v_times_for_daypart := ARRAY['12:00'];
                      WHEN 'evening' THEN v_times_for_daypart := ARRAY['18:00'];
                      ELSE v_times_for_daypart := ARRAY['09:00'];
                    END CASE;
                  ELSE
                    v_times_for_daypart := ARRAY[v_template.time_of_day];
                  END IF;
                ELSE
                  v_times_for_daypart := ARRAY['09:00'];
                END IF;
              END IF;
              
              FOREACH v_time_str IN ARRAY v_times_for_daypart
              LOOP
                DECLARE
                  v_combination TEXT;
                BEGIN
                  IF v_time_str IN ('before_open', 'during_service', 'after_service', 'anytime', 'morning', 'afternoon', 'evening') THEN
                    CASE v_time_str
                      WHEN 'before_open' THEN v_final_time := '08:00'::TIME;
                      WHEN 'during_service' THEN v_final_time := '12:00'::TIME;
                      WHEN 'after_service' THEN v_final_time := '18:00'::TIME;
                      WHEN 'morning' THEN v_final_time := '08:00'::TIME;
                      WHEN 'afternoon' THEN v_final_time := '12:00'::TIME;
                      WHEN 'evening' THEN v_final_time := '18:00'::TIME;
                      ELSE v_final_time := '09:00'::TIME;
                    END CASE;
                  ELSE
                    BEGIN
                      v_final_time := v_time_str::TIME;
                    EXCEPTION WHEN OTHERS THEN
                      v_final_time := '09:00'::TIME;
                    END;
                  END IF;
                  
                  v_combination := COALESCE(v_daypart, '') || '|' || COALESCE(v_final_time::text, '');
                  
                  IF v_existing_combinations IS NULL OR NOT (v_combination = ANY(v_existing_combinations)) THEN
                    INSERT INTO checklist_tasks (
                      template_id, company_id, site_id, due_date, due_time, daypart,
                      assigned_to_role, assigned_to_user_id, status, priority,
                      generated_at, expires_at, task_data
                    ) VALUES (
                      v_template.id, v_site.company_id, v_site.id, v_today, v_final_time, v_daypart,
                      v_template.assigned_to_role, v_template.assigned_to_user_id, 'pending',
                      CASE WHEN v_template.is_critical THEN 'critical' ELSE 'medium' END,
                      NOW(), v_today + INTERVAL '1 day',
                      jsonb_build_object(
                        'source', 'cron',
                        'dayparts', v_dayparts, 'daypart_times', v_daypart_times,
                        'daypart', v_daypart, 'time', v_final_time::text,
                        'checklistItems', COALESCE((v_template.recurrence_pattern->'default_checklist_items')::jsonb, '[]'::jsonb)
                      )
                    );
                    v_weekly_count := v_weekly_count + 1;
                  END IF;
                END;
              END LOOP;
            END LOOP;
          END;
        END LOOP;
      END;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Weekly template ' || v_template.id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  -- ===== MONTHLY TASKS =====
  FOR v_template IN 
    SELECT * FROM task_templates 
    WHERE frequency = 'monthly' 
      AND is_active = true
  LOOP
    BEGIN
      DECLARE
        v_pattern jsonb := v_template.recurrence_pattern;
        v_target_dates int[];
      BEGIN
        IF v_pattern ? 'dates' THEN
          v_target_dates := ARRAY(SELECT jsonb_array_elements_text(v_pattern->'dates')::int);
        ELSE
          v_target_dates := ARRAY[1];
        END IF;
        
        IF NOT (v_date_of_month = ANY(v_target_dates)) THEN
          CONTINUE;
        END IF;
        
        v_dayparts := v_template.dayparts;
        IF v_dayparts IS NULL OR array_length(v_dayparts, 1) IS NULL THEN
          v_dayparts := ARRAY['anytime'];
        END IF;
        
        FOR v_site IN 
          SELECT id, company_id FROM sites 
          WHERE (status IS NULL OR status != 'inactive')
            AND (v_template.site_id IS NULL OR id = v_template.site_id)
            AND (v_template.company_id IS NULL OR company_id = v_template.company_id)
        LOOP
          DECLARE
            v_existing_combinations TEXT[];
            v_daypart_times JSONB;
            v_times_for_daypart TEXT[];
            v_daypart_time_value JSONB;
            v_time_str TEXT;
          BEGIN
            IF v_pattern ? 'daypart_times' THEN
              v_daypart_times := v_pattern->'daypart_times';
            END IF;
            
            SELECT array_agg(DISTINCT COALESCE(daypart, '') || '|' || COALESCE(due_time::text, '')) 
            INTO v_existing_combinations
            FROM checklist_tasks
            WHERE template_id = v_template.id
              AND site_id = v_site.id
              AND due_date = v_today;
            
            FOREACH v_daypart IN ARRAY v_dayparts
            LOOP
              v_times_for_daypart := NULL;
              IF v_daypart_times IS NOT NULL AND v_daypart_times ? v_daypart THEN
                v_daypart_time_value := v_daypart_times->v_daypart;
                
                IF jsonb_typeof(v_daypart_time_value) = 'array' THEN
                  SELECT array_agg(value::text) INTO v_times_for_daypart
                  FROM jsonb_array_elements_text(v_daypart_time_value);
                ELSIF jsonb_typeof(v_daypart_time_value) = 'string' THEN
                  v_time_str := trim(both '"' from v_daypart_time_value::text);
                  IF v_time_str LIKE '%,%' THEN
                    v_times_for_daypart := string_to_array(v_time_str, ',');
                    SELECT array_agg(trim(both ' ' from unnest)) INTO v_times_for_daypart
                    FROM unnest(v_times_for_daypart);
                  ELSE
                    v_times_for_daypart := ARRAY[v_time_str];
                  END IF;
                END IF;
              END IF;
              
              IF v_times_for_daypart IS NULL OR array_length(v_times_for_daypart, 1) IS NULL THEN
                IF v_template.time_of_day IS NOT NULL THEN
                  IF v_template.time_of_day IN ('before_open', 'during_service', 'after_service', 'anytime', 'morning', 'afternoon', 'evening') THEN
                    CASE v_template.time_of_day
                      WHEN 'before_open' THEN v_times_for_daypart := ARRAY['08:00'];
                      WHEN 'during_service' THEN v_times_for_daypart := ARRAY['12:00'];
                      WHEN 'after_service' THEN v_times_for_daypart := ARRAY['18:00'];
                      WHEN 'morning' THEN v_times_for_daypart := ARRAY['08:00'];
                      WHEN 'afternoon' THEN v_times_for_daypart := ARRAY['12:00'];
                      WHEN 'evening' THEN v_times_for_daypart := ARRAY['18:00'];
                      ELSE v_times_for_daypart := ARRAY['09:00'];
                    END CASE;
                  ELSE
                    v_times_for_daypart := ARRAY[v_template.time_of_day];
                  END IF;
                ELSE
                  v_times_for_daypart := ARRAY['09:00'];
                END IF;
              END IF;
              
              FOREACH v_time_str IN ARRAY v_times_for_daypart
              LOOP
                DECLARE
                  v_combination TEXT;
                BEGIN
                  IF v_time_str IN ('before_open', 'during_service', 'after_service', 'anytime', 'morning', 'afternoon', 'evening') THEN
                    CASE v_time_str
                      WHEN 'before_open' THEN v_final_time := '08:00'::TIME;
                      WHEN 'during_service' THEN v_final_time := '12:00'::TIME;
                      WHEN 'after_service' THEN v_final_time := '18:00'::TIME;
                      WHEN 'morning' THEN v_final_time := '08:00'::TIME;
                      WHEN 'afternoon' THEN v_final_time := '12:00'::TIME;
                      WHEN 'evening' THEN v_final_time := '18:00'::TIME;
                      ELSE v_final_time := '09:00'::TIME;
                    END CASE;
                  ELSE
                    BEGIN
                      v_final_time := v_time_str::TIME;
                    EXCEPTION WHEN OTHERS THEN
                      v_final_time := '09:00'::TIME;
                    END;
                  END IF;
                  
                  v_combination := COALESCE(v_daypart, '') || '|' || COALESCE(v_final_time::text, '');
                  
                  IF v_existing_combinations IS NULL OR NOT (v_combination = ANY(v_existing_combinations)) THEN
                    INSERT INTO checklist_tasks (
                      template_id, company_id, site_id, due_date, due_time, daypart,
                      assigned_to_role, assigned_to_user_id, status, priority,
                      generated_at, expires_at, task_data
                    ) VALUES (
                      v_template.id, v_site.company_id, v_site.id, v_today, v_final_time, v_daypart,
                      v_template.assigned_to_role, v_template.assigned_to_user_id, 'pending',
                      CASE WHEN v_template.is_critical THEN 'critical' ELSE 'medium' END,
                      NOW(), v_today + INTERVAL '1 day',
                      jsonb_build_object(
                        'source', 'cron',
                        'dayparts', v_dayparts, 'daypart_times', v_daypart_times,
                        'daypart', v_daypart, 'time', v_final_time::text,
                        'checklistItems', COALESCE((v_template.recurrence_pattern->'default_checklist_items')::jsonb, '[]'::jsonb)
                      )
                    );
                    v_monthly_count := v_monthly_count + 1;
                  END IF;
                END;
              END LOOP;
            END LOOP;
          END;
        END LOOP;
      END;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Monthly template ' || v_template.id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  -- ===== PPM SERVICES SCANNING =====
  BEGIN
    FOR v_site IN 
      SELECT DISTINCT s.id, s.company_id 
      FROM sites s
      WHERE s.status IS NULL OR s.status != 'inactive'
    LOOP
      FOR v_template IN
        SELECT 
          ps.id as ppm_id,
          ps.asset_id,
          ps.next_service_date,
          ps.status,
          a.name as asset_name,
          a.site_id,
          s.company_id
        FROM ppm_schedule ps
        JOIN assets a ON ps.asset_id = a.id
        JOIN sites s ON a.site_id = s.id
        WHERE s.company_id = v_site.company_id
          AND ps.next_service_date IS NOT NULL
          AND ps.next_service_date <= v_today + (v_warning_days || ' days')::INTERVAL
          AND ps.next_service_date >= v_today
          AND ps.status != 'completed'
          AND NOT EXISTS (
            SELECT 1 FROM checklist_tasks ct
            WHERE ct.site_id = s.id
              AND ct.task_data->>'source' = 'cron'
              AND ct.task_data->>'type' = 'ppm_service'
              AND ct.task_data->>'ppm_id' = ps.id::text
              AND ct.due_date >= v_today
              AND ct.status != 'completed'
          )
      LOOP
        DECLARE
          days_until_due int;
          task_priority text;
          task_name text;
        BEGIN
          days_until_due := v_template.next_service_date - v_today;
          
          IF days_until_due <= 7 THEN
            task_priority := 'critical';
          ELSIF days_until_due <= 14 THEN
            task_priority := 'high';
          ELSE
            task_priority := 'medium';
          END IF;
          
          task_name := 'PPM Service Due: ' || v_template.asset_name;
          
          INSERT INTO checklist_tasks (
            template_id, company_id, site_id, due_date, due_time, daypart,
            status, priority, generated_at, expires_at, task_data
          ) VALUES (
            NULL, v_template.company_id, v_template.site_id, v_template.next_service_date,
            '09:00'::TIME, 'anytime', 'pending', task_priority,
            NOW(), v_template.next_service_date + INTERVAL '1 day',
            jsonb_build_object(
              'source', 'cron',
              'type', 'ppm_service',
              'ppm_id', v_template.ppm_id,
              'asset_id', v_template.asset_id,
              'asset_name', v_template.asset_name,
              'days_until_due', days_until_due,
              'message', 'PPM service for ' || v_template.asset_name || ' is due in ' || days_until_due || ' days.'
            )
          );
          
          v_ppm_count := v_ppm_count + 1;
        EXCEPTION WHEN OTHERS THEN
          v_errors := array_append(v_errors, 'PPM ' || v_template.ppm_id || ': ' || SQLERRM);
        END;
      END LOOP;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    v_errors := array_append(v_errors, 'PPM scanning: ' || SQLERRM);
  END;
  
  -- ===== CERTIFICATE EXPIRY SCANNING =====
  BEGIN
    DECLARE
      profile_record RECORD;
      one_month_from_now DATE;
    BEGIN
      one_month_from_now := v_today + INTERVAL '1 month';
      
      FOR profile_record IN
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
        FROM public.profiles p
        WHERE p.company_id IS NOT NULL
          AND (p.site_id IS NOT NULL OR p.home_site IS NOT NULL)
      LOOP
        -- Food Safety certificate
        IF profile_record.food_safety_level IS NOT NULL 
           AND profile_record.food_safety_expiry_date IS NOT NULL
           AND profile_record.food_safety_expiry_date <= one_month_from_now
           AND profile_record.food_safety_expiry_date > v_today
           AND NOT EXISTS (
             SELECT 1 FROM checklist_tasks ct
             WHERE ct.company_id = profile_record.company_id
               AND ct.task_data->>'source' = 'cron'
               AND ct.task_data->>'type' = 'certificate_expiry'
               AND ct.task_data->>'certificate_type' = 'food_safety'
               AND ct.task_data->>'profile_id' = profile_record.profile_id
               AND ct.due_date >= v_today
               AND ct.status != 'completed'
           ) THEN
          INSERT INTO checklist_tasks (
            template_id, company_id, site_id, due_date, due_time, daypart,
            status, priority, generated_at, expires_at, task_data
          ) VALUES (
            NULL, profile_record.company_id, profile_record.site_id,
            profile_record.food_safety_expiry_date - INTERVAL '1 month',
            '09:00'::TIME, 'anytime', 'pending', 'high',
            NOW(), profile_record.food_safety_expiry_date,
            jsonb_build_object(
              'source', 'cron',
              'type', 'certificate_expiry',
              'certificate_type', 'food_safety',
              'certificate_level', profile_record.food_safety_level,
              'profile_id', profile_record.profile_id,
              'profile_name', profile_record.full_name,
              'expiry_date', profile_record.food_safety_expiry_date,
              'message', 'Food Safety Level ' || profile_record.food_safety_level || ' certificate for ' || COALESCE(profile_record.full_name, 'staff member') || ' expires on ' || TO_CHAR(profile_record.food_safety_expiry_date, 'DD/MM/YYYY')
            )
          );
          v_certificate_count := v_certificate_count + 1;
        END IF;
        
        -- H&S certificate
        IF profile_record.h_and_s_level IS NOT NULL 
           AND profile_record.h_and_s_expiry_date IS NOT NULL
           AND profile_record.h_and_s_expiry_date <= one_month_from_now
           AND profile_record.h_and_s_expiry_date > v_today
           AND NOT EXISTS (
             SELECT 1 FROM checklist_tasks ct
             WHERE ct.company_id = profile_record.company_id
               AND ct.task_data->>'source' = 'cron'
               AND ct.task_data->>'type' = 'certificate_expiry'
               AND ct.task_data->>'certificate_type' = 'h_and_s'
               AND ct.task_data->>'profile_id' = profile_record.profile_id
               AND ct.due_date >= v_today
               AND ct.status != 'completed'
           ) THEN
          INSERT INTO checklist_tasks (
            template_id, company_id, site_id, due_date, due_time, daypart,
            status, priority, generated_at, expires_at, task_data
          ) VALUES (
            NULL, profile_record.company_id, profile_record.site_id,
            profile_record.h_and_s_expiry_date - INTERVAL '1 month',
            '09:00'::TIME, 'anytime', 'pending', 'high',
            NOW(), profile_record.h_and_s_expiry_date,
            jsonb_build_object(
              'source', 'cron',
              'type', 'certificate_expiry',
              'certificate_type', 'h_and_s',
              'certificate_level', profile_record.h_and_s_level,
              'profile_id', profile_record.profile_id,
              'profile_name', profile_record.full_name,
              'expiry_date', profile_record.h_and_s_expiry_date,
              'message', 'Health & Safety Level ' || profile_record.h_and_s_level || ' certificate for ' || COALESCE(profile_record.full_name, 'staff member') || ' expires on ' || TO_CHAR(profile_record.h_and_s_expiry_date, 'DD/MM/YYYY')
            )
          );
          v_certificate_count := v_certificate_count + 1;
        END IF;
        
        -- Fire Marshal certificate
        IF profile_record.fire_marshal_expiry_date IS NOT NULL
           AND profile_record.fire_marshal_expiry_date <= one_month_from_now
           AND profile_record.fire_marshal_expiry_date > v_today
           AND NOT EXISTS (
             SELECT 1 FROM checklist_tasks ct
             WHERE ct.company_id = profile_record.company_id
               AND ct.task_data->>'source' = 'cron'
               AND ct.task_data->>'type' = 'certificate_expiry'
               AND ct.task_data->>'certificate_type' = 'fire_marshal'
               AND ct.task_data->>'profile_id' = profile_record.profile_id
               AND ct.due_date >= v_today
               AND ct.status != 'completed'
           ) THEN
          INSERT INTO checklist_tasks (
            template_id, company_id, site_id, due_date, due_time, daypart,
            status, priority, generated_at, expires_at, task_data
          ) VALUES (
            NULL, profile_record.company_id, profile_record.site_id,
            profile_record.fire_marshal_expiry_date - INTERVAL '1 month',
            '09:00'::TIME, 'anytime', 'pending', 'high',
            NOW(), profile_record.fire_marshal_expiry_date,
            jsonb_build_object(
              'source', 'cron',
              'type', 'certificate_expiry',
              'certificate_type', 'fire_marshal',
              'profile_id', profile_record.profile_id,
              'profile_name', profile_record.full_name,
              'expiry_date', profile_record.fire_marshal_expiry_date,
              'message', 'Fire Marshal training for ' || COALESCE(profile_record.full_name, 'staff member') || ' expires on ' || TO_CHAR(profile_record.fire_marshal_expiry_date, 'DD/MM/YYYY')
            )
          );
          v_certificate_count := v_certificate_count + 1;
        END IF;
        
        -- First Aid certificate
        IF profile_record.first_aid_expiry_date IS NOT NULL
           AND profile_record.first_aid_expiry_date <= one_month_from_now
           AND profile_record.first_aid_expiry_date > v_today
           AND NOT EXISTS (
             SELECT 1 FROM checklist_tasks ct
             WHERE ct.company_id = profile_record.company_id
               AND ct.task_data->>'source' = 'cron'
               AND ct.task_data->>'type' = 'certificate_expiry'
               AND ct.task_data->>'certificate_type' = 'first_aid'
               AND ct.task_data->>'profile_id' = profile_record.profile_id
               AND ct.due_date >= v_today
               AND ct.status != 'completed'
           ) THEN
          INSERT INTO checklist_tasks (
            template_id, company_id, site_id, due_date, due_time, daypart,
            status, priority, generated_at, expires_at, task_data
          ) VALUES (
            NULL, profile_record.company_id, profile_record.site_id,
            profile_record.first_aid_expiry_date - INTERVAL '1 month',
            '09:00'::TIME, 'anytime', 'pending', 'high',
            NOW(), profile_record.first_aid_expiry_date,
            jsonb_build_object(
              'source', 'cron',
              'type', 'certificate_expiry',
              'certificate_type', 'first_aid',
              'profile_id', profile_record.profile_id,
              'profile_name', profile_record.full_name,
              'expiry_date', profile_record.first_aid_expiry_date,
              'message', 'First Aid training for ' || COALESCE(profile_record.full_name, 'staff member') || ' expires on ' || TO_CHAR(profile_record.first_aid_expiry_date, 'DD/MM/YYYY')
            )
          );
          v_certificate_count := v_certificate_count + 1;
        END IF;
        
        -- COSSH certificate
        IF profile_record.cossh_expiry_date IS NOT NULL
           AND profile_record.cossh_expiry_date <= one_month_from_now
           AND profile_record.cossh_expiry_date > v_today
           AND NOT EXISTS (
             SELECT 1 FROM checklist_tasks ct
             WHERE ct.company_id = profile_record.company_id
               AND ct.task_data->>'source' = 'cron'
               AND ct.task_data->>'type' = 'certificate_expiry'
               AND ct.task_data->>'certificate_type' = 'cossh'
               AND ct.task_data->>'profile_id' = profile_record.profile_id
               AND ct.due_date >= v_today
               AND ct.status != 'completed'
           ) THEN
          INSERT INTO checklist_tasks (
            template_id, company_id, site_id, due_date, due_time, daypart,
            status, priority, generated_at, expires_at, task_data
          ) VALUES (
            NULL, profile_record.company_id, profile_record.site_id,
            profile_record.cossh_expiry_date - INTERVAL '1 month',
            '09:00'::TIME, 'anytime', 'pending', 'high',
            NOW(), profile_record.cossh_expiry_date,
            jsonb_build_object(
              'source', 'cron',
              'type', 'certificate_expiry',
              'certificate_type', 'cossh',
              'profile_id', profile_record.profile_id,
              'profile_name', profile_record.full_name,
              'expiry_date', profile_record.cossh_expiry_date,
              'message', 'COSSH training for ' || COALESCE(profile_record.full_name, 'staff member') || ' expires on ' || TO_CHAR(profile_record.cossh_expiry_date, 'DD/MM/YYYY')
            )
          );
          v_certificate_count := v_certificate_count + 1;
        END IF;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Certificate scanning: ' || SQLERRM);
    END;
  END;
  
  -- ===== SOP REVIEW SCANNING =====
  -- SOPs should be reviewed annually (1 year from last update or creation)
  BEGIN
    FOR v_site IN 
      SELECT DISTINCT s.id, s.company_id 
      FROM sites s
      WHERE s.status IS NULL OR s.status != 'inactive'
    LOOP
      FOR v_template IN
        SELECT 
          sop.id,
          sop.title,
          sop.ref_code,
          sop.company_id,
          sop.updated_at,
          sop.created_at,
          (COALESCE(sop.updated_at, sop.created_at) + INTERVAL '1 year')::DATE as review_due_date
        FROM sop_entries sop
        WHERE sop.company_id = v_site.company_id
          AND sop.status = 'Published'
          AND (COALESCE(sop.updated_at, sop.created_at) + INTERVAL '1 year')::DATE <= v_today + (v_warning_days || ' days')::INTERVAL
          AND (COALESCE(sop.updated_at, sop.created_at) + INTERVAL '1 year')::DATE >= v_today
          AND NOT EXISTS (
            SELECT 1 FROM checklist_tasks ct
            WHERE ct.company_id = sop.company_id
              AND ct.task_data->>'source' = 'cron'
              AND ct.task_data->>'type' = 'sop_review'
              AND ct.task_data->>'sop_id' = sop.id::text
              AND ct.due_date >= v_today
              AND ct.status != 'completed'
          )
      LOOP
        DECLARE
          days_until_review int;
          task_priority text;
        BEGIN
          days_until_review := v_template.review_due_date - v_today;
          
          IF days_until_review <= 7 THEN
            task_priority := 'critical';
          ELSIF days_until_review <= 14 THEN
            task_priority := 'high';
          ELSE
            task_priority := 'medium';
          END IF;
          
          INSERT INTO checklist_tasks (
            template_id, company_id, site_id, due_date, due_time, daypart,
            status, priority, generated_at, expires_at, task_data
          ) VALUES (
            NULL, v_template.company_id, NULL,
            v_template.review_due_date, '09:00'::TIME, 'anytime',
            'pending', task_priority,
            NOW(), v_template.review_due_date + INTERVAL '1 day',
            jsonb_build_object(
              'source', 'cron',
              'type', 'sop_review',
              'sop_id', v_template.id,
              'sop_title', v_template.title,
              'sop_ref_code', v_template.ref_code,
              'days_until_review', days_until_review,
              'message', 'SOP "' || v_template.title || '" (' || v_template.ref_code || ') is due for annual review in ' || days_until_review || ' days.'
            )
          );
          
          v_sop_review_count := v_sop_review_count + 1;
        EXCEPTION WHEN OTHERS THEN
          v_errors := array_append(v_errors, 'SOP review ' || v_template.id || ': ' || SQLERRM);
        END;
      END LOOP;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    v_errors := array_append(v_errors, 'SOP review scanning: ' || SQLERRM);
  END;
  
  -- ===== RISK ASSESSMENT REVIEW SCANNING =====
  BEGIN
    FOR v_site IN 
      SELECT DISTINCT s.id, s.company_id 
      FROM sites s
      WHERE s.status IS NULL OR s.status != 'inactive'
    LOOP
      FOR v_template IN
        SELECT 
          ra.id,
          ra.title,
          ra.ref_code,
          ra.company_id,
          ra.site_id,
          ra.next_review_date,
          ra.template_type
        FROM risk_assessments ra
        WHERE ra.company_id = v_site.company_id
          AND ra.status = 'Published'
          AND ra.next_review_date IS NOT NULL
          AND ra.next_review_date <= v_today + (v_warning_days || ' days')::INTERVAL
          AND ra.next_review_date >= v_today
          AND NOT EXISTS (
            SELECT 1 FROM checklist_tasks ct
            WHERE ct.company_id = ra.company_id
              AND ct.task_data->>'source' = 'cron'
              AND ct.task_data->>'type' = 'ra_review'
              AND ct.task_data->>'ra_id' = ra.id::text
              AND ct.due_date >= v_today
              AND ct.status != 'completed'
          )
      LOOP
        DECLARE
          days_until_review int;
          task_priority text;
        BEGIN
          days_until_review := v_template.next_review_date - v_today;
          
          IF days_until_review <= 7 THEN
            task_priority := 'critical';
          ELSIF days_until_review <= 14 THEN
            task_priority := 'high';
          ELSE
            task_priority := 'medium';
          END IF;
          
          INSERT INTO checklist_tasks (
            template_id, company_id, site_id, due_date, due_time, daypart,
            status, priority, generated_at, expires_at, task_data
          ) VALUES (
            NULL, v_template.company_id, v_template.site_id,
            v_template.next_review_date, '09:00'::TIME, 'anytime',
            'pending', task_priority,
            NOW(), v_template.next_review_date + INTERVAL '1 day',
            jsonb_build_object(
              'source', 'cron',
              'type', 'ra_review',
              'ra_id', v_template.id,
              'ra_title', v_template.title,
              'ra_ref_code', v_template.ref_code,
              'ra_type', v_template.template_type,
              'days_until_review', days_until_review,
              'message', 'Risk Assessment "' || v_template.title || '" (' || v_template.ref_code || ') is due for review in ' || days_until_review || ' days.'
            )
          );
          
          v_ra_review_count := v_ra_review_count + 1;
        EXCEPTION WHEN OTHERS THEN
          v_errors := array_append(v_errors, 'RA review ' || v_template.id || ': ' || SQLERRM);
        END;
      END LOOP;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    v_errors := array_append(v_errors, 'RA review scanning: ' || SQLERRM);
  END;
  
  -- Add compliance task counts to errors array for logging (backward compatible)
  IF v_ppm_count > 0 OR v_certificate_count > 0 OR v_sop_review_count > 0 OR v_ra_review_count > 0 THEN
    v_errors := array_append(v_errors, 
      'Compliance tasks created: PPM=' || v_ppm_count || 
      ', Certificates=' || v_certificate_count || 
      ', SOP Reviews=' || v_sop_review_count || 
      ', RA Reviews=' || v_ra_review_count
    );
  END IF;
  
  RETURN QUERY SELECT v_daily_count, v_weekly_count, v_monthly_count, v_errors;
END;
$$;

COMMENT ON FUNCTION generate_daily_tasks_direct() IS 
'Automatically generates daily, weekly, and monthly tasks for all active templates and sites.
Also scans for upcoming PPM services (30 days), certificate expiry (1 month warning), 
SOP reviews (annual), and RA reviews (based on next_review_date).
Runs via pg_cron every day at 3:00 AM UTC. All tasks are marked with source=''cron'' in task_data
so they can be filtered out from Active Tasks page (which should only show manually created tasks).';
