-- Migration: Fix TIME type casting in task generation function
-- Description: Casts TEXT time values to TIME type when inserting into checklist_tasks.due_time
-- This fixes the error: "column \"due_time\" is of type time without time zone but expression is of type text"

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
      -- Get dayparts from template
      v_dayparts := v_template.dayparts;
      IF v_dayparts IS NULL OR array_length(v_dayparts, 1) IS NULL THEN
        v_dayparts := ARRAY['before_open'];
      END IF;
      
      -- Get daypart-specific times from recurrence_pattern.daypart_times if available
      -- Format: { "before_open": "06:00", "during_service": "12:00,15:00", "after_service": "18:00" }
      -- OR: { "before_open": ["06:00"], "during_service": ["12:00", "15:00"] }
      DECLARE
        v_pattern JSONB := v_template.recurrence_pattern;
        v_daypart_times JSONB;
      BEGIN
        -- Extract daypart_times from recurrence_pattern
        IF v_pattern IS NOT NULL AND v_pattern ? 'daypart_times' THEN
          v_daypart_times := v_pattern->'daypart_times';
        END IF;
        
        -- Get all active sites
        -- Filter by company_id if template is company-specific (not global)
        FOR v_site IN 
          SELECT id, company_id FROM sites 
          WHERE (status IS NULL OR status != 'inactive')
            AND (v_template.site_id IS NULL OR id = v_template.site_id)
            AND (v_template.company_id IS NULL OR company_id = v_template.company_id)
        LOOP
          -- Check existing tasks for this template/site/date
          -- Check by both daypart AND due_time to avoid duplicates for multiple times
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
                    -- Array format: ["18:00", "19:00", "22:00"]
                    SELECT array_agg(value::text) INTO v_times_for_daypart
                    FROM jsonb_array_elements_text(v_daypart_time_value);
                  ELSIF jsonb_typeof(v_daypart_time_value) = 'string' THEN
                    -- String format: "18:00" or "18:00,19:00,22:00"
                    v_time_str := v_daypart_time_value::text;
                    -- Remove quotes if present
                    v_time_str := trim(both '"' from v_time_str);
                    -- Split by comma if multiple times
                    IF v_time_str LIKE '%,%' THEN
                      v_times_for_daypart := string_to_array(v_time_str, ',');
                      -- Trim whitespace from each time
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
                    v_times_for_daypart := ARRAY['09:00']; -- Default
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
                        v_time_str::TIME, -- CRITICAL: Cast TEXT to TIME
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
      -- Check if this template should run today
      DECLARE
        v_pattern jsonb := v_template.recurrence_pattern;
        v_target_days int[];
      BEGIN
        -- Use 'days' field (not 'weeks') - array of day numbers (0=Sunday, 1=Monday, etc.)
        IF v_pattern ? 'days' THEN
          v_target_days := ARRAY(SELECT jsonb_array_elements_text(v_pattern->'days')::int);
        ELSE
          v_target_days := ARRAY[1]; -- Default to Monday
        END IF;
        
        IF NOT (v_day_of_week = ANY(v_target_days)) THEN
          CONTINUE;
        END IF;
        
        -- Get dayparts
        v_dayparts := v_template.dayparts;
        IF v_dayparts IS NULL OR array_length(v_dayparts, 1) IS NULL THEN
          v_dayparts := ARRAY['anytime'];
        END IF;
        
        -- Get all active sites
        -- Filter by company_id if template is company-specific (not global)
        FOR v_site IN 
          SELECT id, company_id FROM sites 
          WHERE (status IS NULL OR status != 'inactive')
            AND (v_template.site_id IS NULL OR id = v_template.site_id)
            AND (v_template.company_id IS NULL OR company_id = v_template.company_id)
        LOOP
          -- Check existing tasks by daypart+time combination (like daily tasks)
          DECLARE
            v_existing_combinations TEXT[];
            v_daypart_times JSONB;
            v_times_for_daypart TEXT[];
            v_daypart_time_value JSONB;
            v_time_str TEXT;
          BEGIN
            -- Get daypart_times from recurrence_pattern
            IF v_pattern ? 'daypart_times' THEN
              v_daypart_times := v_pattern->'daypart_times';
            END IF;
            
            SELECT array_agg(DISTINCT COALESCE(daypart, '') || '|' || COALESCE(due_time::text, '')) 
            INTO v_existing_combinations
            FROM checklist_tasks
            WHERE template_id = v_template.id
              AND site_id = v_site.id
              AND due_date = v_today;
            
            -- Create tasks for each daypart with its specific times
            FOREACH v_daypart IN ARRAY v_dayparts
            LOOP
              -- Get times for this specific daypart
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
              
              -- If no daypart-specific times, fall back to time_of_day or default
              IF v_times_for_daypart IS NULL OR array_length(v_times_for_daypart, 1) IS NULL THEN
                IF v_template.time_of_day IS NOT NULL THEN
                  v_times_for_daypart := ARRAY[v_template.time_of_day];
                ELSE
                  v_times_for_daypart := ARRAY['09:00']; -- Default
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
                      v_time_str::TIME, -- CRITICAL: Cast TEXT to TIME
                      v_daypart,
                      v_template.assigned_to_role,
                      v_template.assigned_to_user_id,
                      'pending',
                      CASE WHEN v_template.is_critical THEN 'critical' ELSE 'medium' END,
                      NOW(),
                      v_today + INTERVAL '7 days',
                      jsonb_build_object(
                        'dayparts', v_dayparts,
                        'daypart_times', v_daypart_times,
                        'daypart', v_daypart,
                        'time', v_time_str,
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
      -- Check if this template should run today
      DECLARE
        v_pattern jsonb := v_template.recurrence_pattern;
        v_target_date int;
      BEGIN
        IF v_pattern ? 'date_of_month' THEN
          v_target_date := (v_pattern->>'date_of_month')::int;
        ELSE
          v_target_date := 1; -- Default to 1st of month
        END IF;
        
        IF v_date_of_month != v_target_date THEN
          CONTINUE;
        END IF;
        
        -- Get dayparts
        v_dayparts := v_template.dayparts;
        IF v_dayparts IS NULL OR array_length(v_dayparts, 1) IS NULL THEN
          v_dayparts := ARRAY['anytime'];
        END IF;
        
        -- Get all active sites
        -- Filter by company_id if template is company-specific (not global)
        FOR v_site IN 
          SELECT id, company_id FROM sites 
          WHERE (status IS NULL OR status != 'inactive')
            AND (v_template.site_id IS NULL OR id = v_template.site_id)
            AND (v_template.company_id IS NULL OR company_id = v_template.company_id)
        LOOP
          -- Check existing tasks by daypart+time combination (like daily/weekly tasks)
          DECLARE
            v_existing_combinations TEXT[];
            v_daypart_times JSONB;
            v_times_for_daypart TEXT[];
            v_daypart_time_value JSONB;
            v_time_str TEXT;
          BEGIN
            -- Get daypart_times from recurrence_pattern
            IF v_pattern ? 'daypart_times' THEN
              v_daypart_times := v_pattern->'daypart_times';
            END IF;
            
            SELECT array_agg(DISTINCT COALESCE(daypart, '') || '|' || COALESCE(due_time::text, '')) 
            INTO v_existing_combinations
            FROM checklist_tasks
            WHERE template_id = v_template.id
              AND site_id = v_site.id
              AND due_date = v_today;
            
            -- Create tasks for each daypart with its specific times
            FOREACH v_daypart IN ARRAY v_dayparts
            LOOP
              -- Get times for this specific daypart
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
              
              -- If no daypart-specific times, fall back to time_of_day or default
              IF v_times_for_daypart IS NULL OR array_length(v_times_for_daypart, 1) IS NULL THEN
                IF v_template.time_of_day IS NOT NULL THEN
                  v_times_for_daypart := ARRAY[v_template.time_of_day];
                ELSE
                  v_times_for_daypart := ARRAY['09:00']; -- Default
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
                      v_time_str::TIME, -- CRITICAL: Cast TEXT to TIME
                      v_daypart,
                      v_template.assigned_to_role,
                      v_template.assigned_to_user_id,
                      'pending',
                      CASE WHEN v_template.is_critical THEN 'critical' ELSE 'medium' END,
                      NOW(),
                      v_today + INTERVAL '30 days',
                      jsonb_build_object(
                        'dayparts', v_dayparts,
                        'daypart_times', v_daypart_times,
                        'daypart', v_daypart,
                        'time', v_time_str,
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
  
  RETURN QUERY SELECT v_daily_count, v_weekly_count, v_monthly_count, v_errors;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_daily_tasks_direct() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_daily_tasks_direct() TO service_role;

COMMENT ON FUNCTION generate_daily_tasks_direct() IS 
'Automatically generates daily, weekly, and monthly tasks for all active templates and sites. 
Runs via pg_cron every day at 3:00 AM UTC. Handles multiple dayparts by creating separate task instances.
FIXED: Casts TEXT time values to TIME type for due_time column.';

