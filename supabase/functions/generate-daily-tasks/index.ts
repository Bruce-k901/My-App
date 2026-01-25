// ============================================================================
// REBUILT EDGE FUNCTION: generate-daily-tasks
// ============================================================================
// STRICT MODE: Only generates tasks from existing operational data.
// NO SCHEDULED TEMPLATES.
// Sources:
// 1. My Tasks / Messages (tasks table)
// 2. Manager Calendar/Diary (profile_settings table)
// 3. PPM Upcoming (ppm_schedule table)
// 4. SOP Reviews (sop_entries table)
// 5. RA Reviews (risk_assessments table)
// 6. Document Expiry (global_documents table)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Global lock to prevent concurrent executions
let isRunning = false;

Deno.serve(async (req) => {
  // Prevent concurrent executions
  if (isRunning) {
    return new Response(
      JSON.stringify({ 
        message: "Task generation already in progress. Please wait.",
        skipped: true 
      }),
      { 
        status: 409, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }

  isRunning = true;
  
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const log = {
      general_tasks_synced: 0,
      calendar_tasks_created: 0,
      ppm_tasks_created: 0,
      sop_review_tasks_created: 0,
      ra_review_tasks_created: 0,
      document_expiry_tasks_created: 0,
      errors: [] as string[],
    };

    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    
    console.log(`[${new Date().toISOString()}] Starting task generation for ${todayString}`);

    // ========================================================================
    // 1. GENERAL TASKS (from tasks table)
    // ========================================================================
    // Syncs tasks from 'My Tasks', 'Messages', etc. that are due TODAY.

    try {
      const { data: generalTasks, error: tasksError } = await supabase
        .from("tasks")
        .select(
          "id, name, company_id, site_id, due_date, assigned_to, status, created_from_message_id, notes, linked_asset_id",
        )
        .eq("due_date", todayString)
        .in("status", ["todo", "pending", "in_progress"]);

      if (tasksError) throw tasksError;

      if (generalTasks && generalTasks.length > 0) {
        // Get generic template
        let { data: genericTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "general-task-generic")
          .single();

        for (const task of generalTasks) {
          // Check for existing - use more comprehensive check
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("site_id", task.site_id)
            .eq("company_id", task.company_id)
            .eq("due_date", todayString)
            .or(`task_data->>source_id.eq.${task.id},task_data->>original_task_id.eq.${task.id}`)
            .limit(1);

          if (existing && existing.length > 0) {
            console.log(`Skipping duplicate general task: ${task.id}`);
            continue;
          }

          const sourceType = task.created_from_message_id
            ? "messaging_task"
            : "general_task";

          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: genericTemplate?.id || null,
            company_id: task.company_id,
            site_id: task.site_id,
            custom_name: task.name,
            custom_instructions: task.notes || null,
            due_date: todayString,
            due_time: null,
            daypart: "anytime",
            status: task.status === "in_progress" ? "in_progress" : "pending",
            assigned_to_user_id: task.assigned_to || null,
            generated_at: today.toISOString(),
            task_data: {
              source_type: sourceType,
              source_id: task.id,
              original_task_id: task.id,
              created_from_message_id: task.created_from_message_id || null,
              linked_asset_id: task.linked_asset_id || null,
            },
          });

          if (!error) log.general_tasks_synced++;
        }
      }
    } catch (e) {
      log.errors.push(`Error processing general tasks: ${e}`);
    }

    // ========================================================================
    // 2. MANAGER CALENDAR / DIARY (from profile_settings)
    // ========================================================================
    // Syncs tasks created in the Manager Calendar for TODAY.

    try {
      const calendarKey = `handover:${todayString}`;

      const { data: calendarEntries, error: calendarError } = await supabase
        .from("profile_settings")
        .select("company_id, value")
        .eq("key", calendarKey);

      if (calendarError) throw calendarError;

      if (calendarEntries && calendarEntries.length > 0) {
        // Get generic template
        let { data: calendarTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "calendar-task-generic")
          .single();

        for (const entry of calendarEntries) {
          const data = typeof entry.value === "string"
            ? JSON.parse(entry.value)
            : entry.value;

          if (data.tasks && Array.isArray(data.tasks)) {
            for (const calTask of data.tasks) {
              // calTask structure: { id, title, dueDate, dueTime, assignedTo, priority }

              // Verify it's for today (double check)
              if (calTask.dueDate !== todayString) continue;

              // Check for existing - use more comprehensive check
              const { data: existing } = await supabase
                .from("checklist_tasks")
                .select("id")
                .eq("company_id", entry.company_id)
                .eq("due_date", todayString)
                .eq("task_data->>source_type", "calendar_task")
                .eq("task_data->>calendar_task_id", calTask.id)
                .limit(1);

              if (existing && existing.length > 0) {
                console.log(`Skipping duplicate calendar task: ${calTask.id}`);
                continue;
              }

              // Create task
              const { error } = await supabase.from("checklist_tasks").insert({
                template_id: calendarTemplate?.id || null,
                company_id: entry.company_id,
                site_id: null, // Calendar tasks might not be site specific unless we infer it?
                custom_name: calTask.title,
                due_date: todayString,
                due_time: calTask.dueTime || null,
                daypart: "anytime",
                status: "pending",
                priority: calTask.priority || "medium",
                assigned_to_user_id: calTask.assignedTo || null,
                generated_at: today.toISOString(),
                task_data: {
                  source_type: "calendar_task",
                  calendar_task_id: calTask.id,
                  created_from_calendar: true,
                },
              });

              if (!error) log.calendar_tasks_created++;
            }
          }
        }
      }
    } catch (e) {
      log.errors.push(`Error processing calendar tasks: ${e}`);
    }

    // ========================================================================
    // 3. PPM UPCOMING (from ppm_schedule)
    // ========================================================================
    // Generates tasks for PPMs due TODAY.

    try {
      // Query ppm_schedule and join with assets to filter archived assets
      const { data: ppmTasks, error: ppmError } = await supabase
        .from("ppm_schedule")
        .select(`
          id, 
          asset_id, 
          next_service_date, 
          status,
          assets!inner (
            id,
            name,
            site_id,
            company_id,
            archived
          )
        `)
        .eq("next_service_date", todayString)
        .eq("status", "upcoming"); // Only upcoming tasks

      if (ppmError) throw ppmError;

      if (ppmTasks && ppmTasks.length > 0) {
        // Get generic template
        let { data: ppmTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "ppm-service-generic")
          .single();

        // Filter out archived assets - extract assets from joined data and filter
        const assets = ppmTasks
          .map((t: any) => t.assets)
          .filter((a: any) => a && !a.archived);
        
        // Filter ppmTasks to only include those with non-archived assets
        const filteredPpmTasks = ppmTasks.filter((ppm: any) => {
          const asset = ppm.assets;
          return asset && !asset.archived;
        });

        const assetMap = new Map(assets.map((a: any) => [a.id, a]));

        // Get site GM assignments for PPM tasks
        const ppmSiteIds = [...new Set(assets.map((a: any) => a.site_id))];
        const { data: ppmSites } = await supabase
          .from("sites")
          .select("id, gm_user_id")
          .in("id", ppmSiteIds);
        const ppmSiteGmMap = new Map(
          ppmSites?.map((s) => [s.id, s.gm_user_id]),
        );

        // Process only filtered PPM tasks (non-archived assets)
        for (const ppm of filteredPpmTasks) {
          // Asset is now nested in the ppm object from the join
          const asset = (ppm as any).assets;
          // Skip if asset not found (shouldn't happen due to filter, but double-check)
          if (!asset) continue;

          // Get site GM for assignment
          const assignedToUserId = ppmSiteGmMap.get(asset.site_id) || null;

          // Check existing - use more comprehensive check
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("site_id", asset.site_id)
            .eq("company_id", asset.company_id)
            .eq("due_date", todayString)
            .eq("task_data->>source_type", "ppm_service")
            .eq("task_data->>ppm_id", ppm.id)
            .limit(1);

          if (existing && existing.length > 0) {
            console.log(`Skipping duplicate PPM task: ${ppm.id}`);
            continue;
          }

          // Ensure we have an assigned user - try site GM, then company admin
          let finalAssignedUserId = assignedToUserId;
          if (!finalAssignedUserId) {
            // Try to get company admin/owner
            const { data: adminUser } = await supabase
              .from("profiles")
              .select("id")
              .eq("company_id", asset.company_id)
              .in("app_role", ["Admin", "Owner"])
              .limit(1)
              .single();
            finalAssignedUserId = adminUser?.id || null;
          }

          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: ppmTemplate?.id || null,
            company_id: asset.company_id,
            site_id: asset.site_id,
            custom_name: `PPM Required: ${asset.name}`, // Changed to match your format
            due_date: todayString,
            daypart: "anytime",
            due_time: "09:00", // Add default due_time
            assigned_to_user_id: finalAssignedUserId, // Always assign to someone
            status: "pending",
            priority: "high",
            generated_at: today.toISOString(),
            task_data: {
              source_type: "ppm_service",
              ppm_id: ppm.id,
              asset_id: asset.id,
            },
          });

          if (!error) log.ppm_tasks_created++;
        }
      }
    } catch (e) {
      log.errors.push(`Error processing PPM tasks: ${e}`);
    }

    // ========================================================================
    // 4. SOP REVIEWS (from sop_entries)
    // ========================================================================
    // Generates tasks for SOPs with review_date = TODAY (or 30 days warning)

    try {
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysString = thirtyDaysFromNow.toISOString().split("T")[0];

      // We need to check JSON data for review_date usually, or a column if it exists.
      // Assuming 'sop_data->review_date' based on previous code.

      const { data: sops, error: sopError } = await supabase
        .from("sop_entries")
        .select("id, title, ref_code, company_id, site_id, sop_data")
        .eq("status", "Published")
        .neq("status", "Archived"); // Exclude archived SOPs

      if (sopError) throw sopError;

      if (sops) {
        let { data: sopTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "sop-review-generic")
          .single();

        for (const sop of sops) {
          const reviewDateStr = (sop.sop_data as any)?.review_date;
          if (!reviewDateStr) continue;

          const reviewDate = new Date(reviewDateStr);
          const daysUntil = Math.ceil(
            (reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          );

          // Trigger if due within 30 days (so they have time to do it)
          if (daysUntil < 0 || daysUntil > 30) continue;

          // Check existing - use more comprehensive check
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("company_id", sop.company_id)
            .eq("site_id", sop.site_id)
            .eq("due_date", todayString)
            .eq("task_data->>source_type", "sop_review")
            .eq("task_data->>sop_id", sop.id)
            .limit(1);

          if (existing && existing.length > 0) {
            console.log(`Skipping duplicate SOP review task: ${sop.id}`);
            continue;
          }

          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: sopTemplate?.id || null,
            company_id: sop.company_id,
            site_id: sop.site_id,
            custom_name: `SOP Review Due: ${sop.title}`,
            due_date: todayString, // Appears in today's list
            daypart: "anytime",
            status: "pending",
            priority: "medium",
            generated_at: today.toISOString(),
            task_data: {
              source_type: "sop_review",
              sop_id: sop.id,
              review_date: reviewDateStr,
              days_until_due: daysUntil,
            },
          });

          if (!error) log.sop_review_tasks_created++;
        }
      }
    } catch (e) {
      log.errors.push(`Error processing SOP tasks: ${e}`);
    }

    // ========================================================================
    // 5. RA REVIEWS (from risk_assessments)
    // ========================================================================

    try {
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysString = thirtyDaysFromNow.toISOString().split("T")[0];

      const { data: ras, error: raError } = await supabase
        .from("risk_assessments")
        .select("id, title, ref_code, company_id, site_id, next_review_date")
        .eq("status", "Published")
        .neq("status", "Archived") // Exclude archived risk assessments
        .lte("next_review_date", thirtyDaysString)
        .gte("next_review_date", todayString);

      if (raError) throw raError;

      if (ras && ras.length > 0) {
        let { data: raTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "ra-review-generic")
          .single();

        for (const ra of ras) {
          // Check existing - use more comprehensive check
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("company_id", ra.company_id)
            .eq("site_id", ra.site_id)
            .eq("due_date", todayString)
            .eq("task_data->>source_type", "ra_review")
            .eq("task_data->>ra_id", ra.id)
            .limit(1);

          if (existing && existing.length > 0) {
            console.log(`Skipping duplicate RA review task: ${ra.id}`);
            continue;
          }

          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: raTemplate?.id || null,
            company_id: ra.company_id,
            site_id: ra.site_id,
            custom_name: `RA Review Due: ${ra.title}`,
            due_date: todayString,
            daypart: "anytime",
            status: "pending",
            priority: "medium",
            generated_at: today.toISOString(),
            task_data: {
              source_type: "ra_review",
              ra_id: ra.id,
              review_date: ra.next_review_date,
            },
          });

          if (!error) log.ra_review_tasks_created++;
        }
      }
    } catch (e) {
      log.errors.push(`Error processing RA tasks: ${e}`);
    }

    // ========================================================================
    // 6. DOCUMENT EXPIRY (from global_documents)
    // ========================================================================

    try {
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysString = thirtyDaysFromNow.toISOString().split("T")[0];

      const { data: docs, error: docError } = await supabase
        .from("global_documents")
        .select("id, name, category, company_id, expiry_date")
        .eq("is_archived", false) // Exclude archived documents
        .lte("expiry_date", thirtyDaysString)
        .gte("expiry_date", todayString);

      if (docError) throw docError;

      if (docs && docs.length > 0) {
        let { data: docTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "document-review-generic")
          .single();

        for (const doc of docs) {
          // Check existing - use more comprehensive check
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("company_id", doc.company_id)
            .eq("site_id", doc.site_id)
            .eq("due_date", todayString)
            .eq("task_data->>source_type", "document_expiry")
            .eq("task_data->>document_id", doc.id)
            .limit(1);

          if (existing && existing.length > 0) {
            console.log(`Skipping duplicate document expiry task: ${doc.id}`);
            continue;
          }

          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: docTemplate?.id || null,
            company_id: doc.company_id,
            site_id: null, // Global doc
            custom_name: `Document Expiring: ${doc.name}`,
            due_date: todayString,
            daypart: "anytime",
            status: "pending",
            priority: "medium",
            generated_at: today.toISOString(),
            task_data: {
              source_type: "document_expiry",
              document_id: doc.id,
              expiry_date: doc.expiry_date,
            },
          });

          if (!error) log.document_expiry_tasks_created++;
        }
      }
    } catch (e) {
      log.errors.push(`Error processing Document tasks: ${e}`);
    }

    // ========================================================================
    // 7. CONFIGURED CHECKLISTS (from site_checklists)
    // ========================================================================
    // These are the recurring tasks configured in "My Tasks" (dashboard/my_tasks).
    // We iterate site_checklists (NOT task_templates) to respect user configurations.

    try {
      const { data: checklists, error: checklistError } = await supabase
        .from("site_checklists")
        .select(`
          id, 
          site_id, 
          company_id, 
          template_id, 
          name, 
          frequency, 
          daypart_times, 
          equipment_config, 
          days_of_week, 
          date_of_month
        `)
        .eq("active", true);

      if (checklistError) throw checklistError;

      if (checklists && checklists.length > 0) {
        const dayOfWeek = today.getDay(); // 0 = Sunday
        const dateOfMonth = today.getDate();

        // Get all unique site IDs to fetch GM assignments
        const siteIds = [...new Set(checklists.map((c) => c.site_id))];
        const { data: sites } = await supabase
          .from("sites")
          .select("id, gm_user_id")
          .in("id", siteIds);
        const siteGmMap = new Map(sites?.map((s) => [s.id, s.gm_user_id]));

        // Get all unique template IDs to fetch assignments
        const templateIds = [
          ...new Set(checklists.map((c) => c.template_id).filter(Boolean)),
        ];
        const { data: templates } = await supabase
          .from("task_templates")
          .select("id, assigned_to_user_id")
          .in("id", templateIds);
        const templateAssignmentMap = new Map(
          templates?.map((t) => [t.id, t.assigned_to_user_id]),
        );

        for (const checklist of checklists) {
          let shouldRun = false;

          // Check Frequency
          if (checklist.frequency === "daily") {
            shouldRun = true;
          } else if (checklist.frequency === "weekly") {
            // days_of_week is array of numbers (0-6)
            if (
              checklist.days_of_week && Array.isArray(checklist.days_of_week)
            ) {
              shouldRun = checklist.days_of_week.includes(dayOfWeek);
            }
          } else if (checklist.frequency === "monthly") {
            if (checklist.date_of_month) {
              shouldRun = checklist.date_of_month === dateOfMonth;
            } else {
              shouldRun = dateOfMonth === 1; // Default to 1st
            }
          }

          if (!shouldRun) continue;

          // Determine assignment: template assigned_to_user_id > site gm_user_id > null
          const templateAssignedTo =
            checklist.template_id
              ? templateAssignmentMap.get(checklist.template_id)
              : null;
          const siteGm = siteGmMap.get(checklist.site_id);
          const assignedToUserId = templateAssignedTo || siteGm || null;

          // Determine times/dayparts
          // daypart_times format: { "morning": "09:00", "evening": ["18:00", "20:00"] }
          let tasksToCreate: { daypart: string; time: string | null }[] = [];

          if (
            checklist.daypart_times &&
            typeof checklist.daypart_times === "object"
          ) {
            for (
              const [daypart, timeVal] of Object.entries(
                checklist.daypart_times,
              )
            ) {
              if (Array.isArray(timeVal)) {
                timeVal.forEach((t) =>
                  tasksToCreate.push({ daypart, time: t })
                );
              } else {
                tasksToCreate.push({ daypart, time: timeVal as string });
              }
            }
          } else {
            // Default if no specific times
            tasksToCreate.push({ daypart: "anytime", time: null });
          }

          for (const taskConfig of tasksToCreate) {
            // Check existing
            // We use site_checklist_id in task_data to track this
            const { data: existing } = await supabase
              .from("checklist_tasks")
              .select("id")
              .eq("site_checklist_id", checklist.id)
              .eq("due_date", todayString)
              .eq("daypart", taskConfig.daypart)
              .eq("due_time", taskConfig.time) // Check time to allow multiple per daypart
              .limit(1);

            if (existing && existing.length > 0) continue;

            // Extract selectedAssets from equipment_config for task completion modal
            let selectedAssets: string[] = [];
            if (checklist.equipment_config && Array.isArray(checklist.equipment_config)) {
              selectedAssets = checklist.equipment_config
                .map((eq: any) => eq.assetId || eq.asset_id || eq.value || eq.id)
                .filter(Boolean);
            }
            
            const { error } = await supabase.from("checklist_tasks").insert({
              site_checklist_id: checklist.id, // Link back to config
              template_id: checklist.template_id,
              company_id: checklist.company_id,
              site_id: checklist.site_id,
              custom_name: checklist.name,
              due_date: todayString,
              due_time: taskConfig.time,
              daypart: taskConfig.daypart,
              assigned_to_user_id: assignedToUserId, // Assign to template user or site GM
              status: "pending",
              priority: "medium",
              generated_at: today.toISOString(),
              task_data: {
                source_type: "site_checklist",
                equipment_config: checklist.equipment_config,
                selectedAssets: selectedAssets, // Extract asset IDs for task completion modal
              },
            });

            if (!error) log.general_tasks_synced++; // Using general counter or add new one
          }
        }
      }
    } catch (e) {
      log.errors.push(`Error processing Site Checklists: ${e}`);
    }

    // Return success
    console.log(`[${new Date().toISOString()}] Task generation completed for ${todayString}:`, log);
    
    return new Response(
      JSON.stringify({ success: true, log }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Task generation error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  } finally {
    // Always reset the lock, even on error
    isRunning = false;
  }
});
