-- Migration: Update Cron to Use Active Tasks as Source
-- Description: Changes the cron job to generate tasks from existing checklist_tasks (Active Tasks page)
-- instead of task_templates. This ensures the cron regenerates tasks that have actually been created
-- and are shown in the Active Tasks master registry.

-- Drop existing cron job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') THEN
    PERFORM cron.unschedule('generate-daily-tasks-cron');
    RAISE NOTICE 'Removed existing cron job';
  END IF;
END $$;

-- Create new function that generates tasks from existing checklist_tasks
CREATE OR REPLACE FUNCTION generate_daily_tasks_from_active_tasks()
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
  v_task_pattern record;
  v_existing_task_id uuid;
BEGIN
  v_today := CURRENT_DATE;
  v_day_of_week := EXTRACT(DOW FROM CURRENT_DATE); -- 0 = Sunday, 1 = Monday, etc
  v_date_of_month := EXTRACT(DAY FROM CURRENT_DATE);

  -- ===== DAILY TASKS =====
  -- Find all unique task patterns from checklist_tasks that are daily
  -- A pattern is defined by: template_id + site_id + daypart + due_time
  -- We look at tasks from any date to find the patterns, but only generate for today
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
      tt.is_active
    FROM checklist_tasks ct
    INNER JOIN task_templates tt ON ct.template_id = tt.id
    WHERE LOWER(TRIM(COALESCE(tt.frequency, ''))) = 'daily'
      AND (tt.is_active = true OR tt.is_active IS NULL)
      AND ct.template_id IS NOT NULL
      AND ct.site_id IS NOT NULL
    ORDER BY ct.template_id, ct.site_id, ct.daypart, ct.due_time, ct.created_at DESC
  LOOP
    BEGIN
      -- Check if task already exists for today with this exact pattern
      SELECT id INTO v_existing_task_id
      FROM checklist_tasks
      WHERE template_id = v_task_pattern.template_id
        AND site_id = v_task_pattern.site_id
        AND daypart = v_task_pattern.daypart
        AND due_time = v_task_pattern.due_time
        AND due_date = v_today
      LIMIT 1;

      -- Only create if it doesn't exist
      IF v_existing_task_id IS NULL THEN
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
          v_task_pattern.template_id,
          v_task_pattern.company_id,
          v_task_pattern.site_id,
          v_today,
          v_task_pattern.due_time,
          v_task_pattern.daypart,
          v_task_pattern.assigned_to_role,
          v_task_pattern.assigned_to_user_id,
          'pending',
          COALESCE(v_task_pattern.priority, 'medium'),
          NOW(),
          v_today + INTERVAL '1 day',
          COALESCE(v_task_pattern.task_data, '{}'::jsonb)
        );
        v_daily_count := v_daily_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Daily pattern ' || COALESCE(v_task_pattern.template_id::text, 'unknown') || ': ' || SQLERRM);
    END;
  END LOOP;

  -- ===== WEEKLY TASKS =====
  -- Find weekly task patterns and generate if today matches the day of week
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
      tt.recurrence_pattern,
      tt.is_active
    FROM checklist_tasks ct
    INNER JOIN task_templates tt ON ct.template_id = tt.id
    WHERE LOWER(TRIM(COALESCE(tt.frequency, ''))) = 'weekly'
      AND (tt.is_active = true OR tt.is_active IS NULL)
      AND ct.template_id IS NOT NULL
      AND ct.site_id IS NOT NULL
    ORDER BY ct.template_id, ct.site_id, ct.daypart, ct.due_time, ct.created_at DESC
  LOOP
    BEGIN
      -- Check if this day of week matches the pattern
      DECLARE
        v_pattern JSONB := v_task_pattern.recurrence_pattern;
        v_target_days int[];
        v_should_generate boolean := false;
      BEGIN
        IF v_pattern IS NOT NULL AND v_pattern ? 'days' THEN
          v_target_days := ARRAY(SELECT jsonb_array_elements_text(v_pattern->'days')::int);
          v_should_generate := (v_day_of_week = ANY(v_target_days));
        ELSE
          -- Default to Monday (1) if no days specified
          v_should_generate := (v_day_of_week = 1);
        END IF;

        IF NOT v_should_generate THEN
          CONTINUE;
        END IF;

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
            v_task_pattern.template_id,
            v_task_pattern.company_id,
            v_task_pattern.site_id,
            v_today,
            v_task_pattern.due_time,
            v_task_pattern.daypart,
            v_task_pattern.assigned_to_role,
            v_task_pattern.assigned_to_user_id,
            'pending',
            COALESCE(v_task_pattern.priority, 'medium'),
            NOW(),
            v_today + INTERVAL '7 days',
            COALESCE(v_task_pattern.task_data, '{}'::jsonb)
          );
          v_weekly_count := v_weekly_count + 1;
        END IF;
      END;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Weekly pattern ' || COALESCE(v_task_pattern.template_id::text, 'unknown') || ': ' || SQLERRM);
    END;
  END LOOP;

  -- ===== MONTHLY TASKS =====
  -- Find monthly task patterns and generate if today matches the date of month
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
      tt.recurrence_pattern,
      tt.is_active
    FROM checklist_tasks ct
    INNER JOIN task_templates tt ON ct.template_id = tt.id
    WHERE LOWER(TRIM(COALESCE(tt.frequency, ''))) = 'monthly'
      AND (tt.is_active = true OR tt.is_active IS NULL)
      AND ct.template_id IS NOT NULL
      AND ct.site_id IS NOT NULL
    ORDER BY ct.template_id, ct.site_id, ct.daypart, ct.due_time, ct.created_at DESC
  LOOP
    BEGIN
      -- Check if this date of month matches the pattern
      DECLARE
        v_pattern JSONB := v_task_pattern.recurrence_pattern;
        v_target_date int;
        v_should_generate boolean := false;
      BEGIN
        IF v_pattern IS NOT NULL AND v_pattern ? 'date_of_month' THEN
          v_target_date := (v_pattern->>'date_of_month')::int;
          v_should_generate := (v_date_of_month = v_target_date);
        ELSE
          -- Default to 1st of month if no date specified
          v_should_generate := (v_date_of_month = 1);
        END IF;

        IF NOT v_should_generate THEN
          CONTINUE;
        END IF;

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
            v_task_pattern.template_id,
            v_task_pattern.company_id,
            v_task_pattern.site_id,
            v_today,
            v_task_pattern.due_time,
            v_task_pattern.daypart,
            v_task_pattern.assigned_to_role,
            v_task_pattern.assigned_to_user_id,
            'pending',
            COALESCE(v_task_pattern.priority, 'medium'),
            NOW(),
            v_today + INTERVAL '30 days',
            COALESCE(v_task_pattern.task_data, '{}'::jsonb)
          );
          v_monthly_count := v_monthly_count + 1;
        END IF;
      END;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Monthly pattern ' || COALESCE(v_task_pattern.template_id::text, 'unknown') || ': ' || SQLERRM);
    END;
  END LOOP;

  RETURN QUERY SELECT v_daily_count, v_weekly_count, v_monthly_count, v_errors;
END;
$$;

-- Schedule new cron job (testing time: 7:10 AM UTC = 8:10 AM BST)
SELECT cron.schedule(
  'generate-daily-tasks-cron',
  '10 7 * * *', -- 7:10 AM UTC = 8:10 AM BST every day (testing time)
  $$SELECT generate_daily_tasks_from_active_tasks()$$
);

-- Verify the cron job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') THEN
    RAISE NOTICE '✅ Cron job "generate-daily-tasks-cron" scheduled successfully for 7:10 AM UTC (8:10 AM BST) daily';
    RAISE NOTICE '✅ Cron now uses Active Tasks (checklist_tasks) as source instead of task_templates';
  ELSE
    RAISE WARNING '⚠️ Cron job creation may have failed';
  END IF;
END $$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_daily_tasks_from_active_tasks() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_daily_tasks_from_active_tasks() TO service_role;

-- Add comment
COMMENT ON FUNCTION generate_daily_tasks_from_active_tasks() IS
'Generates daily, weekly, and monthly tasks from existing checklist_tasks (Active Tasks page).
Uses DISTINCT ON to find unique task patterns (template_id + site_id + daypart + due_time)
and regenerates them for today. Only generates tasks that don''t already exist for today.
This ensures the cron regenerates tasks that have actually been created and are shown in the Active Tasks master registry.
Runs daily at 7:10 AM UTC (8:10 AM BST) for testing.';

