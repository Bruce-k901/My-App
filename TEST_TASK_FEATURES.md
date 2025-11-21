# Testing Task Features Population

This guide explains how to test the updated `generate-daily-tasks` edge function to verify that task features (checklist items, temperature fields, etc.) are properly populated.

## Prerequisites

1. **Deploy the updated edge function** first:
   ```bash
   supabase functions deploy generate-daily-tasks
   ```

2. **Get your Supabase credentials**:
   - Project URL: Found in Supabase Dashboard → Settings → API
   - Service Role Key: Found in Supabase Dashboard → Settings → API (keep this secret!)

## Method 1: Test via Supabase Dashboard (Easiest)

1. **Deploy the function**:
   ```bash
   cd /workspace
   supabase functions deploy generate-daily-tasks
   ```

2. **Go to Supabase Dashboard**:
   - Navigate to **Edge Functions** → **generate-daily-tasks**
   - Click **Invoke** button
   - This will trigger the function and show you the response

3. **Check the logs**:
   - In the same page, click **Logs** tab
   - Look for any errors or the success response

## Method 2: Test via API Route (From Your App)

1. **Make sure you're logged in as an admin**

2. **Call the API endpoint**:
   ```bash
   # From your browser console or using curl
   fetch('/api/admin/generate-tasks', { method: 'POST' })
     .then(r => r.json())
     .then(console.log)
   ```

## Method 3: Test via cURL (Command Line)

```bash
# Replace YOUR_PROJECT_URL and YOUR_SERVICE_ROLE_KEY with your actual values
curl -X POST https://YOUR_PROJECT_URL.supabase.co/functions/v1/generate-daily-tasks \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Method 4: Test via Node.js Script

Run the test script I'll create below.

## Verifying Task Features Were Populated

After running the function, check the database to verify features were populated:

### 1. Check if tasks were created:
```sql
SELECT 
  id,
  custom_name,
  template_id,
  due_date,
  task_data
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 10;
```

### 2. Check for checklist items:
```sql
SELECT 
  id,
  custom_name,
  task_data->'checklistItems' as checklist_items,
  task_data->'yesNoChecklistItems' as yes_no_checklist_items
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND (
    task_data->'checklistItems' IS NOT NULL 
    OR task_data->'yesNoChecklistItems' IS NOT NULL
  )
LIMIT 5;
```

### 3. Check for temperature fields:
```sql
SELECT 
  id,
  custom_name,
  task_data->'temperatures' as temperatures,
  task_data->'selectedAssets' as selected_assets
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND task_data->'temperatures' IS NOT NULL
LIMIT 5;
```

### 4. Check a specific task's full task_data:
```sql
SELECT 
  ct.id,
  ct.custom_name,
  tt.name as template_name,
  tt.evidence_types,
  tt.recurrence_pattern->'default_checklist_items' as template_checklist_items,
  ct.task_data
FROM checklist_tasks ct
JOIN task_templates tt ON ct.template_id = tt.id
WHERE ct.due_date = CURRENT_DATE
ORDER BY ct.created_at DESC
LIMIT 3;
```

## Expected Results

After the function runs, you should see:

1. **Tasks with checklist items**:
   - `task_data.checklistItems` should be an array of strings (for regular checklists)
   - OR `task_data.yesNoChecklistItems` should be an array of objects with `{text, answer}` (for yes/no checklists)

2. **Tasks with temperature evidence**:
   - `task_data.temperatures` should be an array of objects with `{assetId, temp, nickname}`
   - Should be initialized even if no temperatures are recorded yet

3. **Tasks with selected assets**:
   - `task_data.selectedAssets` should contain asset IDs
   - `task_data[repeatableFieldName]` should contain asset details if template has a repeatable field

## Troubleshooting

### No tasks created?
- Check if there are active `site_checklists` for today
- Check the edge function logs for errors
- Verify the function deployed successfully

### Tasks created but no features?
- Check if templates have `recurrence_pattern.default_checklist_items`
- Verify templates have `evidence_types` set correctly
- Check edge function logs for parsing errors

### Features partially populated?
- Check the template's `recurrence_pattern` structure
- Verify `evidence_types` array is correct
- Check if `equipment_config` is properly set in `site_checklists`

## Next Steps

Once verified:
1. The function will automatically run daily via cron job
2. New tasks will have all features populated correctly
3. Existing incomplete tasks will need to be regenerated (delete and let cron recreate them)
