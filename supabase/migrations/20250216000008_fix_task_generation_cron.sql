-- ============================================================================
-- Migration: Fix Task Generation Cron - Check Frequency First
-- Description: Updates the cron function to check frequency first before 
--              dates/dayparts, and improves reliability
-- ============================================================================

BEGIN;

-- Drop and recreate the function with improved logic
DROP FUNCTION IF EXISTS generate_daily_tasks_direct() CASCADE;

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
  v_existing_combinations text[];
  v_frequency text;
BEGIN
  v_today := CURRENT_DATE;
  v_day_of_week := EXTRACT(DOW FROM CURRENT_DATE); -- 0 = Sunday, 1 = Monday, etc
  v_date_of_month := EXTRACT(DAY FROM CURRENT_DATE);
  
  -- ===== STEP 1: Process templates by FREQUENCY first =====
  -- This ensures we check frequency before dates/dayparts
  
  -- ===== DAILY TASKS =====
  -- Only process templates with frequency = 'daily'
  FOR v_template IN 
    SELECT * FROM task_templates 
    WHERE frequency = 'daily' 
      AND is_active = true
      AND (company_id IS NOT NULL OR company_id IS NULL) -- Include both company-specific and global templates
  LOOP
    BEGIN
      -- CRITICAL: Check frequency first - skip if not daily
      IF v_template.frequency != 'daily' THEN
        CONTINUE;
      END IF;
      
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
                    v_already_exists BOOLEAN := FALSE;
                  BEGIN
                    -- Check if this combination already exists
                    IF v_existing_combinations IS NOT NULL THEN
                      v_already_exists := v_combination = ANY(v_existing_combinations);
                    END IF;
                    
                    -- Only create if it doesn't exist
                    IF NOT v_already_exists THEN
                      INSERT INTO checklist_tasks (
                        template_id,
                        company_id,
                        site_id,
                        due_date,
                        due_time,
                        daypart,
                        status,
                        priority,
                        task_data
                      ) VALUES (
                        v_template.id,
                        v_site.company_id,
                        v_site.id,
                        v_today,
                        v_time_str::time,
                        v_daypart,
                        'pending',
                        COALESCE(v_template.priority, 'medium'),
                        jsonb_build_object('source', 'cron', 'frequency', 'daily')
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
  -- Only process templates with frequency = 'weekly'
  FOR v_template IN 
    SELECT * FROM task_templates 
    WHERE frequency = 'weekly' 
      AND is_active = true
  LOOP
    BEGIN
      -- CRITICAL: Check frequency first - skip if not weekly
      IF v_template.frequency != 'weekly' THEN
        CONTINUE;
      END IF;
      
      -- Check if today matches the weekly schedule
      DECLARE
        v_pattern JSONB := v_template.recurrence_pattern;
        v_days_of_week INTEGER[];
        v_should_run BOOLEAN := FALSE;
      BEGIN
        -- Get days of week from recurrence_pattern
        IF v_pattern IS NOT NULL AND v_pattern ? 'days' THEN
          v_days_of_week := ARRAY(SELECT jsonb_array_elements_text(v_pattern->'days'))::INTEGER[];
          v_should_run := v_day_of_week = ANY(v_days_of_week);
        ELSIF v_pattern IS NOT NULL AND v_pattern ? 'day' THEN
          -- Single day format
          v_should_run := (v_pattern->>'day')::INTEGER = v_day_of_week;
        ELSE
          -- Default: run on Monday (1) if no pattern specified
          v_should_run := v_day_of_week = 1;
        END IF;
        
        -- Only proceed if today matches the weekly schedule
        IF NOT v_should_run THEN
          CONTINUE;
        END IF;
        
        -- Get dayparts (same logic as daily)
        v_dayparts := v_template.dayparts;
        IF v_dayparts IS NULL OR array_length(v_dayparts, 1) IS NULL THEN
          v_dayparts := ARRAY['before_open'];
        END IF;
        
        -- Get daypart times (same logic as daily)
        DECLARE
          v_daypart_times JSONB;
        BEGIN
          IF v_pattern IS NOT NULL AND v_pattern ? 'daypart_times' THEN
            v_daypart_times := v_pattern->'daypart_times';
          END IF;
          
          -- Get sites (same logic as daily)
          FOR v_site IN 
            SELECT id, company_id FROM sites 
            WHERE (status IS NULL OR status != 'inactive')
              AND (v_template.site_id IS NULL OR id = v_template.site_id)
              AND (v_template.company_id IS NULL OR company_id = v_template.company_id)
          LOOP
            -- Check existing tasks
            DECLARE
              v_existing_combinations TEXT[];
            BEGIN
              SELECT array_agg(DISTINCT COALESCE(daypart, '') || '|' || COALESCE(due_time::text, '')) 
              INTO v_existing_combinations
              FROM checklist_tasks
              WHERE template_id = v_template.id
                AND site_id = v_site.id
                AND due_date = v_today;
              
              -- Create tasks for each daypart (same logic as daily)
              FOREACH v_daypart IN ARRAY v_dayparts
              LOOP
                DECLARE
                  v_times_for_daypart TEXT[];
                  v_daypart_time_value JSONB;
                  v_time_str TEXT;
                BEGIN
                  -- Get times for this daypart (same logic as daily)
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
                  
                  -- Fallback to time_of_day or default
                  IF v_times_for_daypart IS NULL OR array_length(v_times_for_daypart, 1) IS NULL THEN
                    IF v_template.time_of_day IS NOT NULL THEN
                      v_times_for_daypart := ARRAY[v_template.time_of_day];
                    ELSE
                      v_times_for_daypart := ARRAY['09:00'];
                    END IF;
                  END IF;
                  
                  -- Create tasks
                  FOREACH v_time_str IN ARRAY v_times_for_daypart
                  LOOP
                    DECLARE
                      v_combination TEXT := COALESCE(v_daypart, '') || '|' || COALESCE(v_time_str, '');
                      v_already_exists BOOLEAN := FALSE;
                    BEGIN
                      IF v_existing_combinations IS NOT NULL THEN
                        v_already_exists := v_combination = ANY(v_existing_combinations);
                      END IF;
                      
                      IF NOT v_already_exists THEN
                        INSERT INTO checklist_tasks (
                          template_id,
                          company_id,
                          site_id,
                          due_date,
                          due_time,
                          daypart,
                          status,
                          priority,
                          task_data
                        ) VALUES (
                          v_template.id,
                          v_site.company_id,
                          v_site.id,
                          v_today,
                          v_time_str::time,
                          v_daypart,
                          'pending',
                          COALESCE(v_template.priority, 'medium'),
                          jsonb_build_object('source', 'cron', 'frequency', 'weekly')
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
      END;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Weekly template ' || v_template.id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  -- ===== MONTHLY TASKS =====
  -- Only process templates with frequency = 'monthly'
  FOR v_template IN 
    SELECT * FROM task_templates 
    WHERE frequency = 'monthly' 
      AND is_active = true
  LOOP
    BEGIN
      -- CRITICAL: Check frequency first - skip if not monthly
      IF v_template.frequency != 'monthly' THEN
        CONTINUE;
      END IF;
      
      -- Check if today matches the monthly schedule
      DECLARE
        v_pattern JSONB := v_template.recurrence_pattern;
        v_dates_of_month INTEGER[];
        v_should_run BOOLEAN := FALSE;
      BEGIN
        -- Get dates of month from recurrence_pattern
        IF v_pattern IS NOT NULL AND v_pattern ? 'dates' THEN
          v_dates_of_month := ARRAY(SELECT jsonb_array_elements_text(v_pattern->'dates'))::INTEGER[];
          v_should_run := v_date_of_month = ANY(v_dates_of_month);
        ELSIF v_pattern IS NOT NULL AND v_pattern ? 'date' THEN
          -- Single date format
          v_should_run := (v_pattern->>'date')::INTEGER = v_date_of_month;
        ELSE
          -- Default: run on 1st of month if no pattern specified
          v_should_run := v_date_of_month = 1;
        END IF;
        
        -- Only proceed if today matches the monthly schedule
        IF NOT v_should_run THEN
          CONTINUE;
        END IF;
        
        -- Get dayparts and times (same logic as daily/weekly)
        v_dayparts := v_template.dayparts;
        IF v_dayparts IS NULL OR array_length(v_dayparts, 1) IS NULL THEN
          v_dayparts := ARRAY['before_open'];
        END IF;
        
        DECLARE
          v_daypart_times JSONB;
        BEGIN
          IF v_pattern IS NOT NULL AND v_pattern ? 'daypart_times' THEN
            v_daypart_times := v_pattern->'daypart_times';
          END IF;
          
          FOR v_site IN 
            SELECT id, company_id FROM sites 
            WHERE (status IS NULL OR status != 'inactive')
              AND (v_template.site_id IS NULL OR id = v_template.site_id)
              AND (v_template.company_id IS NULL OR company_id = v_template.company_id)
          LOOP
            DECLARE
              v_existing_combinations TEXT[];
            BEGIN
              SELECT array_agg(DISTINCT COALESCE(daypart, '') || '|' || COALESCE(due_time::text, '')) 
              INTO v_existing_combinations
              FROM checklist_tasks
              WHERE template_id = v_template.id
                AND site_id = v_site.id
                AND due_date = v_today;
              
              FOREACH v_daypart IN ARRAY v_dayparts
              LOOP
                DECLARE
                  v_times_for_daypart TEXT[];
                  v_daypart_time_value JSONB;
                  v_time_str TEXT;
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
                      v_already_exists BOOLEAN := FALSE;
                    BEGIN
                      IF v_existing_combinations IS NOT NULL THEN
                        v_already_exists := v_combination = ANY(v_existing_combinations);
                      END IF;
                      
                      IF NOT v_already_exists THEN
                        INSERT INTO checklist_tasks (
                          template_id,
                          company_id,
                          site_id,
                          due_date,
                          due_time,
                          daypart,
                          status,
                          priority,
                          task_data
                        ) VALUES (
                          v_template.id,
                          v_site.company_id,
                          v_site.id,
                          v_today,
                          v_time_str::time,
                          v_daypart,
                          'pending',
                          COALESCE(v_template.priority, 'medium'),
                          jsonb_build_object('source', 'cron', 'frequency', 'monthly')
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
      END;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Monthly template ' || v_template.id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_daily_count, v_weekly_count, v_monthly_count, v_errors;
END;
$$;

-- Update the cron schedule (keep existing schedule)
-- Note: The cron is set for 3:00 AM UTC, which is 4:00 AM BST (British Summer Time)
-- If you want 3:00 AM BST, you need 2:00 AM UTC (BST is UTC+1)
-- But since BST changes, it's better to use UTC and adjust if needed

-- Drop existing cron job if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') THEN
    PERFORM cron.unschedule('generate-daily-tasks-cron');
  END IF;
END $$;

-- Reschedule the cron job
-- For 3:00 AM BST (British Summer Time), use 2:00 AM UTC during BST period
-- For 3:00 AM GMT (Greenwich Mean Time), use 3:00 AM UTC
-- Since BST/GMT changes, we'll use 2:00 AM UTC which covers BST period
-- You may need to adjust this manually when GMT period starts
SELECT cron.schedule(
  'generate-daily-tasks-cron',
  '0 2 * * *', -- 2:00 AM UTC = 3:00 AM BST (during BST period)
  $$SELECT generate_daily_tasks_direct()$$
);

-- Verify the cron job was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') THEN
    RAISE NOTICE '✅ Cron job "generate-daily-tasks-cron" scheduled successfully for 2:00 AM UTC (3:00 AM BST)';
  ELSE
    RAISE WARNING '⚠️ Cron job creation may have failed. Please check manually.';
  END IF;
END $$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_daily_tasks_direct() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_daily_tasks_direct() TO service_role;

-- Add comment
COMMENT ON FUNCTION generate_daily_tasks_direct() IS 
'Automatically generates daily, weekly, and monthly tasks for all active templates and sites. 
Checks frequency FIRST before processing dates/dayparts. 
Runs via pg_cron every day at 2:00 AM UTC (3:00 AM BST during BST period). 
Handles multiple dayparts by creating separate task instances.';

COMMIT;

