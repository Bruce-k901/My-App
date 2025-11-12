-- ============================================================================
-- QUICK FIX: Create Missing Daypart Tasks for Today
-- Run this to immediately create missing tasks for templates with multiple dayparts
-- ============================================================================

-- This will create tasks for each daypart that's missing for today
DO $$
DECLARE
  v_template record;
  v_site record;
  v_daypart text;
  v_dayparts text[];
  v_time_str text;
  v_today date := CURRENT_DATE;
  v_existing_combinations text[];
  v_combination text;
  v_daypart_times jsonb;
  v_daypart_time_value jsonb;
  v_created_count int := 0;
BEGIN
  -- Loop through templates with multiple dayparts
  FOR v_template IN 
    SELECT * FROM task_templates
    WHERE is_active = true
      AND dayparts IS NOT NULL
      AND array_length(dayparts, 1) > 1
      AND frequency = 'daily'
  LOOP
    v_dayparts := v_template.dayparts;
    
    -- Get daypart_times if available
    IF v_template.recurrence_pattern IS NOT NULL 
       AND v_template.recurrence_pattern ? 'daypart_times' THEN
      v_daypart_times := v_template.recurrence_pattern->'daypart_times';
    END IF;
    
    -- Get all active sites for this template
    FOR v_site IN
      SELECT id, company_id FROM sites
      WHERE (status IS NULL OR status != 'inactive')
        AND (v_template.site_id IS NULL OR id = v_template.site_id)
        AND (v_template.company_id IS NULL OR company_id = v_template.company_id)
    LOOP
      -- Get existing task combinations for this template/site/date
      SELECT array_agg(DISTINCT COALESCE(daypart, '') || '|' || COALESCE(due_time::text, ''))
      INTO v_existing_combinations
      FROM checklist_tasks
      WHERE template_id = v_template.id
        AND site_id = v_site.id
        AND due_date = v_today;
      
      -- Create tasks for each daypart
      FOREACH v_daypart IN ARRAY v_dayparts
      LOOP
        -- Get time for this daypart
        v_time_str := NULL;
        
        -- Check if daypart_times exists
        IF v_daypart_times IS NOT NULL AND v_daypart_times ? v_daypart THEN
          v_daypart_time_value := v_daypart_times->v_daypart;
          
          IF jsonb_typeof(v_daypart_time_value) = 'string' THEN
            v_time_str := v_daypart_time_value::text;
            v_time_str := trim(both '"' from v_time_str);
          ELSIF jsonb_typeof(v_daypart_time_value) = 'array' THEN
            -- Use first time from array
            SELECT value::text INTO v_time_str
            FROM jsonb_array_elements_text(v_daypart_time_value)
            LIMIT 1;
            v_time_str := trim(both '"' from v_time_str);
          END IF;
        END IF;
        
        -- If no daypart-specific time, use time_of_day or default
        IF v_time_str IS NULL OR v_time_str = '' THEN
          -- Validate time_of_day is a valid time format (HH:MM or HH:MM:SS)
          -- Must match pattern: digits:digits (with optional seconds)
          -- This prevents using daypart names like "before_open" as times
          IF v_template.time_of_day IS NOT NULL 
             AND v_template.time_of_day ~ '^[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?$' THEN
            -- time_of_day is a valid time format, use it
            v_time_str := v_template.time_of_day;
          ELSE
            -- time_of_day is not a valid time (might be a daypart name), use default
            -- Default time based on daypart if possible, otherwise 09:00
            CASE v_daypart
              WHEN 'before_open' THEN v_time_str := '06:00';
              WHEN 'morning' THEN v_time_str := '09:00';
              WHEN 'during_service' THEN v_time_str := '12:00';
              WHEN 'afternoon' THEN v_time_str := '15:00';
              WHEN 'after_service' THEN v_time_str := '18:00';
              WHEN 'evening' THEN v_time_str := '20:00';
              ELSE v_time_str := '09:00'; -- Default fallback
            END CASE;
          END IF;
        END IF;
        
        -- Create combination key
        v_combination := COALESCE(v_daypart, '') || '|' || COALESCE(v_time_str, '');
        
        -- Check if this combination already exists
        IF v_existing_combinations IS NULL OR NOT (v_combination = ANY(v_existing_combinations)) THEN
          -- Insert the missing task
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
              'time', v_time_str
            )
          )
          ON CONFLICT DO NOTHING; -- Use unique constraint to prevent duplicates
          
          v_created_count := v_created_count + 1;
          RAISE NOTICE 'Created task for template %, site %, daypart %, time %', 
            v_template.name, v_site.id, v_daypart, v_time_str;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Total tasks created: %', v_created_count;
END $$;

-- Verify tasks were created
SELECT 
  'Verification' as check_type,
  tt.id as template_id,
  tt.name as template_name,
  array_length(tt.dayparts, 1) as expected_dayparts,
  COUNT(ct.id) as tasks_created,
  array_agg(DISTINCT ct.daypart ORDER BY ct.daypart) as created_dayparts,
  array_agg(DISTINCT ct.due_time ORDER BY ct.due_time) as created_times
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id 
  AND ct.due_date = CURRENT_DATE
WHERE tt.is_active = true
  AND tt.dayparts IS NOT NULL 
  AND array_length(tt.dayparts, 1) > 1
GROUP BY tt.id, tt.name, tt.dayparts
ORDER BY tt.name;

