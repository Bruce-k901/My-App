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

Deno.serve(async (_req) => {
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
      compliance_gap_tasks_created: 0,
      ppm_service_tasks_created: 0,
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
        const { data: genericTemplate } = await supabase
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
        const { data: calendarTemplate } = await supabase
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
        const { data: ppmTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "ppm-service-generic")
          .single();

        // Filter out archived assets - extract assets from joined data and filter
        // Supabase returns joined data with assets as a nested object
        interface PPMAssetData {
          id: string;
          name: string;
          site_id: string;
          company_id: string;
          archived: boolean;
        }

        interface PPMTaskWithAsset {
          id: string;
          asset_id: string;
          next_service_date: string;
          status: string;
          assets: PPMAssetData;
        }

        // Type assertion for the Supabase response
        const typedPpmTasks = ppmTasks as unknown as PPMTaskWithAsset[];

        const assets = typedPpmTasks
          .map((t) => t.assets)
          .filter((a) => a && !a.archived);
        
        // Filter ppmTasks to only include those with non-archived assets
        const filteredPpmTasks = typedPpmTasks.filter((ppm) => {
          const asset = ppm.assets;
          return asset && !asset.archived;
        });

        // Get site GM assignments for PPM tasks
        const ppmSiteIds = [...new Set(assets.map((a) => a.site_id))];
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
          const asset = ppm.assets;
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
      // We need to check JSON data for review_date usually, or a column if it exists.
      // Assuming 'sop_data->review_date' based on previous code.

      const { data: sops, error: sopError } = await supabase
        .from("sop_entries")
        .select("id, title, ref_code, company_id, site_id, sop_data")
        .eq("status", "Published")
        .neq("status", "Archived"); // Exclude archived SOPs

      if (sopError) throw sopError;

      if (sops) {
        const { data: sopTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "sop-review-generic")
          .single();

        interface SOPData {
          review_date?: string;
          next_review_date?: string;
        }

        for (const sop of sops) {
          const sopData = sop.sop_data as SOPData | null;
          const reviewDateStr = sopData?.review_date;
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
        const { data: raTemplate } = await supabase
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
        const { data: docTemplate } = await supabase
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
            .is("site_id", null) // Global docs don't have site_id
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
    // 7. COMPLIANCE GAP DETECTION
    // ========================================================================
    // Creates tasks for records with missing expiry/review dates

    try {
      // Training records with no expiry date
      const { data: trainingNoExpiry, error: trainingError } = await supabase
        .from("training_records")
        .select(`
          id,
          profile_id,
          company_id,
          course_id,
          status,
          completed_at,
          expiry_date,
          profiles!inner (
            id,
            full_name,
            home_site,
            company_id,
            line_manager_id
          )
        `)
        .is("expiry_date", null)
        .eq("status", "completed");

      if (trainingError) throw trainingError;

      if (trainingNoExpiry && trainingNoExpiry.length > 0) {
        const { data: gapTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "general-task-generic")
          .single();

        interface TrainingRecordWithProfile {
          id: string;
          profile_id: string;
          company_id: string;
          course_id: string;
          status: string;
          completed_at: string | null;
          expiry_date: string | null;
          profiles: {
            id: string;
            full_name: string;
            home_site: string | null;
            company_id: string;
            line_manager_id: string | null;
          };
        }

        for (const record of trainingNoExpiry) {
          const typedRecord = record as unknown as TrainingRecordWithProfile;
          const profile = typedRecord.profiles;
          if (!profile) continue;

          // Get site manager if home_site exists
          let assignTo = profile.line_manager_id || null;
          if (!assignTo && profile.home_site) {
            const { data: site } = await supabase
              .from("sites")
              .select("manager_id")
              .eq("id", profile.home_site)
              .single();
            assignTo = site?.manager_id || null;
          }

          // Get course info for training type
          let course = null;
          if (typedRecord.course_id) {
            const { data: courseData } = await supabase
              .from("training_courses")
              .select("name, code")
              .eq("id", typedRecord.course_id)
              .single();
            course = courseData;
          }

          // Check for existing task
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("company_id", profile.company_id)
            .eq("task_data->>task_type", "training_no_expiry")
            .eq("task_data->>target_record_id", typedRecord.id)
            .in("status", ["pending", "in_progress"])
            .limit(1);

          if (existing && existing.length > 0) continue;

          const courseName = course?.name || "Training";
          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: gapTemplate?.id || null,
            company_id: profile.company_id,
            site_id: profile.home_site,
            custom_name: `${profile.full_name} - ${courseName} - No expiry date`,
            custom_instructions: "Training certificate has no expiry date recorded. Please update the record with the correct expiry date.",
            due_date: todayString,
            daypart: "anytime",
            status: "pending",
            priority: "high",
            assigned_to_user_id: assignTo,
            generated_at: today.toISOString(),
            task_data: {
              task_type: "training_no_expiry",
              target_record_id: typedRecord.id,
              target_table: "training_records",
              staff_id: profile.id,
              staff_name: profile.full_name,
              course_name: courseName,
              completed_date: typedRecord.completed_at,
            },
          });

          if (!error) log.compliance_gap_tasks_created++;
        }
      }

      // SOP entries with no review date (check sop_data JSONB)
      const { data: sopsNoReview, error: sopGapError } = await supabase
        .from("sop_entries")
        .select("id, title, ref_code, company_id, version_number, category, created_by, sop_data")
        .eq("status", "Published");

      if (sopGapError) throw sopGapError;

      if (sopsNoReview && sopsNoReview.length > 0) {
        const { data: gapTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "general-task-generic")
          .single();

        interface SOPData {
          review_date?: string;
          next_review_date?: string;
        }

        for (const sop of sopsNoReview) {
          // Check if review_date is in sop_data JSONB
          const sopData = sop.sop_data as SOPData | null;
          // Skip if review_date or next_review_date exists in sop_data
          if (sopData?.review_date || sopData?.next_review_date) continue;

          // Check for existing task
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("company_id", sop.company_id)
            .eq("task_data->>task_type", "sop_no_review_date")
            .eq("task_data->>target_record_id", sop.id)
            .in("status", ["pending", "in_progress"])
            .limit(1);

          if (existing && existing.length > 0) continue;

          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: gapTemplate?.id || null,
            company_id: sop.company_id,
            custom_name: `SOP ${sop.ref_code} - No review date set`,
            custom_instructions: `SOP "${sop.title}" has no review date set. Please set a review schedule.`,
            due_date: todayString,
            daypart: "anytime",
            status: "pending",
            priority: "medium",
            assigned_to_user_id: sop.created_by,
            generated_at: today.toISOString(),
            task_data: {
              task_type: "sop_no_review_date",
              target_record_id: sop.id,
              target_table: "sop_entries",
              sop_title: sop.title,
              sop_ref_code: sop.ref_code,
              version_number: sop.version_number,
              category: sop.category,
            },
          });

          if (!error) log.compliance_gap_tasks_created++;
        }
      }

      // Risk assessments with no review date
      const { data: rasNoReview, error: raGapError } = await supabase
        .from("risk_assessments")
        .select("id, title, ref_code, company_id, site_id, template_type, highest_risk_level, created_by")
        .eq("status", "Published")
        .is("next_review_date", null)
        .is("archived_at", null);

      if (raGapError) throw raGapError;

      if (rasNoReview && rasNoReview.length > 0) {
        const { data: gapTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "general-task-generic")
          .single();

        for (const ra of rasNoReview) {
          // Check for existing task
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("company_id", ra.company_id)
            .eq("task_data->>task_type", "ra_no_review_date")
            .eq("task_data->>target_record_id", ra.id)
            .in("status", ["pending", "in_progress"])
            .limit(1);

          if (existing && existing.length > 0) continue;

          const priority = ra.highest_risk_level === "high" ? "high" : "medium";

          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: gapTemplate?.id || null,
            company_id: ra.company_id,
            site_id: ra.site_id,
            custom_name: `RA ${ra.ref_code} - No review date set`,
            custom_instructions: `Risk Assessment "${ra.title}" has no review date set. Please set a review schedule.`,
            due_date: todayString,
            daypart: "anytime",
            status: "pending",
            priority,
            assigned_to_user_id: ra.created_by,
            generated_at: today.toISOString(),
            task_data: {
              task_type: "ra_no_review_date",
              target_record_id: ra.id,
              target_table: "risk_assessments",
              ra_title: ra.title,
              ra_ref_code: ra.ref_code,
              template_type: ra.template_type,
              highest_risk_level: ra.highest_risk_level,
            },
          });

          if (!error) log.compliance_gap_tasks_created++;
        }
      }

      // Global documents with no expiry (where required)
      const { data: docsNoExpiry, error: docGapError } = await supabase
        .from("global_documents")
        .select("id, name, category, company_id, uploaded_by")
        .eq("is_archived", false)
        .is("expiry_date", null)
        .eq("requires_expiry", true);

      if (docGapError) throw docGapError;

      if (docsNoExpiry && docsNoExpiry.length > 0) {
        const { data: gapTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "general-task-generic")
          .single();

        for (const doc of docsNoExpiry) {
          // Check for existing task
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("company_id", doc.company_id)
            .eq("task_data->>task_type", "document_no_expiry")
            .eq("task_data->>target_record_id", doc.id)
            .in("status", ["pending", "in_progress"])
            .limit(1);

          if (existing && existing.length > 0) continue;

          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: gapTemplate?.id || null,
            company_id: doc.company_id,
            custom_name: `${doc.name} - No expiry date`,
            custom_instructions: `Document "${doc.name}" has no expiry date set. Please update with the correct expiry date.`,
            due_date: todayString,
            daypart: "anytime",
            status: "pending",
            priority: "medium",
            assigned_to_user_id: doc.uploaded_by,
            generated_at: today.toISOString(),
            task_data: {
              task_type: "document_no_expiry",
              target_record_id: doc.id,
              target_table: "global_documents",
              document_title: doc.name,
              document_type: doc.category,
              file_name: doc.name,
            },
          });

          if (!error) log.compliance_gap_tasks_created++;
        }
      }
    } catch (e) {
      log.errors.push(`Error processing compliance gap tasks: ${e}`);
    }

    // ========================================================================
    // 8. PPM SERVICE TASKS (from assets table)
    // ========================================================================
    // Generates tasks for assets due for PPM service

    try {
      const fourteenDaysFromNow = new Date(today);
      fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
      const fourteenDaysString = fourteenDaysFromNow.toISOString().split("T")[0];

      // PPM Service Overdue (past due date)
      const { data: ppmOverdue, error: ppmOverdueError } = await supabase
        .from("assets")
        .select(`
          id,
          name,
          category,
          serial_number,
          next_service_date,
          last_service_date,
          ppm_frequency_months,
          ppm_contractor_id,
          company_id,
          site_id,
          contractors:ppm_contractor_id (
            id,
            name
          ),
          sites (
            id,
            manager_id
          )
        `)
        .eq("archived", false)
        .not("ppm_frequency_months", "is", null)
        .not("next_service_date", "is", null)
        .lt("next_service_date", todayString);

      if (ppmOverdueError) throw ppmOverdueError;

      // Define interface for assets with relations (used by all PPM sections)
      interface AssetWithRelations {
        id: string;
        name: string;
        category: string | null;
        serial_number: string | null;
        next_service_date: string | null;
        last_service_date: string | null;
        ppm_frequency_months: number | null;
        ppm_contractor_id: string | null;
        company_id: string;
        site_id: string | null;
        contractors: { id: string; name: string } | null;
        sites: { id: string; manager_id: string | null } | null;
      }

      if (ppmOverdue && ppmOverdue.length > 0) {
        const { data: ppmTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "ppm-service-generic")
          .single();

        for (const asset of ppmOverdue) {
          const typedAsset = asset as unknown as AssetWithRelations;
          const contractor = typedAsset.contractors;
          const site = typedAsset.sites;
          const daysOverdue = Math.floor(
            (new Date(todayString).getTime() - new Date(typedAsset.next_service_date!).getTime()) /
              (1000 * 60 * 60 * 24)
          );

          // Check for existing task
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("company_id", typedAsset.company_id)
            .eq("task_data->>task_type", "ppm_service_overdue")
            .eq("task_data->>target_record_id", typedAsset.id)
            .in("status", ["pending", "in_progress"])
            .limit(1);

          if (existing && existing.length > 0) continue;

          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: ppmTemplate?.id || null,
            company_id: typedAsset.company_id,
            site_id: typedAsset.site_id,
            custom_name: `OVERDUE: ${typedAsset.name} - PPM Service`,
            custom_instructions: `PPM service for ${typedAsset.name} is ${daysOverdue} days overdue. Last service: ${typedAsset.last_service_date || "Never"}. Contractor: ${contractor?.name || "Not assigned"}`,
            due_date: typedAsset.next_service_date!,
            daypart: "anytime",
            status: "pending",
            priority: "urgent",
            assigned_to_user_id: site?.manager_id || null,
            generated_at: today.toISOString(),
            task_data: {
              task_type: "ppm_service_overdue",
              target_record_id: typedAsset.id,
              target_table: "assets",
              asset_name: typedAsset.name,
              asset_category: typedAsset.category,
              serial_number: typedAsset.serial_number,
              next_service_date: typedAsset.next_service_date,
              last_service_date: typedAsset.last_service_date,
              ppm_frequency_months: typedAsset.ppm_frequency_months,
              ppm_contractor_id: typedAsset.ppm_contractor_id,
              contractor_name: contractor?.name,
              days_overdue: daysOverdue,
            },
          });

          if (!error) log.ppm_service_tasks_created++;
        }
      }

      // PPM Service Due (within 14 days)
      const { data: ppmDue, error: ppmDueError } = await supabase
        .from("assets")
        .select(`
          id,
          name,
          category,
          serial_number,
          next_service_date,
          last_service_date,
          ppm_frequency_months,
          ppm_contractor_id,
          company_id,
          site_id,
          contractors:ppm_contractor_id (
            id,
            name
          ),
          sites (
            id,
            manager_id
          )
        `)
        .eq("archived", false)
        .not("ppm_frequency_months", "is", null)
        .not("next_service_date", "is", null)
        .gte("next_service_date", todayString)
        .lte("next_service_date", fourteenDaysString);

      if (ppmDueError) throw ppmDueError;

      if (ppmDue && ppmDue.length > 0) {
        const { data: ppmTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "ppm-service-generic")
          .single();

        for (const asset of ppmDue) {
          const typedAsset = asset as unknown as AssetWithRelations;
          const contractor = typedAsset.contractors;
          const site = typedAsset.sites;

          // Check for existing task (overdue or due)
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("company_id", typedAsset.company_id)
            .in("task_data->>task_type", ["ppm_service_due", "ppm_service_overdue"])
            .eq("task_data->>target_record_id", typedAsset.id)
            .in("status", ["pending", "in_progress"])
            .limit(1);

          if (existing && existing.length > 0) continue;

          const daysUntil = Math.floor(
            (new Date(typedAsset.next_service_date!).getTime() - new Date(todayString).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          const priority = daysUntil <= 3 ? "high" : "medium";

          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: ppmTemplate?.id || null,
            company_id: typedAsset.company_id,
            site_id: typedAsset.site_id,
            custom_name: `${typedAsset.name} - PPM Service Due`,
            custom_instructions: `PPM service for ${typedAsset.name} is due on ${typedAsset.next_service_date}. Contractor: ${contractor?.name || "Not assigned"}`,
            due_date: typedAsset.next_service_date!,
            daypart: "anytime",
            status: "pending",
            priority,
            assigned_to_user_id: site?.manager_id || null,
            generated_at: today.toISOString(),
            task_data: {
              task_type: "ppm_service_due",
              target_record_id: typedAsset.id,
              target_table: "assets",
              asset_name: typedAsset.name,
              asset_category: typedAsset.category,
              serial_number: typedAsset.serial_number,
              next_service_date: typedAsset.next_service_date,
              last_service_date: typedAsset.last_service_date,
              ppm_frequency_months: typedAsset.ppm_frequency_months,
              ppm_contractor_id: typedAsset.ppm_contractor_id,
              contractor_name: contractor?.name,
            },
          });

          if (!error) log.ppm_service_tasks_created++;
        }
      }

      // PPM No Schedule Set
      const { data: ppmNoSchedule, error: ppmNoScheduleError } = await supabase
        .from("assets")
        .select(`
          id,
          name,
          category,
          serial_number,
          last_service_date,
          ppm_frequency_months,
          ppm_contractor_id,
          company_id,
          site_id,
          contractors:ppm_contractor_id (
            id,
            name
          ),
          sites (
            id,
            manager_id
          )
        `)
        .eq("archived", false)
        .not("ppm_frequency_months", "is", null)
        .is("next_service_date", null);

      if (ppmNoScheduleError) throw ppmNoScheduleError;

      if (ppmNoSchedule && ppmNoSchedule.length > 0) {
        const { data: ppmTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "ppm-service-generic")
          .single();

        for (const asset of ppmNoSchedule) {
          const typedAsset = asset as unknown as AssetWithRelations;
          const contractor = typedAsset.contractors;
          const site = typedAsset.sites;

          // Check for existing task
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("company_id", typedAsset.company_id)
            .eq("task_data->>task_type", "ppm_no_schedule")
            .eq("task_data->>target_record_id", typedAsset.id)
            .in("status", ["pending", "in_progress"])
            .limit(1);

          if (existing && existing.length > 0) continue;

          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: ppmTemplate?.id || null,
            company_id: typedAsset.company_id,
            site_id: typedAsset.site_id,
            custom_name: `${typedAsset.name} - No PPM schedule set`,
            custom_instructions: `Asset "${typedAsset.name}" has PPM frequency of ${typedAsset.ppm_frequency_months} months but no next service date is set.`,
            due_date: todayString,
            daypart: "anytime",
            status: "pending",
            priority: "medium",
            assigned_to_user_id: site?.manager_id || null,
            generated_at: today.toISOString(),
            task_data: {
              task_type: "ppm_no_schedule",
              target_record_id: typedAsset.id,
              target_table: "assets",
              asset_name: typedAsset.name,
              asset_category: typedAsset.category,
              serial_number: typedAsset.serial_number,
              last_service_date: typedAsset.last_service_date,
              ppm_frequency_months: typedAsset.ppm_frequency_months,
              ppm_contractor_id: typedAsset.ppm_contractor_id,
              contractor_name: contractor?.name,
            },
          });

          if (!error) log.ppm_service_tasks_created++;
        }
      }
    } catch (e) {
      log.errors.push(`Error processing PPM service tasks: ${e}`);
    }

    // ========================================================================
    // 9. CONFIGURED CHECKLISTS (from site_checklists)
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
          const tasksToCreate: { daypart: string; time: string | null }[] = [];

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
            interface EquipmentConfigItem {
              assetId?: string;
              asset_id?: string;
              value?: string;
              id?: string;
            }

            if (checklist.equipment_config && Array.isArray(checklist.equipment_config)) {
              selectedAssets = (checklist.equipment_config as EquipmentConfigItem[])
                .map((eq) => eq.assetId || eq.asset_id || eq.value || eq.id)
                .filter(Boolean) as string[];
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
