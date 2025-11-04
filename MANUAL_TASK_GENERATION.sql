-- Manual Task Generation Script
-- Run this in Supabase SQL Editor to generate missing tasks for today

-- Option 1: Generate all daily tasks for today (will skip duplicates)
-- RECOMMENDED: Just run this simple command
SELECT * FROM generate_daily_tasks_direct();

-- Option 2: Generate tasks for ALL daily templates with detailed logging
-- This does the same thing as Option 1 but with more detailed output
DO $$
DECLARE
  v_template RECORD;
  v_site RECORD;
  v_daypart TEXT;
  v_dayparts TEXT[];
  v_times_for_daypart TEXT[];
  v_daypart_time_value JSONB;
  v_time_str TEXT;
  v_pattern JSONB;
  v_daypart_times JSONB;
  v_existing_combinations TEXT[];
  v_today DATE := CURRENT_DATE;
  v_created_count INT := 0;
BEGIN
  -- Process all daily templates
  FOR v_template IN 
    SELECT * FROM task_templates 
    WHERE frequency = 'daily' 
      AND is_active = true
  LOOP
    BEGIN
      RAISE NOTICE 'Processing template: % (ID: %)', v_template.name, v_template.id;
      
      -- Get dayparts
      v_dayparts := v_template.dayparts;
      IF v_dayparts IS NULL OR array_length(v_dayparts, 1) IS NULL THEN
        v_dayparts := ARRAY['before_open'];
      END IF;
      
      -- Get daypart_times from recurrence_pattern
      v_pattern := v_template.recurrence_pattern;
      IF v_pattern IS NOT NULL AND v_pattern ? 'daypart_times' THEN
        v_daypart_times := v_pattern->'daypart_times';
      END IF;
      
      -- Get all active sites
      FOR v_site IN 
        SELECT id, company_id FROM sites WHERE is_active = true
        AND (v_template.site_id IS NULL OR id = v_template.site_id)
      LOOP
        -- Check existing tasks
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
          IF v_daypart_times IS NOT NULL AND v_daypart_times ? v_daypart THEN
            v_daypart_time_value := v_daypart_times->v_daypart;
            
            -- Handle different formats
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
          
          -- Fallback to time_of_day or default
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
                  v_time_str,
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
                );
                
                v_created_count := v_created_count + 1;
                RAISE NOTICE '  ✓ Created task: daypart=%, time=%, site_id=%', v_daypart, v_time_str, v_site.id;
              ELSE
                RAISE NOTICE '  ⊗ Task already exists: daypart=%, time=%', v_daypart, v_time_str;
              END IF;
            END;
          END LOOP;
        END LOOP;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error processing template %: %', v_template.name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total tasks created: %', v_created_count;
END $$;
