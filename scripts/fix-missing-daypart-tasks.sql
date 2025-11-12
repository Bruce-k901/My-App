-- ============================================================================
-- FIX MISSING DAYPART TASKS
-- This will manually generate missing tasks for templates with multiple dayparts
-- ============================================================================

-- STEP 1: Check what's missing
SELECT 
  'Missing Tasks' as check_type,
  tt.id as template_id,
  tt.name as template_name,
  tt.dayparts as template_dayparts,
  COUNT(ct.id) as tasks_created,
  array_length(tt.dayparts, 1) as expected_count,
  array_length(tt.dayparts, 1) - COUNT(ct.id) as missing_count
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id 
  AND ct.due_date = CURRENT_DATE
WHERE tt.is_active = true
  AND tt.dayparts IS NOT NULL 
  AND array_length(tt.dayparts, 1) > 1
GROUP BY tt.id, tt.name, tt.dayparts
HAVING COUNT(ct.id) < array_length(tt.dayparts, 1)
ORDER BY missing_count DESC;

-- STEP 2: Manually create missing tasks for today
-- This will create tasks for each daypart that's missing
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
        
        -- Check if daypart_times exists in recurrence_pattern
        IF v_template.recurrence_pattern IS NOT NULL 
           AND v_template.recurrence_pattern ? 'daypart_times'
           AND (v_template.recurrence_pattern->'daypart_times') ? v_daypart THEN
          -- Get time from daypart_times
          v_time_str := (v_template.recurrence_pattern->'daypart_times'->>v_daypart);
          -- Remove quotes if present
          v_time_str := trim(both '"' from v_time_str);
        END IF;
        
        -- If no daypart-specific time, use time_of_day or default
        IF v_time_str IS NULL OR v_time_str = '' THEN
          IF v_template.time_of_day IS NOT NULL 
             AND v_template.time_of_day ~ '^[0-9]{1,2}:[0-9]{2}$' THEN
            -- time_of_day is a valid time format (HH:MM)
            v_time_str := v_template.time_of_day;
          ELSE
            -- Default time
            v_time_str := '09:00';
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
              'daypart', v_daypart,
              'time', v_time_str
            )
          )
          ON CONFLICT DO NOTHING; -- Use unique constraint to prevent duplicates
          
          RAISE NOTICE 'Created task for template %, site %, daypart %, time %', 
            v_template.name, v_site.id, v_daypart, v_time_str;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- STEP 3: Verify tasks were created
SELECT 
  'Verification' as check_type,
  tt.id as template_id,
  tt.name as template_name,
  array_length(tt.dayparts, 1) as expected_dayparts,
  COUNT(ct.id) as tasks_created,
  array_agg(DISTINCT ct.daypart ORDER BY ct.daypart) as created_dayparts
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id 
  AND ct.due_date = CURRENT_DATE
WHERE tt.is_active = true
  AND tt.dayparts IS NOT NULL 
  AND array_length(tt.dayparts, 1) > 1
GROUP BY tt.id, tt.name, tt.dayparts
ORDER BY tt.name;

