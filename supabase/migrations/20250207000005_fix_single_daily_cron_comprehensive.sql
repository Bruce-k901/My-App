-- Migration: Fix Single Daily Cron to Comprehensively Find All Tasks
-- Description: Ensures the cron runs ONCE daily and finds ALL daily, weekly, and monthly tasks
-- Makes the query more robust to catch all templates regardless of case/whitespace

-- Drop the afternoon cron job (we only want one run per day)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-afternoon') THEN
    PERFORM cron.unschedule('generate-daily-tasks-afternoon');
    RAISE NOTICE 'Removed afternoon cron job: generate-daily-tasks-afternoon';
  END IF;
END $$;

-- Drop the daily-only function (we don't need it anymore)
DROP FUNCTION IF EXISTS generate_daily_tasks_only();

-- Update the main function to ensure it comprehensively finds ALL daily tasks
-- Key fix: Use LOWER(TRIM()) to handle case/whitespace variations
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
  v_errors text[] := '{}';
  v_today date;
  v_day_of_week int;
  v_date_of_month int;
  v_template record;
  v_site record;
  v_dayparts text[];
  v_daypart text;
BEGIN
  v_today := CURRENT_DATE;
  v_day_of_week := EXTRACT(DOW FROM CURRENT_DATE); -- 0 = Sunday, 1 = Monday, etc
  v_date_of_month := EXTRACT(DAY FROM CURRENT_DATE);
  
  -- ===== DAILY TASKS =====
  -- Comprehensive query: Find ALL active daily templates
  -- Use LOWER(TRIM()) to handle any case/whitespace variations
  -- Also check for NULL is_active (treat as active if NULL)
  FOR v_template IN 
    SELECT * FROM task_templates 
    WHERE LOWER(TRIM(COALESCE(frequency, ''))) = 'daily'
      AND (is_active = true OR is_active IS NULL)
  LOOP
    BEGIN
      -- Get dayparts from template
      v_dayparts := v_template.dayparts;
      IF v_dayparts IS NULL OR array_length(v_dayparts, 1) IS NULL THEN
        v_dayparts := ARRAY['before_open'];
      END IF;
      
      -- Get daypart-specific times from recurrence_pattern.daypart_times if available
      DECLARE
        v_pattern JSONB := v_template.recurrence_pattern;
        v_daypart_times JSONB;
      BEGIN
        -- Extract daypart_times from recurrence_pattern
        IF v_pattern IS NOT NULL AND v_pattern ? 'daypart_times' THEN
          v_daypart_times := v_pattern->'daypart_times';
        END IF;
        
        -- Get all active sites that match this template's scope
        FOR v_site IN 
          SELECT id, company_id FROM sites 
          WHERE (status IS NULL OR status != 'inactive')
            AND (v_template.site_id IS NULL OR id = v_template.site_id)
            AND (v_template.company_id IS NULL OR company_id = v_template.company_id)
        LOOP
          -- Check existing tasks for this template/site/date
          DECLARE
            v_existing_combinations TEXT[];
          BEGIN
            SELECT array_agg(DISTINCT COALESCE(daypart, '') || '|' || COALESCE(due_time::text, '')) 
            INTO v_existing_combinations
            FROM checklist_tasks
            WHERE template_id = v_template.id
              AND site_id = v_site.id
              AND due_date = v_today;
            
            -- Create tasks for each daypart with its specific times
            FOREACH v_daypart IN ARRAY v_dayparts
            LOOP
              DECLARE
                v_times_for_daypart TEXT[];
                v_daypart_time_value JSONB;
                v_time_str TEXT;
              BEGIN
                -- Get times for this specific daypart
                IF v_daypart_times IS NOT NULL AND v_daypart_times ? v_daypart THEN
                  v_daypart_time_value := v_daypart_times->v_daypart;
                  
                  -- Handle different formats: string (single or comma-separated) or array
                  IF jsonb_typeof(v_daypart_time_value) = 'array' THEN
                    SELECT array_agg(value::text) INTO v_times_for_daypart
                    FROM jsonb_array_elements_text(v_daypart_time_value);
                  ELSIF jsonb_typeof(v_daypart_time_value) = 'string' THEN
                    v_time_str := v_daypart_time_value::text;
                    v_time_str := trim(both '"' from v_time_str);
                    IF v_time_str LIKE '%,%' THEN
                      v_times_for_daypart := string_to_array(v_time_str, ',');
                      SELECT array_agg(trim(both ' ' from unnest)) INTO v_times_for_daypart
                      FROM unnest(v_times_for_daypart);
                    ELSE
                      v_times_for_daypart := ARRAY[v_time_str];
                    END IF;
                  END IF;
                END IF;
                
                -- If no daypart-specific times, fall back to time_of_day or default
                IF v_times_for_daypart IS NULL OR array_length(v_times_for_daypart, 1) IS NULL THEN
                  IF v_template.time_of_day IS NOT NULL THEN
                    v_times_for_daypart := ARRAY[v_template.time_of_day];
                  ELSE
                    v_times_for_daypart := ARRAY['09:00'];
                  END IF;
                END IF;
                
                -- Create one task for each time for this daypart
                FOREACH v_time_str IN ARRAY v_times_for_daypart
                LOOP
                  DECLARE
                    v_combination TEXT := COALESCE(v_daypart, '') || '|' || COALESCE(v_time_str, '');
                  BEGIN
                    -- Check if this combination already exists
                    IF v_existing_combinations IS NULL OR NOT (v_combination = ANY(v_existing_combinations)) THEN
                      INSERT INTO checklist_tasks (
                        template_id,
                        company_id,
                        site_id,
                        due_date,
                        due_time,
                        daypart,
                        assigned_to_role,
                        assigned_to_user_id,
                        status,
                        priority,
                        generated_at,
                        expires_at,
                        task_data
                      ) VALUES (
                        v_template.id,
                        v_site.company_id,
                        v_site.id,
                        v_today,
                        v_time_str::TIME,
                        v_daypart,
                        v_template.assigned_to_role,
                        v_template.assigned_to_user_id,
                        'pending',
                        CASE WHEN v_template.is_critical THEN 'critical' ELSE 'medium' END,
                        NOW(),
                        v_today + INTERVAL '1 day',
                        jsonb_build_object(
                          'dayparts', v_dayparts,
                          'daypart_times', v_daypart_times,
                          'daypart', v_daypart,
                          'time', v_time_str,
                          'checklistItems', COALESCE((v_template.recurrence_pattern->'default_checklist_items')::jsonb, '[]'::jsonb)
                        )
                      );
                      v_daily_count := v_daily_count + 1;
                    END IF;
                  END;
                END LOOP;
              END;
            END LOOP;
          END;
        END LOOP;
      END;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Daily template ' || COALESCE(v_template.id::text, 'unknown') || ': ' || SQLERRM);
    END;
  END LOOP;
  
  -- ===== WEEKLY TASKS =====
  FOR v_template IN 
    SELECT * FROM task_templates 
    WHERE LOWER(TRIM(COALESCE(frequency, ''))) = 'weekly'
      AND (is_active = true OR is_active IS NULL)
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
                  v_times_for_daypart := ARRAY[v_template.time_of_day];
                ELSE
                  v_times_for_daypart := ARRAY['09:00'];
                END IF;
              END IF;
              
              FOREACH v_time_str IN ARRAY v_times_for_daypart
              LOOP
                DECLARE
                  v_combination TEXT := COALESCE(v_daypart, '') || '|' || COALESCE(v_time_str, '');
                BEGIN
                  IF v_existing_combinations IS NULL OR NOT (v_combination = ANY(v_existing_combinations)) THEN
                    INSERT INTO checklist_tasks (
                      template_id, company_id, site_id, due_date, due_time, daypart,
                      assigned_to_role, assigned_to_user_id, status, priority,
                      generated_at, expires_at, task_data
                    ) VALUES (
                      v_template.id, v_site.company_id, v_site.id, v_today,
                      v_time_str::TIME, v_daypart, v_template.assigned_to_role,
                      v_template.assigned_to_user_id, 'pending',
                      CASE WHEN v_template.is_critical THEN 'critical' ELSE 'medium' END,
                      NOW(), v_today + INTERVAL '7 days',
                      jsonb_build_object(
                        'dayparts', v_dayparts, 'daypart_times', v_daypart_times,
                        'daypart', v_daypart, 'time', v_time_str,
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
      v_errors := array_append(v_errors, 'Weekly template ' || COALESCE(v_template.id::text, 'unknown') || ': ' || SQLERRM);
    END;
  END LOOP;
  
  -- ===== MONTHLY TASKS =====
  FOR v_template IN 
    SELECT * FROM task_templates 
    WHERE LOWER(TRIM(COALESCE(frequency, ''))) = 'monthly'
      AND (is_active = true OR is_active IS NULL)
  LOOP
    BEGIN
      DECLARE
        v_pattern jsonb := v_template.recurrence_pattern;
        v_target_date int;
      BEGIN
        IF v_pattern ? 'date_of_month' THEN
          v_target_date := (v_pattern->>'date_of_month')::int;
        ELSE
          v_target_date := 1;
        END IF;
        
        IF v_date_of_month != v_target_date THEN
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
                  v_times_for_daypart := ARRAY[v_template.time_of_day];
                ELSE
                  v_times_for_daypart := ARRAY['09:00'];
                END IF;
              END IF;
              
              FOREACH v_time_str IN ARRAY v_times_for_daypart
              LOOP
                DECLARE
                  v_combination TEXT := COALESCE(v_daypart, '') || '|' || COALESCE(v_time_str, '');
                BEGIN
                  IF v_existing_combinations IS NULL OR NOT (v_combination = ANY(v_existing_combinations)) THEN
                    INSERT INTO checklist_tasks (
                      template_id, company_id, site_id, due_date, due_time, daypart,
                      assigned_to_role, assigned_to_user_id, status, priority,
                      generated_at, expires_at, task_data
                    ) VALUES (
                      v_template.id, v_site.company_id, v_site.id, v_today,
                      v_time_str::TIME, v_daypart, v_template.assigned_to_role,
                      v_template.assigned_to_user_id, 'pending',
                      CASE WHEN v_template.is_critical THEN 'critical' ELSE 'medium' END,
                      NOW(), v_today + INTERVAL '30 days',
                      jsonb_build_object(
                        'dayparts', v_dayparts, 'daypart_times', v_daypart_times,
                        'daypart', v_daypart, 'time', v_time_str,
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
      v_errors := array_append(v_errors, 'Monthly template ' || COALESCE(v_template.id::text, 'unknown') || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_daily_count, v_weekly_count, v_monthly_count, v_errors;
END;
$$;

-- Update cron schedule to run ONCE daily at 5:25 AM UTC (6:25 AM BST - testing time)
-- This is early enough to catch all businesses regardless of timezone
-- Single comprehensive run that finds ALL tasks

-- Unschedule existing cron if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') THEN
    PERFORM cron.unschedule('generate-daily-tasks-cron');
    RAISE NOTICE 'Removed existing cron job';
  END IF;
END $$;

-- Schedule new cron for single daily run
SELECT cron.schedule(
  'generate-daily-tasks-cron',
  '25 5 * * *', -- 5:25 AM UTC = 6:25 AM BST every day - SINGLE comprehensive run (testing time)
  $$SELECT generate_daily_tasks_direct()$$
);

-- Verify the cron job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') THEN
    RAISE NOTICE '✅ Cron job verified successfully';
  ELSE
    RAISE WARNING '⚠️ Cron job creation may have failed';
  END IF;
END $$;

-- Add comment
COMMENT ON FUNCTION generate_daily_tasks_direct() IS 
'Single comprehensive task generation function that runs once daily at 5:25 AM UTC (6:25 AM BST - testing time).
Finds and generates ALL daily, weekly, and monthly tasks for all active templates and sites.
Uses LOWER(TRIM()) on frequency field to ensure all templates are found regardless of case/whitespace.
Designed to work for businesses with different operating times and timezones.';
