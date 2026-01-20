-- ============================================================================
-- Migration: Restore Active Tasks from Templates
-- Description: Creates Active Tasks from task_templates so the cron can generate today's tasks
-- Date: 2025-12-15
-- ============================================================================
-- 
-- This migration creates "Active Tasks" (master registry) from task_templates
-- so that the cron job can generate today's tasks.
-- 
-- Active Tasks are tasks WITHOUT task_data->>'source' = 'cron'
-- These serve as patterns for the cron to regenerate daily/weekly/monthly tasks
-- ============================================================================

BEGIN;

-- Create Active Tasks from active templates for each company/site combination
-- This restores the master task registry that the cron uses
DO $$
DECLARE
  v_template RECORD;
  v_company RECORD;
  v_site RECORD;
  v_task_id UUID;
  v_due_time TIME;
  v_daypart TEXT;
BEGIN
  -- Loop through all active templates
  FOR v_template IN
    SELECT 
      tt.id as template_id,
      tt.name,
      tt.frequency,
      tt.time_of_day,
      tt.dayparts,
      tt.assigned_to_role,
      tt.assigned_to_user_id,
      tt.company_id,
      tt.site_id,
      tt.recurrence_pattern
    FROM task_templates tt
    WHERE (tt.is_active = true OR tt.is_active IS NULL)
      AND tt.is_template_library = true
  LOOP
    -- Determine which companies/sites to create tasks for
    -- If template has company_id, only create for that company
    -- If template has site_id, only create for that site
    -- Otherwise, create for all companies
    
    FOR v_company IN
      SELECT DISTINCT c.id, c.name
      FROM companies c
      WHERE v_template.company_id IS NULL OR c.id = v_template.company_id
    LOOP
      -- Determine which sites to create tasks for
      FOR v_site IN
        SELECT DISTINCT s.id, s.name
        FROM sites s
        WHERE s.company_id = v_company.id
          AND (v_template.site_id IS NULL OR s.id = v_template.site_id)
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
                  IF v_template.time_of_day ~ '^\d{1,2}:\d{2}' THEN
                    v_due_time := v_template.time_of_day::TIME;
                  ELSE
                    v_due_time := '09:00'::TIME;
                  END IF;
                EXCEPTION WHEN OTHERS THEN
                  v_due_time := '09:00'::TIME;
                END;
            END CASE;
            
            -- Check if Active Task already exists for this pattern
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
                  'template_name', v_template.name
                )
                -- NOTE: We do NOT set source='cron' so this becomes an Active Task
              );
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
          
          -- Check if Active Task already exists
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
                'template_name', v_template.name
              )
            );
          END IF;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Active Tasks restored from templates';
END $$;

-- Verify restoration
DO $$
DECLARE
  v_active_count INTEGER;
  v_cron_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_active_count
  FROM checklist_tasks
  WHERE (task_data->>'source' IS NULL OR task_data->>'source' != 'cron');
  
  SELECT COUNT(*) INTO v_cron_count
  FROM checklist_tasks
  WHERE task_data->>'source' = 'cron';
  
  RAISE NOTICE 'Active Tasks (patterns): %', v_active_count;
  RAISE NOTICE 'Cron-generated tasks: %', v_cron_count;
END $$;

COMMIT;
