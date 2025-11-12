# Task Creation Source Analysis

## 🔍 Problem Identified

Tasks are appearing on the **Active Tasks** page even though there's a rule that tasks should only be created manually from templates in the Compliance and Templates pages.

## 🎯 Root Cause

There are **TWO automatic task generation systems** running that create tasks automatically:

### 1. Database Cron Job (Primary Culprit)

- **Location**: `supabase/migrations/20250202000003_setup_task_generation_cron.sql`
- **Function**: `generate_daily_tasks_direct()`
- **Schedule**: Runs **every day at 3:00 AM UTC** via `pg_cron`
- **What it does**:
  - Automatically generates tasks for ALL active templates
  - Creates daily, weekly, and monthly tasks
  - Inserts directly into `checklist_tasks` table
  - No user interaction required

### 2. Edge Function (Secondary)

- **Location**: `supabase/functions/generate-daily-tasks/index.ts`
- **Purpose**: Alternative task generation via HTTP endpoint
- **What it does**:
  - Can be called manually or scheduled
  - Also inserts tasks into `checklist_tasks` table

## 📊 Task Creation Sources

| Source                     | Type          | When                                                    | Location                                     |
| -------------------------- | ------------- | ------------------------------------------------------- | -------------------------------------------- |
| **Manual (Intended)**      | User Action   | When user clicks template in Compliance/Templates pages | `TaskFromTemplateModal.tsx` (line 1200)      |
| **Automatic (Unintended)** | Cron Job      | Every day at 3:00 AM UTC                                | `generate_daily_tasks_direct()` SQL function |
| **Automatic (Unintended)** | Edge Function | When called manually or scheduled                       | `generate-daily-tasks/index.ts`              |

## 🔧 Solution Options

### Option 1: Disable Automatic Task Generation (Recommended if you want manual-only)

If you want tasks to **ONLY** be created manually from templates:

1. **Disable the cron job**:

```sql
-- Run this in Supabase SQL Editor
SELECT cron.unschedule('generate-daily-tasks-cron');
```

2. **Verify it's disabled**:

```sql
SELECT * FROM cron.job WHERE jobname = 'generate-daily-tasks-cron';
-- Should return no rows
```

3. **Delete existing auto-generated tasks** (if needed):

```sql
-- This will delete tasks that were auto-generated
-- Be careful - this deletes ALL tasks, not just auto-generated ones
-- You may want to check which tasks are auto-generated first
DELETE FROM checklist_tasks
WHERE generated_at IS NOT NULL
  AND created_at != updated_at; -- Auto-generated tasks typically have generated_at set
```

### Option 2: Keep Automatic Generation but Understand It's Working

If automatic task generation is **intended behavior**, then:

- The system is working as designed
- Tasks are being created automatically from active templates
- Users can still manually create tasks from templates
- Both manual and automatic tasks will appear in Active Tasks

### Option 3: Hybrid Approach - Disable Auto-Generation for Specific Templates

If you want some templates to auto-generate and others to be manual-only:

1. Add a flag to templates (e.g., `auto_generate` boolean)
2. Modify `generate_daily_tasks_direct()` to only process templates where `auto_generate = true`
3. Keep manual creation available for all templates

## 🔍 How to Verify What's Creating Tasks

### Check if cron job is active:

```sql
SELECT * FROM cron.job WHERE jobname = 'generate-daily-tasks-cron';
```

### Check recent cron job runs:

```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'generate-daily-tasks-cron')
ORDER BY start_time DESC
LIMIT 10;
```

### Check task creation timestamps:

```sql
-- See when tasks were created
SELECT
  id,
  template_id,
  site_id,
  due_date,
  created_at,
  generated_at,
  CASE
    WHEN generated_at IS NOT NULL THEN 'Auto-generated'
    ELSE 'Manual'
  END as creation_type
FROM checklist_tasks
ORDER BY created_at DESC
LIMIT 50;
```

### Check which templates are active and generating tasks:

```sql
SELECT
  tt.id,
  tt.name,
  tt.frequency,
  tt.is_active,
  COUNT(ct.id) as task_count
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id
WHERE tt.is_active = true
GROUP BY tt.id, tt.name, tt.frequency, tt.is_active
ORDER BY task_count DESC;
```

## 📝 Code References

### Manual Task Creation (Intended):

```1200:1217:src/components/templates/TaskFromTemplateModal.tsx
        // Create new checklist task
        const { data, error } = await supabase
          .from('checklist_tasks')
          .insert({
            template_id: templateId,
            company_id: companyId,
            site_id: siteId,
            due_date: formData.due_date,
            due_time: primaryDueTime,
            daypart: primaryDaypart,
            custom_name: formData.custom_name.trim(), // Required for new tasks, validated above
            custom_instructions: instructions,
            status: 'pending',
            priority: formData.priority,
            // Store task instance data (checklist items, temperatures, etc.)
            task_data: Object.keys(taskData).length > 0 ? taskData : {},
          })
          .select()
          .single();
```

### Automatic Task Creation (Cron Job):

```143:177:supabase/migrations/20250202000003_setup_task_generation_cron.sql
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
                        v_time_str::TIME, -- Use the specific time for this daypart, cast to TIME
                        v_daypart,
                        v_template.assigned_to_role,
                        v_template.assigned_to_user_id,
                        'pending',
                        CASE WHEN v_template.is_critical THEN 'critical' ELSE 'medium' END,
                        NOW(),
                        v_today + INTERVAL '1 day',
                        jsonb_build_object(
                          'dayparts', v_dayparts,
                          'daypart_times', v_daypart_times, -- Store daypart_times mapping for reference
                          'daypart', v_daypart, -- Store which daypart this task is for
                          'time', v_time_str, -- Store which time this task is for
                          'checklistItems', COALESCE((v_template.recurrence_pattern->'default_checklist_items')::jsonb, '[]'::jsonb) -- Auto-populate checklist items from template
                        )
                      );
```

## ✅ Recommended Action

1. **Decide**: Do you want automatic task generation or manual-only?
2. **If manual-only**: Disable the cron job using Option 1 above
3. **If automatic is OK**: The system is working as designed - tasks will appear automatically
4. **Verify**: Check the SQL queries above to see what's creating your tasks
