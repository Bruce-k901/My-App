# Multiple Daypart Task Behavior - Expected vs Actual

## 🎯 Your Expected Behavior

When creating a task from the **Fridge/Freezer Temperature Check** template (which has 3 dayparts: `before_open`, `during_service`, `after_service`):

- **Active Tasks Page**: Should show **1 task**
- **Today's Tasks Page**: Should show **3 instances** (one for each daypart)

## 📊 Current Implementation

### Task Creation (TaskFromTemplateModal)

When you create a task manually from a template with multiple dayparts:

```1191:1217:src/components/templates/TaskFromTemplateModal.tsx
        // Use first daypart for backward compatibility (single daypart field)
        const primaryDaypart = formData.dayparts && formData.dayparts.length > 0
          ? formData.dayparts[0].daypart
          : formData.daypart || null;
        const primaryDueTime = formData.dayparts && formData.dayparts.length > 0
          ? formData.dayparts[0].due_time
          : formData.due_time || null;

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

**What happens:**

- Creates **1 task record** in database
- Sets `daypart` to the **first daypart** (e.g., `before_open`)
- Stores **all dayparts** in `task_data.dayparts` array
- Sets `due_time` to the first daypart's time

### Task Display (Today's Tasks Page)

The Today's Tasks page has expansion logic:

```295:478:src/app/dashboard/checklists/page.tsx
      // CRITICAL: Handle tasks with multiple dayparts
      // IMPORTANT: The cron job already creates separate task records for each daypart.
      // So if a task has a daypart field set, it's already a single instance - don't expand it.
      // Only expand if the task has NO daypart but has multiple dayparts in task_data or template.
      // Use validTasks instead of tasksWithTemplates to exclude orphaned tasks
      let expandedTasks: ChecklistTaskWithTemplate[] = []

      // Helper function to normalize daypart names (handle legacy/invalid dayparts)
      const normalizeDaypart = (daypart: string | null | undefined): string => {
        if (!daypart || typeof daypart !== 'string') {
          return 'anytime' // Default if null/undefined
        }
        const normalized = daypart.toLowerCase().trim()
        // Map common variations to standard dayparts
        const daypartMap: Record<string, string> = {
          'afternoon': 'during_service',
          'morning': 'before_open',
          'evening': 'after_service',
          'night': 'after_service',
          'lunch': 'during_service',
          'dinner': 'during_service'
        }
        return daypartMap[normalized] || normalized
      }

      // Helper function to get default time for daypart
      // IMPORTANT: Only override time if task doesn't have a specific time set
      // If task has a due_time already, preserve it (user-specified times take precedence)
      const getDaypartTime = (daypart: string, templateTime: string | null, existingTime: string | null): string => {
        // If task already has a specific time, use it (don't override user-specified times)
        if (existingTime && existingTime.trim() !== '') {
          // Convert to HH:MM format if needed (remove seconds)
          const timeStr = existingTime.includes(':') ? existingTime.split(':').slice(0, 2).join(':') : existingTime
          return timeStr
        }

        // Normalize daypart first
        const normalizedDaypart = normalizeDaypart(daypart)

        // If template has a specific time, use it as base
        // Otherwise, use default times per daypart
        const defaultTimes: Record<string, string> = {
          'before_open': '08:00',
          'during_service': '12:00',
          'after_service': '18:00',
          'anytime': templateTime || '09:00'
        }

        // If template has a time, try to adjust it based on daypart
        if (templateTime) {
          const [hours, minutes] = templateTime.split(':').map(Number)

          // Adjust based on daypart if needed
          if (normalizedDaypart === 'before_open' && hours >= 9) {
            return '08:00' // Earlier for before open
          } else if (normalizedDaypart === 'during_service' && hours < 11) {
            return '12:00' // Midday for during service
          } else if (normalizedDaypart === 'after_service' && hours < 17) {
            return '18:00' // Evening for after service
          }

          // Use template time if it's already appropriate
          return templateTime
        }

        return defaultTimes[normalizedDaypart] || '09:00'
      }

      validTasks.forEach(task => {
        // If task already has a daypart set, it's already a separate instance from cron generation
        // Use it as-is, but ensure it has the correct time for its daypart
        if (task.daypart && typeof task.daypart === 'string') {
          const daypartStr = normalizeDaypart(task.daypart) // Normalize daypart
          const templateTime = task.template?.time_of_day || null
          // Preserve existing time if set, otherwise calculate based on daypart
          const daypartTime = getDaypartTime(daypartStr, templateTime, task.due_time)

          console.log('🕐 Setting daypart time:', {
            taskId: task.id,
            originalDaypart: task.daypart,
            normalizedDaypart: daypartStr,
            originalTime: task.due_time,
            templateTime: templateTime,
            calculatedTime: daypartTime,
            preservingTime: task.due_time ? 'yes' : 'no'
          })

          // Preserve existing time if task has one, otherwise use daypart-based time
          expandedTasks.push({
            ...task,
            daypart: daypartStr, // Store normalized daypart
            due_time: daypartTime, // Use existing time if set, otherwise calculated
            _expandedKey: `${task.id}_${daypartStr}`
          })
          return // Skip expansion for this task
        }

        // Task doesn't have daypart set - check if it needs expansion
        // This handles legacy tasks or manually created tasks without daypart
        let dayparts: string[] = []

        // Priority 1: Check task_data for dayparts
        if (task.task_data && typeof task.task_data === 'object') {
          if (task.task_data.dayparts && Array.isArray(task.task_data.dayparts)) {
            dayparts = task.task_data.dayparts
```

**The Problem:**

The expansion logic at line 364-390 checks:

```typescript
if (task.daypart && typeof task.daypart === "string") {
  // Task already has daypart - use as-is, don't expand
  expandedTasks.push({ ...task });
  return; // Skip expansion
}
```

**This means:**

- If a manually created task has `daypart` set to `before_open` (the first daypart)
- The expansion logic sees it has a daypart and **skips expansion**
- It only shows **1 task** instead of **3**

## 🔧 The Issue

**Current behavior:**

- Manual task creation sets `daypart` to the first daypart
- Today's Tasks sees `task.daypart` is set and doesn't expand
- Result: Only 1 task shown instead of 3

**Expected behavior:**

- Manual task creation should either:
  1. **Option A**: Create multiple task records (one per daypart) - like the cron job does
  2. **Option B**: Not set `daypart` field, only store in `task_data.dayparts`, so expansion works

## ✅ Solution Options

### Option 1: Create Multiple Task Records (Recommended)

Modify `TaskFromTemplateModal` to create one task record per daypart (like the cron job does):

```typescript
// Instead of creating 1 task, loop through dayparts and create multiple
if (formData.dayparts && formData.dayparts.length > 0) {
  const tasksToInsert = formData.dayparts.map((dp: { daypart: string; due_time: string }) => ({
    template_id: templateId,
    company_id: companyId,
    site_id: siteId,
    due_date: formData.due_date,
    due_time: dp.due_time || null,
    daypart: dp.daypart,
    custom_name: formData.custom_name.trim(),
    custom_instructions: instructions,
    status: "pending",
    priority: formData.priority,
    task_data: { ...taskData, daypart: dp.daypart }, // Store which daypart this instance is for
  }));

  const { data, error } = await supabase.from("checklist_tasks").insert(tasksToInsert).select();
} else {
  // Single daypart - create one task
  // ... existing code ...
}
```

**Result:**

- Active Tasks: Shows 3 separate tasks (one per daypart)
- Today's Tasks: Shows 3 tasks (one per daypart)

### Option 2: Fix Expansion Logic

Modify the expansion logic to check if task has multiple dayparts in `task_data` even if `daypart` field is set:

```typescript
validTasks.forEach(task => {
  // Check if task has multiple dayparts in task_data
  const taskData = task.task_data || {}
  const daypartsInData = taskData.dayparts || []

  // If task has daypart set BUT also has multiple dayparts in task_data, expand it
  if (task.daypart && daypartsInData.length > 1) {
    // Expand into multiple instances
    daypartsInData.forEach((dp: any) => {
      const daypartStr = typeof dp === 'string' ? dp : dp.daypart
      const daypartTime = typeof dp === 'object' && dp.due_time ? dp.due_time : getDaypartTime(daypartStr, ...)
      expandedTasks.push({
        ...task,
        daypart: daypartStr,
        due_time: daypartTime,
        _expandedKey: `${task.id}_${daypartStr}`
      })
    })
    return
  }

  // Existing logic for single daypart tasks...
})
```

**Result:**

- Active Tasks: Shows 1 task
- Today's Tasks: Shows 3 expanded instances

## 🧪 Testing Steps

1. **Create task from Fridge/Freezer template:**
   - Go to Compliance or Templates page
   - Click on "Fridge/Freezer Temperature Check" template
   - Fill in the form (should show 3 dayparts)
   - Save

2. **Check Active Tasks:**
   - Go to `/dashboard/tasks/active`
   - Count how many tasks appear

3. **Check Today's Tasks:**
   - Go to `/dashboard/checklists` (Today's Tasks)
   - Count how many instances appear
   - Should see 3 separate task cards (one per daypart)

4. **Verify in Database:**
   ```sql
   SELECT
     id,
     daypart,
     due_time,
     task_data->'dayparts' as dayparts_in_data
   FROM checklist_tasks
   WHERE template_id = (SELECT id FROM task_templates WHERE slug = 'fridge-freezer-temperature-check')
   ORDER BY created_at DESC
   LIMIT 5;
   ```

## 📝 Recommendation

I recommend **Option 1** (create multiple task records) because:

- Matches the behavior of automatic task generation (cron job)
- Each daypart instance is a separate database record (easier to track completion)
- Active Tasks will show all instances (more accurate)
- Simpler logic (no expansion needed)

Would you like me to implement Option 1?
