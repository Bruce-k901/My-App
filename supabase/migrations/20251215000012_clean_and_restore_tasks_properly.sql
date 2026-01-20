-- ============================================================================
-- Migration: Clean and Restore Tasks Properly
-- Description: Deletes all tasks and restores Active Tasks from templates correctly
-- Date: 2026-01-20
-- ============================================================================
-- This migration:
-- 1. Deletes ALL existing tasks (clean slate)
-- 2. Restores Active Tasks from templates (one per unique pattern)
-- 3. Ensures no duplicates are created
-- ============================================================================

BEGIN;

-- Step 1: Delete ALL existing tasks
DO $$
BEGIN
  DELETE FROM checklist_tasks;
  RAISE NOTICE 'All tasks deleted. Starting fresh restoration...';
END $$;

-- Step 2: Restore Active Tasks from templates
-- Only create ONE Active Task per unique pattern: template_id + company_id + site_id + daypart
-- These will serve as patterns for the cron to generate daily tasks
DO $$
DECLARE
  v_template RECORD;
  v_company RECORD;
  v_site RECORD;
  v_task_id UUID;
  v_due_time TIME;
  v_daypart TEXT;
  v_created_count INTEGER := 0;
BEGIN
  -- Loop through all active library templates
  FOR v_template IN
    SELECT 
      tt.id as template_id,
      tt.name,
      tt.frequency,
      tt.time_of_day,
      tt.dayparts,
      tt.assigned_to_role,
      tt.assigned_to_user_id,
      tt.company_id as template_company_id,
      tt.site_id as template_site_id
    FROM task_templates tt
    WHERE (tt.is_active = true OR tt.is_active IS NULL)
      AND tt.is_template_library = true
  LOOP
    -- Determine which companies to create tasks for
    -- If template has company_id, only create for that company
    -- Otherwise, create for ALL companies
    FOR v_company IN
      SELECT DISTINCT c.id, c.name
      FROM companies c
      WHERE v_template.template_company_id IS NULL OR c.id = v_template.template_company_id
    LOOP
      -- Determine which sites to create tasks for
      -- If template has site_id, only create for that site
      -- Otherwise, create for ALL sites in the company
      FOR v_site IN
        SELECT DISTINCT s.id, s.name
        FROM sites s
        WHERE s.company_id = v_company.id
          AND (v_template.template_site_id IS NULL OR s.id = v_template.template_site_id)
      LOOP
        -- Determine daypart and time
        -- If template has dayparts array, create one task per daypart
        -- Otherwise, create a single task with 'anytime' daypart
        
        IF v_template.dayparts IS NOT NULL AND array_length(v_template.dayparts, 1) > 0 THEN
          -- Create one task per daypart
          FOREACH v_daypart IN ARRAY v_template.dayparts
          LOOP
            -- Convert daypart to time if needed
            CASE v_daypart
              WHEN 'before_open' THEN v_due_time := '08:00'::TIME;
              WHEN 'during_service' THEN v_due_time := '12:00'::TIME;
              WHEN 'after_service' THEN v_due_time := '18:00'::TIME;
              ELSE 
                BEGIN
                  -- Try to parse time_of_day as TIME, default to 09:00 if invalid
                  IF v_template.time_of_day IS NOT NULL AND v_template.time_of_day ~ '^\d{1,2}:\d{2}' THEN
                    v_due_time := v_template.time_of_day::TIME;
                  ELSE
                    v_due_time := '09:00'::TIME;
                  END IF;
                EXCEPTION WHEN OTHERS THEN
                  v_due_time := '09:00'::TIME;
                END;
            END CASE;
            
            -- Check if Active Task already exists for this exact pattern
            -- Use a more specific check to prevent duplicates
            SELECT id INTO v_task_id
            FROM checklist_tasks
            WHERE template_id = v_template.template_id
              AND company_id = v_company.id
              AND site_id = v_site.id
              AND daypart = v_daypart
              AND (task_data->>'source' IS NULL OR task_data->>'source' != 'cron')
            LIMIT 1;
            
            -- Only create if it doesn't exist
            IF v_task_id IS NULL THEN
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
                task_data
              ) VALUES (
                v_template.template_id,
                v_company.id,
                v_site.id,
                CURRENT_DATE, -- Use today as the initial due_date
                v_due_time,
                v_daypart,
                v_template.assigned_to_role,
                v_template.assigned_to_user_id,
                'pending',
                'medium', -- Default priority
                jsonb_build_object(
                  'restored_from_template', true,
                  'template_name', v_template.name,
                  'restored_date', CURRENT_DATE::text
                )
                -- NOTE: We do NOT set source='cron' so this becomes an Active Task
              );
              v_created_count := v_created_count + 1;
            END IF;
          END LOOP;
        ELSE
          -- No dayparts specified, create single task with 'anytime'
          BEGIN
            -- Try to parse time_of_day as TIME, default to 09:00 if invalid
            IF v_template.time_of_day IS NOT NULL AND v_template.time_of_day ~ '^\d{1,2}:\d{2}' THEN
              v_due_time := v_template.time_of_day::TIME;
            ELSE
              v_due_time := '09:00'::TIME;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            v_due_time := '09:00'::TIME;
          END;
          
          -- Check if Active Task already exists for this exact pattern
          SELECT id INTO v_task_id
          FROM checklist_tasks
          WHERE template_id = v_template.template_id
            AND company_id = v_company.id
            AND site_id = v_site.id
            AND (daypart IS NULL OR daypart = 'anytime')
            AND (task_data->>'source' IS NULL OR task_data->>'source' != 'cron')
          LIMIT 1;
          
          -- Only create if it doesn't exist
          IF v_task_id IS NULL THEN
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
              task_data
            ) VALUES (
              v_template.template_id,
              v_company.id,
              v_site.id,
              CURRENT_DATE,
              v_due_time,
              'anytime',
              v_template.assigned_to_role,
              v_template.assigned_to_user_id,
              'pending',
              'medium', -- Default priority
              jsonb_build_object(
                'restored_from_template', true,
                'template_name', v_template.name,
                'restored_date', CURRENT_DATE::text
              )
            );
            v_created_count := v_created_count + 1;
          END IF;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Active Tasks restored: % tasks created', v_created_count;
END $$;

-- Step 3: Verify no duplicates exist
DO $$
DECLARE
  v_duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT template_id, company_id, site_id, daypart, due_time
    FROM checklist_tasks
    WHERE (task_data->>'source' IS NULL OR task_data->>'source' != 'cron')
    GROUP BY template_id, company_id, site_id, daypart, due_time
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF v_duplicate_count > 0 THEN
    RAISE WARNING 'Found % duplicate Active Task patterns!', v_duplicate_count;
  ELSE
    RAISE NOTICE 'No duplicates found - restoration successful';
  END IF;
END $$;

-- Step 4: Final verification
DO $$
DECLARE
  v_active_count INTEGER;
  v_total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_active_count
  FROM checklist_tasks
  WHERE (task_data->>'source' IS NULL OR task_data->>'source' != 'cron');
  
  SELECT COUNT(*) INTO v_total_count
  FROM checklist_tasks;
  
  RAISE NOTICE 'Final counts:';
  RAISE NOTICE '  Total tasks: %', v_total_count;
  RAISE NOTICE '  Active Tasks (patterns): %', v_active_count;
  RAISE NOTICE '  Cron-generated tasks: %', (v_total_count - v_active_count);
END $$;

COMMIT;
