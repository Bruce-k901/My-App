// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface TaskGenerationLog {
  run_date: Date;
  daily_tasks_created: number;
  weekly_tasks_created: number;
  monthly_tasks_created: number;
  triggered_tasks_created: number;
  errors: string[];
}

// Helper function to safely insert tasks and handle duplicate errors
// The unique constraint will prevent duplicates even if multiple instances run simultaneously
async function safeInsertTasks(
  supabase: any,
  tasks: any[],
  log: any,
  templateId: string,
  taskType: string
): Promise<number> {
  if (tasks.length === 0) return 0;

  const { error: insertError } = await supabase
    .from("checklist_tasks")
    .insert(tasks);

  if (insertError) {
    // Check if error is due to unique constraint violation (duplicate)
    // This can happen if another instance created the task between our check and insert
    if (insertError.code === '23505' || insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
      // Try to insert tasks one by one to see which ones succeed
      let successCount = 0;
      for (const task of tasks) {
        const { error: singleError } = await supabase
          .from("checklist_tasks")
          .insert(task);
        
        if (!singleError) {
          successCount++;
        } else if (singleError.code !== '23505' && !singleError.message.includes('duplicate') && !singleError.message.includes('unique')) {
          // Only log non-duplicate errors
          log.errors.push(
            `Failed to create ${taskType} task for template ${templateId}: ${singleError.message}`
          );
        }
      }
      return successCount;
    } else {
      // Other error - log it
      log.errors.push(
        `Failed to create ${taskType} task for template ${templateId}: ${insertError.message}`
      );
      return 0;
    }
  }
  
  return tasks.length;
}

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    // Accept both GET and POST requests
    if (req.method !== "POST" && req.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use GET or POST." }),
        { 
          status: 405,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Verify request has auth (for security)
    // Note: GET requests from scheduled cron jobs may not have auth headers
    // You can make auth optional for GET if needed, or require it for both
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      // For GET requests, we might want to allow without auth (if called by Supabase cron)
      // For POST requests, always require auth
      if (req.method === "POST") {
        return new Response(
          JSON.stringify({ error: "Unauthorized. POST requests require Authorization header." }),
          { 
            status: 401,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      // GET requests without auth are allowed (for cron scheduling)
    }

    const log: TaskGenerationLog = {
      run_date: new Date(),
      daily_tasks_created: 0,
      weekly_tasks_created: 0,
      monthly_tasks_created: 0,
      triggered_tasks_created: 0,
      errors: [],
    };

    // ===== STEP 1: Generate Daily Tasks =====
    // Generate tasks for ALL active templates:
    // 1. Global templates (company_id IS NULL) - library templates available to all companies
    // 2. Company-specific templates (company_id IS NOT NULL) - templates created by companies
    // Only generate for active templates - we'll filter by company_id when generating tasks per site
    const { data: dailyTemplates, error: dailyError } = await supabase
      .from("task_templates")
      .select("*")
      .eq("frequency", "daily")
      .eq("is_active", true);

    if (dailyError) {
      log.errors.push(`Failed to fetch daily templates: ${dailyError.message}`);
      return new Response(JSON.stringify(log), { status: 500 });
    }

    // For each daily template, generate tasks for all sites
    for (const template of dailyTemplates || []) {
      try {
        // CRITICAL: Fetch default repeatable labels and linked assets BEFORE generating tasks
        // This ensures task_data is populated correctly for the completion modal
        let defaultRepeatableData: any[] = []
        let selectedAssets: string[] = []
        
        // If template has a repeatable_field_name, fetch default repeatable labels
        if (template.repeatable_field_name) {
          const { data: repeatableLabels } = await supabase
            .from("template_repeatable_labels")
            .select("label, label_value, id")
            .eq("template_id", template.id)
            .eq("is_default", true)
            .order("display_order")
          
          if (repeatableLabels && repeatableLabels.length > 0) {
            // Format as array of objects with assetId or label info
            defaultRepeatableData = repeatableLabels.map(label => ({
              assetId: label.label_value || null,
              label: label.label,
              id: label.id
            }))
          }
        }
        
        // If template has a linked asset_id, include it in selectedAssets
        if (template.asset_id) {
          selectedAssets = [template.asset_id]
        }

        const { data: sites, error: sitesError } = await supabase
          .from("sites")
          .select("id, company_id")
          .or("status.is.null,status.neq.inactive");

        if (sitesError) {
          log.errors.push(`Failed to fetch sites: ${sitesError.message}`);
          continue;
        }

        // Filter sites if template is site-specific
        // Also filter by company_id if template is company-specific (not global)
        let targetSites = template.site_id
          ? sites?.filter((s) => s.id === template.site_id)
          : sites;
        
        // If template has a company_id, only generate tasks for sites in that company
        // If template is global (company_id IS NULL), generate for all companies
        if (template.company_id) {
          targetSites = targetSites?.filter((s) => s.company_id === template.company_id) || [];
        }

        for (const site of targetSites || []) {
          const today = new Date().toISOString().split("T")[0];

          // CRITICAL: Handle multiple dayparts AND multiple times - create one task per combination
          // Get dayparts from template (could be array or single value)
          let dayparts: string[] = []
          
          if (template.dayparts && Array.isArray(template.dayparts) && template.dayparts.length > 0) {
            dayparts = template.dayparts.filter(d => d && typeof d === 'string')
          } else if (template.daypart && typeof template.daypart === 'string') {
            // Handle single daypart or comma-separated
            dayparts = template.daypart.includes(',') 
              ? template.daypart.split(',').map(d => d.trim()).filter(d => d)
              : [template.daypart]
          }
          
          // Default to 'before_open' if no dayparts specified
          if (dayparts.length === 0) {
            dayparts = ['before_open']
          }

          // Get daypart-specific times from recurrence_pattern.daypart_times if available
          // Format: { "before_open": "06:00", "during_service": "12:00,15:00", "after_service": "18:00" }
          // OR: { "before_open": ["06:00"], "during_service": ["12:00", "15:00"] }
          const pattern = template.recurrence_pattern as { daypart_times?: Record<string, string | string[]> } | null
          const daypartTimes = pattern?.daypart_times || {}

          // Create one task for each daypart with its specific times
          const tasksToInsert: any[] = []
          
          dayparts.forEach((daypart) => {
            // Get times for this specific daypart
            let timesForDaypart: string[] = []
            const daypartTimeValue = daypartTimes[daypart]
            
            if (daypartTimeValue) {
              if (Array.isArray(daypartTimeValue)) {
                // Array format: ["18:00", "19:00", "22:00"]
                timesForDaypart = daypartTimeValue.filter(t => t && typeof t === 'string')
              } else if (typeof daypartTimeValue === 'string') {
                // String format: "18:00" or "18:00,19:00,22:00"
                if (daypartTimeValue.includes(',')) {
                  timesForDaypart = daypartTimeValue.split(',').map(t => t.trim()).filter(t => t)
                } else {
                  timesForDaypart = [daypartTimeValue.trim()]
                }
              }
            }
            
            // If no daypart-specific times, fall back to time_of_day or default
            if (timesForDaypart.length === 0) {
              if (template.time_of_day) {
                timesForDaypart = [template.time_of_day]
              } else {
                timesForDaypart = ['09:00'] // Default
              }
            }
            
            // Create one task for each time for this daypart
            timesForDaypart.forEach((time) => {
              // Build task_data with all required fields for completion modal
              // This must be inside the loop to include the specific time for each task
              const taskData: any = {
                dayparts: dayparts, // Store all dayparts for reference
                daypart_times: daypartTimes, // Store daypart_times mapping for reference
                daypart: daypart, // Store which daypart this task is for
                time: time, // Store which time this task is for
                // Auto-populate checklist items from template if available
                checklistItems: (template.recurrence_pattern as any)?.default_checklist_items || []
              }
              
              // CRITICAL: Include repeatable field data if template has repeatable_field_name
              // This matches how manual task creation stores data
              if (template.repeatable_field_name && defaultRepeatableData.length > 0) {
                taskData[template.repeatable_field_name] = defaultRepeatableData
              }
              
              // CRITICAL: Include selected assets if template has linked assets
              // This ensures the completion modal can load asset details
              if (selectedAssets.length > 0) {
                (taskData as any).selectedAssets = selectedAssets
              }
              
              tasksToInsert.push({
                template_id: template.id,
                company_id: site.company_id,
                site_id: site.id,
                due_date: today,
                due_time: time, // Use the specific time for this daypart
                daypart: daypart, // Set specific daypart for this instance
                assigned_to_role: template.assigned_to_role,
                assigned_to_user_id: template.assigned_to_user_id,
                status: "pending",
                priority: template.is_critical ? "critical" : "medium",
                generated_at: new Date(),
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires tomorrow
                // Store metadata in task_data for consistency
                task_data: taskData
              })
            })
          })

          // Check for existing tasks to avoid duplicates
          // Check by combination of daypart AND due_time
          const existingTasks = await supabase
            .from("checklist_tasks")
            .select("id, daypart, due_time")
            .eq("template_id", template.id)
            .eq("site_id", site.id)
            .eq("due_date", today)

          const existingCombinations = new Set(
            (existingTasks.data || []).map(t => 
              `${t.daypart || ''}|${t.due_time || ''}`
            ).filter(Boolean)
          )

          // Filter out tasks that already exist for this daypart+time combination
          const newTasksToInsert = tasksToInsert.filter(
            task => !existingCombinations.has(`${task.daypart || ''}|${task.due_time || ''}`)
          )

          if (newTasksToInsert.length === 0) {
            continue // All tasks already exist
          }

          // Insert all new tasks using safe insert helper
          // The unique constraint will prevent duplicates even if multiple instances run simultaneously
          const insertedCount = await safeInsertTasks(
            supabase,
            newTasksToInsert,
            log,
            template.id,
            'daily'
          );
          log.daily_tasks_created += insertedCount;
        }
      } catch (e) {
        log.errors.push(`Error processing daily template: ${e}`);
      }
    }

    // ===== STEP 2: Generate Weekly Tasks =====
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc

    const { data: weeklyTemplates, error: weeklyError } = await supabase
      .from("task_templates")
      .select("*")
      .eq("frequency", "weekly")
      .eq("is_active", true);

    if (weeklyError) {
      log.errors.push(`Failed to fetch weekly templates: ${weeklyError.message}`);
    }

    for (const template of weeklyTemplates || []) {
      try {
        // Check if this template should run today (based on recurrence_pattern)
        // Weekly templates use 'days' array in recurrence_pattern (e.g., [1, 3, 5] for Mon, Wed, Fri)
        const pattern = template.recurrence_pattern as {
          days?: number[]; // Array of day numbers (0=Sunday, 1=Monday, etc.)
        } | null;

        // Default: run on Monday (1)
        const targetDays = pattern?.days || [1];

        if (!targetDays.includes(dayOfWeek)) {
          continue; // Not today
        }

        // CRITICAL: Fetch default repeatable labels and linked assets BEFORE generating tasks
        let defaultRepeatableData: any[] = []
        let selectedAssets: string[] = []
        
        if (template.repeatable_field_name) {
          const { data: repeatableLabels } = await supabase
            .from("template_repeatable_labels")
            .select("label, label_value, id")
            .eq("template_id", template.id)
            .eq("is_default", true)
            .order("display_order")
          
          if (repeatableLabels && repeatableLabels.length > 0) {
            defaultRepeatableData = repeatableLabels.map(label => ({
              assetId: label.label_value || null,
              label: label.label,
              id: label.id
            }))
          }
        }
        
        if (template.asset_id) {
          selectedAssets = [template.asset_id]
        }

        // Same logic as daily: create tasks for all sites
        const { data: sites } = await supabase
          .from("sites")
          .select("id, company_id")
          .or("status.is.null,status.neq.inactive");

        let targetSites = template.site_id
          ? sites?.filter((s) => s.id === template.site_id)
          : sites;
        
        // If template has a company_id, only generate tasks for sites in that company
        if (template.company_id) {
          targetSites = targetSites?.filter((s) => s.company_id === template.company_id) || [];
        }

        for (const site of targetSites || []) {
          const today = new Date().toISOString().split("T")[0];

          // CRITICAL: Handle multiple dayparts - create one task per daypart
          // Get dayparts from template (could be array or single value)
          let dayparts: string[] = []
          
          if (template.dayparts && Array.isArray(template.dayparts) && template.dayparts.length > 0) {
            dayparts = template.dayparts.filter(d => d && typeof d === 'string')
          } else if (template.daypart && typeof template.daypart === 'string') {
            // Handle single daypart or comma-separated
            dayparts = template.daypart.includes(',') 
              ? template.daypart.split(',').map(d => d.trim()).filter(d => d)
              : [template.daypart]
          }
          
          // Default to 'anytime' if no dayparts specified
          if (dayparts.length === 0) {
            dayparts = ['anytime']
          }

          // Check for existing tasks to avoid duplicates
          const existingTasks = await supabase
            .from("checklist_tasks")
            .select("id, daypart")
            .eq("template_id", template.id)
            .eq("site_id", site.id)
            .eq("due_date", today)

          const existingDayparts = new Set(
            (existingTasks.data || []).map(t => t.daypart).filter(Boolean)
          )

          // Create one task for each daypart
          const tasksToInsert = dayparts
            .filter(daypart => !existingDayparts.has(daypart)) // Filter out existing
            .map((daypart, index) => {
              // Build task_data with all required fields
              const taskData: any = {
                dayparts: dayparts,
                original_daypart_index: index,
                checklistItems: (template.recurrence_pattern as any)?.default_checklist_items || []
              }
              
              // Include repeatable field data if available
              if (template.repeatable_field_name && defaultRepeatableData.length > 0) {
                taskData[template.repeatable_field_name] = defaultRepeatableData
              }
              
              // Include selected assets if available
              if (selectedAssets.length > 0) {
                (taskData as any).selectedAssets = selectedAssets
              }
              
              return {
                template_id: template.id,
                company_id: site.company_id,
                site_id: site.id,
                due_date: today,
                due_time: template.time_of_day,
                daypart: daypart,
                assigned_to_role: template.assigned_to_role,
                status: "pending",
                priority: template.is_critical ? "critical" : "medium",
                generated_at: new Date(),
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 1 week
                task_data: taskData
              }
            })

          if (tasksToInsert.length === 0) {
            continue // All tasks already exist
          }

          // Insert all new tasks using safe insert helper
          const insertedCount = await safeInsertTasks(
            supabase,
            tasksToInsert,
            log,
            template.id,
            'weekly'
          );
          log.weekly_tasks_created += insertedCount;
        }
      } catch (e) {
        log.errors.push(`Error processing weekly template: ${e}`);
      }
    }

    // ===== STEP 3: Generate Monthly Tasks =====
    const dateOfMonth = new Date().getDate();

    const { data: monthlyTemplates, error: monthlyError } = await supabase
      .from("task_templates")
      .select("*")
      .eq("frequency", "monthly")
      .eq("is_active", true);

    if (monthlyError) {
      log.errors.push(
        `Failed to fetch monthly templates: ${monthlyError.message}`
      );
    }

    for (const template of monthlyTemplates || []) {
      try {
        // Check if this template should run today (based on date of month)
        const pattern = template.recurrence_pattern as {
          date_of_month?: number;
        } | null;

        // Default: run on 1st of month
        const targetDate = pattern?.date_of_month || 1;

        if (dateOfMonth !== targetDate) {
          continue; // Not today
        }

        // CRITICAL: Fetch default repeatable labels and linked assets BEFORE generating tasks
        let defaultRepeatableData: any[] = []
        let selectedAssets: string[] = []
        
        if (template.repeatable_field_name) {
          const { data: repeatableLabels } = await supabase
            .from("template_repeatable_labels")
            .select("label, label_value, id")
            .eq("template_id", template.id)
            .eq("is_default", true)
            .order("display_order")
          
          if (repeatableLabels && repeatableLabels.length > 0) {
            defaultRepeatableData = repeatableLabels.map(label => ({
              assetId: label.label_value || null,
              label: label.label,
              id: label.id
            }))
          }
        }
        
        if (template.asset_id) {
          selectedAssets = [template.asset_id]
        }

        // Create tasks for all sites
        const { data: sites } = await supabase
          .from("sites")
          .select("id, company_id")
          .or("status.is.null,status.neq.inactive");

        let targetSites = template.site_id
          ? sites?.filter((s) => s.id === template.site_id)
          : sites;
        
        // If template has a company_id, only generate tasks for sites in that company
        if (template.company_id) {
          targetSites = targetSites?.filter((s) => s.company_id === template.company_id) || [];
        }

        for (const site of targetSites || []) {
          const today = new Date().toISOString().split("T")[0];

          const { data: existingTask } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("template_id", template.id)
            .eq("site_id", site.id)
            .eq("due_date", today)
            .single();

          // CRITICAL: Handle multiple dayparts - create one task per daypart
          // Get dayparts from template (could be array or single value)
          let dayparts: string[] = []
          
          if (template.dayparts && Array.isArray(template.dayparts) && template.dayparts.length > 0) {
            dayparts = template.dayparts.filter(d => d && typeof d === 'string')
          } else if (template.daypart && typeof template.daypart === 'string') {
            // Handle single daypart or comma-separated
            dayparts = template.daypart.includes(',') 
              ? template.daypart.split(',').map(d => d.trim()).filter(d => d)
              : [template.daypart]
          }
          
          // Default to 'anytime' if no dayparts specified
          if (dayparts.length === 0) {
            dayparts = ['anytime']
          }

          // Handle daypart times for monthly tasks (same as daily/weekly)
          const patternForTimes = template.recurrence_pattern as { daypart_times?: Record<string, string | string[]> } | null
          const daypartTimes = patternForTimes?.daypart_times || {}

          // Create one task for each daypart with its specific times
          const tasksToInsert: any[] = []
          
          dayparts.forEach((daypart) => {
            // Get times for this specific daypart
            let timesForDaypart: string[] = []
            const daypartTimeValue = daypartTimes[daypart]
            
            if (daypartTimeValue) {
              if (Array.isArray(daypartTimeValue)) {
                timesForDaypart = daypartTimeValue.filter(t => t && typeof t === 'string')
              } else if (typeof daypartTimeValue === 'string') {
                if (daypartTimeValue.includes(',')) {
                  timesForDaypart = daypartTimeValue.split(',').map(t => t.trim()).filter(t => t)
                } else {
                  timesForDaypart = [daypartTimeValue.trim()]
                }
              }
            }
            
            // If no daypart-specific times, fall back to time_of_day or default
            if (timesForDaypart.length === 0) {
              if (template.time_of_day) {
                timesForDaypart = [template.time_of_day]
              } else {
                timesForDaypart = ['09:00'] // Default
              }
            }
            
            // Create one task for each time for this daypart
            timesForDaypart.forEach((time) => {
              // Build task_data with all required fields
              const taskData: any = {
                dayparts: dayparts,
                daypart_times: daypartTimes,
                daypart: daypart,
                time: time,
                checklistItems: (template.recurrence_pattern as any)?.default_checklist_items || []
              }
              
              // Include repeatable field data if available
              if (template.repeatable_field_name && defaultRepeatableData.length > 0) {
                taskData[template.repeatable_field_name] = defaultRepeatableData
              }
              
              // Include selected assets if available
              if (selectedAssets.length > 0) {
                (taskData as any).selectedAssets = selectedAssets
              }
              
              tasksToInsert.push({
                template_id: template.id,
                company_id: site.company_id,
                site_id: site.id,
                due_date: today,
                due_time: time,
                daypart: daypart,
                assigned_to_role: template.assigned_to_role,
                assigned_to_user_id: template.assigned_to_user_id,
                status: "pending",
                priority: template.is_critical ? "critical" : "medium",
                generated_at: new Date(),
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
                task_data: taskData
              })
            })
          })

          // Check for existing tasks to avoid duplicates
          // Check by combination of daypart AND due_time
          const existingTasks = await supabase
            .from("checklist_tasks")
            .select("id, daypart, due_time")
            .eq("template_id", template.id)
            .eq("site_id", site.id)
            .eq("due_date", today)

          const existingCombinations = new Set(
            (existingTasks.data || []).map(t => 
              `${t.daypart || ''}|${t.due_time || ''}`
            ).filter(Boolean)
          )

          // Filter out tasks that already exist for this daypart+time combination
          const newTasksToInsert = tasksToInsert.filter(
            task => !existingCombinations.has(`${task.daypart || ''}|${task.due_time || ''}`)
          )

          if (newTasksToInsert.length === 0) {
            continue // All tasks already exist
          }

          // Insert all new tasks using safe insert helper
          const insertedCount = await safeInsertTasks(
            supabase,
            newTasksToInsert,
            log,
            template.id,
            'monthly'
          );
          log.monthly_tasks_created += insertedCount;
        }
      } catch (e) {
        log.errors.push(`Error processing monthly template: ${e}`);
      }
    }

    // ===== STEP 4: Generate Triggered Tasks (PPM Due) =====
    // Example: Equipment PPM is due if last_ppm_date is > 6 months ago

    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: overdueAssets, error: assetsError } = await supabase
        .from("assets")
        .select("id, site_id, company_id, type")
        .lt("last_ppm_date", sixMonthsAgo.toISOString())
        .eq("ppm_required", true);

      if (assetsError) {
        log.errors.push(`Failed to fetch overdue assets: ${assetsError.message}`);
      }

      // Find PPM template for each asset type
      for (const asset of overdueAssets || []) {
        const { data: ppmTemplate } = await supabase
          .from("task_templates")
          .select("*")
          .eq("frequency", "triggered")
          .eq("asset_type", asset.type)
          .eq("is_active", true)  // This is for task_templates, which does have is_active
          .single();

        if (ppmTemplate) {
          const today = new Date().toISOString().split("T")[0];

          // Check if task already exists
          const { data: existingTask } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("template_id", ppmTemplate.id)
            .eq("asset_id", asset.id)
            .eq("due_date", today)
            .single();

          if (!existingTask) {
            const insertedCount = await safeInsertTasks(
              supabase,
              [{
                template_id: ppmTemplate.id,
                company_id: asset.company_id,
                site_id: asset.site_id,
                asset_id: asset.id,
                due_date: today,
                status: "pending",
                priority: "high",
                generated_at: new Date(),
              }],
              log,
              ppmTemplate.id,
              'triggered'
            );
            log.triggered_tasks_created += insertedCount;
          }
        }
      }
    } catch (e) {
      log.errors.push(`Error processing triggered tasks: ${e}`);
    }

    // ===== STEP 5: Generate Training Certificate Renewal Tasks =====
    try {
      const { data: certTaskCount, error: certError } = await supabase.rpc(
        "create_training_certificate_renewal_tasks"
      );

      if (certError) {
        log.errors.push(`Failed to create training certificate renewal tasks: ${certError.message}`);
      } else {
        // Note: The function returns the count, but we don't have a separate counter for it
        // We could add training_certificate_tasks_created to the log if needed
        console.log(`Created ${certTaskCount || 0} training certificate renewal tasks`);
      }
    } catch (e) {
      log.errors.push(`Error processing training certificate renewal tasks: ${e}`);
    }

    // ===== STEP 6: Clean Up Expired Tasks =====
    const { error: cleanupError } = await supabase
      .from("checklist_tasks")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .eq("status", "pending"); // Only delete pending tasks

    if (cleanupError) {
      log.errors.push(`Failed to cleanup expired tasks: ${cleanupError.message}`);
    }

    // Log the run for debugging
    console.log("Task generation completed:", log);

    return new Response(JSON.stringify(log), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Task generation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
});
