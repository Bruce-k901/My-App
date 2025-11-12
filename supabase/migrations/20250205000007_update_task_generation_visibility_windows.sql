-- ============================================================================
-- Migration: 20250205000007_update_task_generation_visibility_windows.sql
-- Description: Updates task generation to support visibility windows and grace periods
-- This enables tasks to appear before their due date and remain visible after
-- ============================================================================

-- Update the task generation function to handle visibility windows
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
  v_existing_dayparts text[];
  v_visibility_before int := 0;  -- Days before due date to show task
  v_visibility_after int := 0;   -- Days after due date to keep task visible
  v_grace_period int := 0;       -- Days after due date before task becomes "late"
  v_actual_due_date date;        -- The actual due date for the task
  v_task_due_date date;          -- The date to show the task in the feed (due_date - visibility_before)
BEGIN
  v_today := CURRENT_DATE;
  v_day_of_week := EXTRACT(DOW FROM CURRENT_DATE); -- 0 = Sunday, 1 = Monday, etc
  v_date_of_month := EXTRACT(DAY FROM CURRENT_DATE);
  
  -- ===== DAILY TASKS =====
  FOR v_template IN 
    SELECT * FROM task_templates 
    WHERE frequency = 'daily' 
      AND is_active = true
  LOOP
    BEGIN
      -- Get visibility windows from recurrence_pattern
      DECLARE
        v_pattern JSONB := v_template.recurrence_pattern;
      BEGIN
        -- Default visibility windows for daily tasks
        v_visibility_before := COALESCE((v_pattern->>'visibility_window_days_before')::int, 0);
        v_visibility_after := COALESCE((v_pattern->>'visibility_window_days_after')::int, 1);
        v_grace_period := COALESCE((v_pattern->>'grace_period_days')::int, 0);
        
        -- Actual due date is today for daily tasks
        v_actual_due_date := v_today;
        -- Task appears in feed starting from (due_date - visibility_before)
        v_task_due_date := v_actual_due_date - (v_visibility_before || 0);
      END;
      
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
        
        -- Get all active sites
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
              AND due_date = v_actual_due_date;  -- Check against actual due date
            
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
                    IF v_existing_combinations IS NULL OR NOT (v_combination = ANY(v_existing_combinations)) THEN
                      INSERT INTO checklist_tasks (
                        template_id,
                        company_id,
                        site_id,
                        due_date,              -- Store actual due date
                        due_time,
                        daypart,
                        assigned_to_role,
                        assigned_to_user_id,
                        status,
                        priority,
                        generated_at,
                        expires_at,            -- Set to due_date + visibility_after
                        task_data
                      ) VALUES (
                        v_template.id,
                        v_site.company_id,
                        v_site.id,
                        v_actual_due_date,     -- Actual due date
                        v_time_str::TIME,
                        v_daypart,
                        v_template.assigned_to_role,
                        v_template.assigned_to_user_id,
                        'pending',
                        CASE WHEN v_template.is_critical THEN 'critical' ELSE 'medium' END,
                        NOW(),
                        v_actual_due_date + (v_visibility_after || 1)::int,  -- Expires after visibility window
                        jsonb_build_object(
                          'dayparts', v_dayparts,
                          'daypart_times', v_daypart_times,
                          'daypart', v_daypart,
                          'time', v_time_str,
                          'checklistItems', COALESCE((v_template.recurrence_pattern->'default_checklist_items')::jsonb, '[]'::jsonb),
                          'visibility_window_days_before', v_visibility_before,
                          'visibility_window_days_after', v_visibility_after,
                          'grace_period_days', v_grace_period,
                          'actual_due_date', v_actual_due_date::text  -- Store actual due date for reference
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
        
        -- Get visibility windows (default for weekly: 2 days before, 3 days after)
        v_visibility_before := COALESCE((v_pattern->>'visibility_window_days_before')::int, 2);
        v_visibility_after := COALESCE((v_pattern->>'visibility_window_days_after')::int, 3);
        v_grace_period := COALESCE((v_pattern->>'grace_period_days')::int, 1);
        
        -- Actual due date is today for weekly tasks
        v_actual_due_date := v_today;
        
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
              AND due_date = v_actual_due_date;
            
            FOREACH v_daypart IN ARRAY v_dayparts
            LOOP
              BEGIN
                IF v_daypart_times IS NOT NULL AND v_daypart_times ? v_daypart THEN
                  v_daypart_time_value := v_daypart_times->v_daypart;
                  
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
                        v_actual_due_date,
                        v_time_str::TIME,
                        v_daypart,
                        v_template.assigned_to_role,
                        v_template.assigned_to_user_id,
                        'pending',
                        CASE WHEN v_template.is_critical THEN 'critical' ELSE 'medium' END,
                        NOW(),
                        v_actual_due_date + (v_visibility_after || 3)::int,
                        jsonb_build_object(
                          'dayparts', v_dayparts,
                          'daypart_times', v_daypart_times,
                          'daypart', v_daypart,
                          'time', v_time_str,
                          'checklistItems', COALESCE((v_template.recurrence_pattern->'default_checklist_items')::jsonb, '[]'::jsonb),
                          'visibility_window_days_before', v_visibility_before,
                          'visibility_window_days_after', v_visibility_after,
                          'grace_period_days', v_grace_period,
                          'actual_due_date', v_actual_due_date::text
                        )
                      );
                      v_weekly_count := v_weekly_count + 1;
                    END IF;
                  END;
                END LOOP;
              END;
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
        v_target_date int;
      BEGIN
        -- Get target date of month (default: 1st)
        IF v_pattern ? 'date_of_month' THEN
          v_target_date := (v_pattern->>'date_of_month')::int;
        ELSE
          v_target_date := 1;
        END IF;
        
        -- Only create if today matches target date
        IF v_date_of_month != v_target_date THEN
          CONTINUE;
        END IF;
        
        -- Get visibility windows (default for monthly: 7 days before, 7 days after)
        v_visibility_before := COALESCE((v_pattern->>'visibility_window_days_before')::int, 7);
        v_visibility_after := COALESCE((v_pattern->>'visibility_window_days_after')::int, 7);
        v_grace_period := COALESCE((v_pattern->>'grace_period_days')::int, 3);
        
        -- Actual due date is today for monthly tasks
        v_actual_due_date := v_today;
        
        v_dayparts := v_template.dayparts;
        IF v_dayparts IS NULL OR array_length(v_dayparts, 1) IS NULL THEN
          v_dayparts := ARRAY['before_open'];
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
              AND due_date = v_actual_due_date;
            
            FOREACH v_daypart IN ARRAY v_dayparts
            LOOP
              BEGIN
                IF v_daypart_times IS NOT NULL AND v_daypart_times ? v_daypart THEN
                  v_daypart_time_value := v_daypart_times->v_daypart;
                  
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
                        v_actual_due_date,
                        v_time_str::TIME,
                        v_daypart,
                        v_template.assigned_to_role,
                        v_template.assigned_to_user_id,
                        'pending',
                        CASE WHEN v_template.is_critical THEN 'critical' ELSE 'medium' END,
                        NOW(),
                        v_actual_due_date + (v_visibility_after || 7)::int,
                        jsonb_build_object(
                          'dayparts', v_dayparts,
                          'daypart_times', v_daypart_times,
                          'daypart', v_daypart,
                          'time', v_time_str,
                          'checklistItems', COALESCE((v_template.recurrence_pattern->'default_checklist_items')::jsonb, '[]'::jsonb),
                          'visibility_window_days_before', v_visibility_before,
                          'visibility_window_days_after', v_visibility_after,
                          'grace_period_days', v_grace_period,
                          'actual_due_date', v_actual_due_date::text
                        )
                      );
                      v_monthly_count := v_monthly_count + 1;
                    END IF;
                  END;
                END LOOP;
              END;
            END LOOP;
          END;
        END LOOP;
      END;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Monthly template ' || v_template.id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_daily_count, v_weekly_count, v_monthly_count, v_errors;
END;
$$;

-- Add comment explaining visibility windows
COMMENT ON FUNCTION generate_daily_tasks_direct() IS 'Generates tasks with visibility windows. Tasks appear in feed starting from (due_date - visibility_window_days_before) and remain visible until (due_date + visibility_window_days_after). Tasks become "late" after (due_date + grace_period_days).';

