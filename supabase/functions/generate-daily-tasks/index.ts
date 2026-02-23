// ============================================================================
// REBUILT EDGE FUNCTION: generate-daily-tasks
// ============================================================================
// Reads from site_checklists (configurations) and creates checklist_tasks (instances)
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (req)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const log = {
      daily_tasks_created: 0,
      weekly_tasks_created: 0,
      monthly_tasks_created: 0,
      annual_tasks_created: 0,
      ppm_tasks_created: 0,
      callout_tasks_created: 0,
      certificate_tasks_created: 0,
      sop_review_tasks_created: 0,
      ra_review_tasks_created: 0,
      messaging_tasks_created: 0,
      document_expiry_tasks_created: 0,
      errors: []
    };
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    const todayDayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday
    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    async function taskExists(siteChecklistId, dueDate, dueTime) {
      let query = supabase.from("checklist_tasks").select("id").eq("site_checklist_id", siteChecklistId).eq("due_date", dueDate).limit(1);
      if (dueTime) {
        query = query.eq("due_time", dueTime);
      }
      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        return false;
      }
      return true;
    }
    async function createTask(params) {
      // Build task_data from equipment_config and template
      // Always initialize taskData as an object to ensure features can be added
      let taskData = {};
      // ========================================================================
      // 1. POPULATE CHECKLIST ITEMS FROM TEMPLATE
      // ========================================================================
      if (params.template) {
        // Parse recurrence_pattern (could be string or object)
        let recurrencePattern = params.template.recurrence_pattern;
        if (typeof recurrencePattern === "string") {
          try {
            recurrencePattern = JSON.parse(recurrencePattern);
          } catch (e) {
            console.error("Failed to parse recurrence_pattern:", e);
            recurrencePattern = null;
          }
        }
        // Get default checklist items from template
        const defaultChecklistItems = recurrencePattern?.default_checklist_items || [];
        const evidenceTypes = params.template.evidence_types || [];
        const hasYesNoChecklist = evidenceTypes.includes("yes_no_checklist");
        // Populate checklist items based on evidence type
        if (Array.isArray(defaultChecklistItems) && defaultChecklistItems.length > 0) {
          if (hasYesNoChecklist) {
            // Yes/No checklist format (preserve enhanced options if present)
            taskData.yesNoChecklistItems = defaultChecklistItems.map((item)=>{
                if (typeof item === "string") {
                  return { text: item, answer: null };
                }
                if (item.options && Array.isArray(item.options)) {
                  // Enhanced format — preserve options, reset runtime fields
                  return { ...item, answer: null, actionResponse: undefined, exceptionLogged: undefined };
                }
                return { text: item.text || item.label || "", answer: null };
              }).filter((item: any)=>item.text && item.text.trim().length > 0);
          } else {
            // Regular checklist format
            taskData.checklistItems = defaultChecklistItems.map((item)=>typeof item === "string" ? item : item.text || item.label || "").filter((item)=>item && item.trim().length > 0);
          }
        }
        // Carry template reference documents (SOPs, RAs, guides) into task_data
        const templateDocs = recurrencePattern?.template_documents;
        if (Array.isArray(templateDocs) && templateDocs.length > 0) {
          taskData.referenceDocuments = templateDocs;
        }
      }
      // ========================================================================
      // 2. POPULATE EQUIPMENT/ASSET DATA
      // ========================================================================
      if (params.equipmentConfig && Array.isArray(params.equipmentConfig) && params.equipmentConfig.length > 0) {
        // Handle both cases: array of IDs (strings) or array of objects
        const isArrayOfIds = typeof params.equipmentConfig[0] === "string";
        // Extract selected asset IDs
        const selectedAssets = isArrayOfIds ? params.equipmentConfig.filter((id)=>typeof id === "string" && id.length > 0) : params.equipmentConfig.map((item)=>item.id || item.asset_id || item.value || (typeof item === "string" ? item : null)).filter(Boolean);
        if (selectedAssets.length > 0) {
          taskData.selectedAssets = selectedAssets;
        }
        // Map equipment_config to repeatable field if template has one
        if (params.template?.repeatable_field_name) {
          const repeatableFieldName = params.template.repeatable_field_name;
          if (isArrayOfIds) {
            // If it's an array of IDs, create objects with just the ID
            taskData[repeatableFieldName] = params.equipmentConfig.map((id)=>({
                value: id,
                asset_id: id,
                id: id
              }));
          } else {
            // If it's an array of objects, map them properly
            taskData[repeatableFieldName] = params.equipmentConfig.map((item)=>({
                value: item.id || item.asset_id || item.value || item,
                asset_id: item.id || item.asset_id || item.value || item,
                id: item.id || item.asset_id || item.value || item,
                nickname: item.nickname || item.equipment || null,
                equipment: item.equipment || item.name || null,
                asset_name: item.name || item.equipment || null
              }));
          }
        }
        // Preserve any other fields from equipment_config (only if it's an array of objects)
        if (!isArrayOfIds && params.equipmentConfig[0] && typeof params.equipmentConfig[0] === "object") {
          // Check if there are temperature fields
          const firstItem = params.equipmentConfig[0];
          if (firstItem.temp !== undefined || firstItem.temperature !== undefined) {
            taskData.temperatures = params.equipmentConfig.map((item)=>({
                assetId: item.id || item.asset_id || item.value,
                temp: item.temp || item.temperature || null,
                nickname: item.nickname || null
              }));
          }
        }
      }
      // ========================================================================
      // 3. INITIALIZE TEMPERATURE ARRAY FOR TEMPLATES WITH TEMPERATURE EVIDENCE
      // ========================================================================
      // If template has temperature evidence type but temperatures haven't been populated yet,
      // initialize it based on selected assets
      if (params.template?.evidence_types?.includes("temperature")) {
        // Only initialize if temperatures array doesn't exist or is empty
        if (!taskData.temperatures || Array.isArray(taskData.temperatures) && taskData.temperatures.length === 0) {
          if (taskData.selectedAssets && Array.isArray(taskData.selectedAssets) && taskData.selectedAssets.length > 0) {
            // Initialize temperatures array with one entry per selected asset
            taskData.temperatures = taskData.selectedAssets.map((assetId)=>({
                assetId: assetId,
                temp: null,
                nickname: null
              }));
          } else {
            // No selected assets, initialize as empty array
            taskData.temperatures = [];
          }
        }
      }
      // Set taskData to null only if it's completely empty (no features at all)
      // This maintains backward compatibility
      if (Object.keys(taskData).length === 0) {
        taskData = null;
      }
      const { error } = await supabase.from("checklist_tasks").insert({
        site_checklist_id: params.siteChecklistId,
        template_id: params.templateId,
        company_id: params.companyId,
        site_id: params.siteId,
        custom_name: params.customName || null,
        due_date: params.dueDate,
        due_time: params.dueTime,
        daypart: params.daypart,
        status: "pending",
        generated_at: today.toISOString(),
        task_data: taskData
      });
      if (error) {
        log.errors.push(`Failed to create task: ${error.message}`);
        return false;
      }
      return true;
    }
    // ========================================================================
    // 1. DAILY TASKS (from site_checklists)
    // ========================================================================
    const { data: dailyConfigs, error: dailyError } = await supabase.from("site_checklists").select("*, task_templates(*)").eq("frequency", "daily").eq("active", true);
    if (dailyError) {
      log.errors.push(`Failed to fetch daily configs: ${dailyError.message}`);
    }
    for (const config of dailyConfigs || []){
      try {
        // Multi-time tasks (SFBB temperature checks)
        if (config.daypart_times && typeof config.daypart_times === "object") {
          for (const [daypart, times] of Object.entries(config.daypart_times)){
            const timeArray = Array.isArray(times) ? times : [
              times
            ];
            for (const time of timeArray){
              if (await taskExists(config.id, todayString, time)) continue;
              const success = await createTask({
                siteChecklistId: config.id,
                templateId: config.template_id,
                companyId: config.company_id,
                siteId: config.site_id,
                customName: config.name,
                dueDate: todayString,
                dueTime: time,
                daypart: daypart,
                equipmentConfig: config.equipment_config,
                template: config.task_templates
              });
              if (success) log.daily_tasks_created++;
            }
          }
        } else {
          // Single time task
          const time = config.task_templates?.time_of_day || "12:00";
          const daypart = config.task_templates?.dayparts?.[0] || "anytime";
          if (await taskExists(config.id, todayString, time)) continue;
          const success = await createTask({
            siteChecklistId: config.id,
            templateId: config.template_id,
            companyId: config.company_id,
            siteId: config.site_id,
            customName: config.name,
            dueDate: todayString,
            dueTime: time,
            daypart: daypart,
            equipmentConfig: config.equipment_config,
            template: config.task_templates
          });
          if (success) log.daily_tasks_created++;
        }
      } catch (e) {
        log.errors.push(`Error processing daily config ${config.id}: ${e}`);
      }
    }
    // ========================================================================
    // 2. WEEKLY TASKS
    // ========================================================================
    const { data: weeklyConfigs } = await supabase.from("site_checklists").select("*, task_templates(*)").eq("frequency", "weekly").eq("active", true);
    for (const config of weeklyConfigs || []){
      try {
        const scheduledDays = config.days_of_week || [
          1
        ]; // Default Monday
        if (!scheduledDays.includes(todayDayOfWeek)) continue;
        if (await taskExists(config.id, todayString, null)) continue;
        const success = await createTask({
          siteChecklistId: config.id,
          templateId: config.template_id,
          companyId: config.company_id,
          siteId: config.site_id,
          customName: config.name,
          dueDate: todayString,
          dueTime: null,
          daypart: "anytime",
          equipmentConfig: config.equipment_config,
          template: config.task_templates
        });
        if (success) log.weekly_tasks_created++;
      } catch (e) {
        log.errors.push(`Error processing weekly config ${config.id}: ${e}`);
      }
    }
    // ========================================================================
    // 3. MONTHLY TASKS
    // ========================================================================
    const { data: monthlyConfigs } = await supabase.from("site_checklists").select("*, task_templates(*)").eq("frequency", "monthly").eq("active", true);
    const todayDate = today.getDate();
    for (const config of monthlyConfigs || []){
      try {
        const scheduledDate = config.date_of_month || 1;
        if (todayDate !== scheduledDate) continue;
        if (await taskExists(config.id, todayString, null)) continue;
        const success = await createTask({
          siteChecklistId: config.id,
          templateId: config.template_id,
          companyId: config.company_id,
          siteId: config.site_id,
          customName: config.name,
          dueDate: todayString,
          dueTime: null,
          daypart: "anytime",
          equipmentConfig: config.equipment_config,
          template: config.task_templates
        });
        if (success) log.monthly_tasks_created++;
      } catch (e) {
        log.errors.push(`Error processing monthly config ${config.id}: ${e}`);
      }
    }
    // ========================================================================
    // 4. ANNUAL TASKS
    // ========================================================================
    const { data: annualConfigs } = await supabase.from("site_checklists").select("*, task_templates(*)").eq("frequency", "annually").eq("active", true);
    for (const config of annualConfigs || []){
      try {
        if (!config.anniversary_date) continue;
        const anniversaryDate = new Date(config.anniversary_date);
        const anniversaryMonth = anniversaryDate.getMonth();
        const anniversaryDay = anniversaryDate.getDate();
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();
        // Check if today matches the anniversary date
        if (todayMonth !== anniversaryMonth || todayDay !== anniversaryDay) {
          continue;
        }
        if (await taskExists(config.id, todayString, null)) continue;
        const success = await createTask({
          siteChecklistId: config.id,
          templateId: config.template_id,
          companyId: config.company_id,
          siteId: config.site_id,
          customName: config.name,
          dueDate: todayString,
          dueTime: null,
          daypart: "anytime",
          equipmentConfig: config.equipment_config,
          template: config.task_templates
        });
        if (success) log.annual_tasks_created++;
      } catch (e) {
        log.errors.push(`Error processing annual config ${config.id}: ${e}`);
      }
    }

// ========================================================================
// 5. PPM TASKS (Overdue and Due Soon)
// ========================================================================
try {
  const fourteenDaysFromNow = new Date(today);
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
  const fourteenDaysString = fourteenDaysFromNow.toISOString().split("T")[0];
  
  console.log("PPM: Querying assets with next_service_date <=", fourteenDaysString);
  
  // Get assets with PPM schedules that are overdue or due within 14 days
  const { data: ppmAssets, error: ppmError } = await supabase
    .from("assets")
    .select("id, site_id, company_id, name, next_service_date, ppm_frequency_months, ppm_status")
    .not("ppm_frequency_months", "is", null)
    .not("next_service_date", "is", null)
    .lte("next_service_date", fourteenDaysString)
    .eq("archived", false)
    .or("ppm_status.is.null,ppm_status.neq.service_booked");

  console.log("PPM: Query error:", ppmError);
  console.log("PPM: Found assets:", ppmAssets?.length || 0);
  
  const { data: ppmTemplate } = await supabase
    .from("task_templates")
    .select("id")
    .eq("slug", "ppm-overdue-generic")
    .single();

  console.log("PPM: Template found:", ppmTemplate?.id);

  if (ppmTemplate) {
    for (const asset of ppmAssets || []) {
      // Check if PPM task already exists for this asset (including completed and missed)
      const { data: existingPpmTask } = await supabase
        .from("checklist_tasks")
        .select("id")
        .contains("task_data", {
          source_type: "ppm_overdue",
          source_id: asset.id
        })
        .in("status", ["pending", "in_progress", "completed", "missed"])
        .limit(1);

      if (existingPpmTask && existingPpmTask.length > 0) {
        console.log("PPM: Skipping duplicate for:", asset.name, asset.id);
        continue;
      }

      const isOverdue = new Date(asset.next_service_date) < today;
      const taskName = isOverdue
        ? `OVERDUE PPM: ${asset.name}`
        : `PPM Due Soon: ${asset.name}`;

      console.log("PPM: Creating task for:", asset.name, asset.id);

      const { error } = await supabase.from("checklist_tasks").insert({
        template_id: null, //set to null to avoid unique constraints
        company_id: asset.company_id,
        site_id: asset.site_id,
        custom_name: taskName,
        due_date: isOverdue ? todayString : asset.next_service_date,
        status: "pending",
        priority: isOverdue ? "urgent" : "medium",
        generated_at: today.toISOString(),
        task_data: {
          source_type: "ppm_overdue",
          source_id: asset.id,
          next_service_date: asset.next_service_date,
          is_overdue: isOverdue,
        },
      });

      if (error) {
        console.log("PPM: Insert error for", asset.name, ":", error.message);
      } else {
        log.ppm_tasks_created++;
      }
    }
  }
} catch (e) {
  log.errors.push(`Error processing PPM tasks: ${e}`);
}
// ========================================================================
    // 6. CERTIFICATE EXPIRY TASKS (30 days before expiry)
    // ========================================================================
    try {
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysString = thirtyDaysFromNow.toISOString().split("T")[0];
      // Get certificate renewal template
      const { data: certTemplate } = await supabase.from("task_templates").select("id").eq("slug", "certificate-renewal-generic").single();
      // Map cert type to training_courses code for cross-checking against training_records
      const certTypeToCode = {
        food_safety: ["FS-L2", "FS-L3"],
        h_and_s: ["HS-L2"],
        fire_marshal: ["FIRE"],
        first_aid: ["FAW"],
        cossh: ["COSHH", "ALLERGY"]
      };
      if (certTemplate) {
        const { data: allProfiles } = await supabase.from("profiles").select("id, full_name, site_id, company_id, home_site, food_safety_expiry_date, h_and_s_expiry_date, fire_marshal_expiry_date, first_aid_expiry_date, cossh_expiry_date, food_safety_level, h_and_s_level");
        for (const profile of allProfiles || []){
          const siteId = profile.site_id || profile.home_site;
          if (!siteId || !profile.company_id) continue;
          const certificates = [
            {
              type: "food_safety",
              date: profile.food_safety_expiry_date,
              level: profile.food_safety_level,
              label: "Food Safety"
            },
            {
              type: "h_and_s",
              date: profile.h_and_s_expiry_date,
              level: profile.h_and_s_level,
              label: "Health & Safety"
            },
            {
              type: "fire_marshal",
              date: profile.fire_marshal_expiry_date,
              label: "Fire Marshal"
            },
            {
              type: "first_aid",
              date: profile.first_aid_expiry_date,
              label: "First Aid"
            },
            {
              type: "cossh",
              date: profile.cossh_expiry_date,
              label: "COSHH"
            }
          ];
          for (const cert of certificates){
            if (!cert.date) continue;
            const expiryDate = new Date(cert.date);
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            // Create task if expiry is within 30 days OR already expired (up to 1 year overdue)
            if (daysUntilExpiry < -365 || daysUntilExpiry > 30) continue;
            // Cross-check training_records: if a valid (non-expired) record exists, the profile
            // field is stale — skip task generation. training_records is the source of truth.
            const courseCodes = certTypeToCode[cert.type] || [];
            if (courseCodes.length > 0) {
              const { data: validTrainingCourses } = await supabase
                .from("training_courses")
                .select("id")
                .eq("company_id", profile.company_id)
                .in("code", courseCodes);
              const validCourseIds = (validTrainingCourses || []).map(c => c.id);
              if (validCourseIds.length > 0) {
                const { data: validRecord } = await supabase
                  .from("training_records")
                  .select("id, expiry_date")
                  .eq("profile_id", profile.id)
                  .eq("status", "completed")
                  .in("course_id", validCourseIds)
                  .gt("expiry_date", thirtyDaysString)
                  .limit(1);
                if (validRecord && validRecord.length > 0) {
                  // Training record shows this cert is still valid — skip
                  continue;
                }
              }
            }
            const levelText = cert.level ? ` Level ${cert.level}` : "";
            const isExpired = daysUntilExpiry < 0;
            const taskName = isExpired
              ? `EXPIRED ${cert.label}${levelText} Certificate: ${profile.full_name || "Staff Member"}`
              : `${cert.label}${levelText} Certificate Expiring: ${profile.full_name || "Staff Member"}`;
            // Check if ANY existing task (pending, in_progress, completed, or missed) exists for this cert
            const { data: existing } = await supabase.from("checklist_tasks").select("id").contains("task_data", {
              source_type: "certificate_expiry",
              certificate_type: cert.type,
              profile_id: profile.id
            }).in("status", [
              "pending",
              "in_progress",
              "completed",
              "missed"
            ]).limit(1);
            if (existing && existing.length > 0) continue;
            // Use actual expiry date as due_date for upcoming, today for already expired
            const { error } = await supabase.from("checklist_tasks").insert({
              template_id: certTemplate.id,
              company_id: profile.company_id,
              site_id: siteId,
              custom_name: taskName,
              due_date: isExpired ? todayString : cert.date,
              status: "pending",
              priority: daysUntilExpiry <= 0 ? "urgent" : daysUntilExpiry <= 7 ? "urgent" : daysUntilExpiry <= 14 ? "high" : "medium",
              generated_at: today.toISOString(),
              task_data: {
                source_type: "certificate_expiry",
                certificate_type: cert.type,
                profile_id: profile.id,
                expiry_date: cert.date,
                days_until_expiry: daysUntilExpiry
              }
            });
            if (!error) log.certificate_tasks_created++;
          }
        }
      }
      // ✅ NEW: Check for certificates with NO expiry date (compliance gap)
      const { data: profilesNoExpiry } = await supabase.from("profiles").select("id, full_name, site_id, company_id, home_site, food_safety_level, h_and_s_level").not("company_id", "is", null);
      for (const profile of profilesNoExpiry || []){
        const siteId = profile.site_id || profile.home_site;
        if (!siteId) continue;
        // Check Food Safety - has level but no expiry
        if (profile.food_safety_level) {
          const { data: fsRecord } = await supabase.from("profiles").select("food_safety_expiry_date").eq("id", profile.id).single();
          if (!fsRecord?.food_safety_expiry_date) {
            const taskName = `Food Safety Level ${profile.food_safety_level} - No Expiry Date: ${profile.full_name}`;
            const { data: existing } = await supabase.from("checklist_tasks").select("id").eq("task_data->>source_type", "certificate_no_expiry").eq("task_data->>certificate_type", "food_safety").eq("task_data->>profile_id", profile.id).in("status", [
              "pending",
              "in_progress"
            ]).limit(1);
            if (!existing || existing.length === 0) {
              await supabase.from("checklist_tasks").insert({
                template_id: certTemplate?.id || null,
                company_id: profile.company_id,
                site_id: siteId,
                custom_name: taskName,
                due_date: todayString,
                status: "pending",
                priority: "high",
                generated_at: today.toISOString(),
                task_data: {
                  source_type: "certificate_no_expiry",
                  certificate_type: "food_safety",
                  profile_id: profile.id,
                  level: profile.food_safety_level
                }
              });
              log.certificate_tasks_created++;
            }
          }
        }
        // Repeat for H&S
        if (profile.h_and_s_level) {
          const { data: hsRecord } = await supabase.from("profiles").select("h_and_s_expiry_date").eq("id", profile.id).single();
          if (!hsRecord?.h_and_s_expiry_date) {
            const taskName = `Health & Safety Level ${profile.h_and_s_level} - No Expiry Date: ${profile.full_name}`;
            const { data: existing } = await supabase.from("checklist_tasks").select("id").eq("task_data->>source_type", "certificate_no_expiry").eq("task_data->>certificate_type", "h_and_s").eq("task_data->>profile_id", profile.id).in("status", [
              "pending",
              "in_progress"
            ]).limit(1);
            if (!existing || existing.length === 0) {
              await supabase.from("checklist_tasks").insert({
                template_id: certTemplate?.id || null,
                company_id: profile.company_id,
                site_id: siteId,
                custom_name: taskName,
                due_date: todayString,
                status: "pending",
                priority: "high",
                generated_at: today.toISOString(),
                task_data: {
                  source_type: "certificate_no_expiry",
                  certificate_type: "h_and_s",
                  profile_id: profile.id,
                  level: profile.h_and_s_level
                }
              });
              log.certificate_tasks_created++;
            }
          }
        }
      }
    } catch (e) {
      log.errors.push(`Error processing certificate expiry tasks: ${e}`);
    }
    // ========================================================================
    // 6b. TRAINING RECORDS - EXPIRED & EXPIRING CERTIFICATES
    // ========================================================================
    // The profiles-based check above only covers 5 hardcoded cert types.
    // This section checks the training_records table (the primary source of truth)
    // for ALL training courses that are expired or expiring within 30 days.
    try {
      const thirtyDaysAhead = new Date(today);
      thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);
      const thirtyDaysAheadString = thirtyDaysAhead.toISOString().split("T")[0];

      // Query training_records (no joins - separate lookups for profiles and courses)
      const { data: expiringRecords, error: trError } = await supabase
        .from("training_records")
        .select("id, profile_id, course_id, expiry_date, company_id")
        .eq("status", "completed")
        .not("expiry_date", "is", null)
        .lte("expiry_date", thirtyDaysAheadString)
        .order("expiry_date", { ascending: true });

      if (trError) {
        log.errors.push(`Failed to fetch training records: ${trError.message}`);
      }
      log.training_records_scanned = (expiringRecords || []).length;

      // Batch-lookup course names
      const courseIds = [...new Set((expiringRecords || []).map((r) => r.course_id).filter(Boolean))];
      const courseMap = {};
      if (courseIds.length > 0) {
        const { data: courses } = await supabase
          .from("training_courses")
          .select("id, name, code")
          .in("id", courseIds);
        for (const c of courses || []) {
          courseMap[c.id] = c;
        }
      }

      // Batch-lookup profile details
      const profileIds = [...new Set((expiringRecords || []).map((r) => r.profile_id).filter(Boolean))];
      const profileMap = {};
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, site_id, home_site")
          .in("id", profileIds);
        for (const p of profiles || []) {
          profileMap[p.id] = p;
        }
      }

      // Get certificate renewal template for linking
      const { data: certTemplateForTraining } = await supabase.from("task_templates").select("id").eq("slug", "certificate-renewal-generic").single();
      for (const record of expiringRecords || []) {
        const profile = profileMap[record.profile_id];
        const course = courseMap[record.course_id];
        if (!profile || !course || !record.company_id) continue;
        const siteId = profile.site_id || profile.home_site;
        if (!siteId) continue;

        const expiryDate = new Date(record.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        // Skip if more than 1 year overdue (stale data)
        if (daysUntilExpiry < -365) continue;

        const isExpired = daysUntilExpiry < 0;
        const taskName = isExpired
          ? `EXPIRED Training: ${course.name} - ${profile.full_name || "Staff Member"}`
          : `Training Expiring: ${course.name} - ${profile.full_name || "Staff Member"}`;

        // Check if task already exists for this training record (including completed and missed)
        const { data: existing } = await supabase
          .from("checklist_tasks")
          .select("id")
          .contains("task_data", {
            source_type: "training_certificate",
            training_record_id: record.id
          })
          .in("status", ["pending", "in_progress", "completed", "missed"])
          .limit(1);
        if (existing && existing.length > 0) continue;

        // Use actual expiry date as due_date for upcoming, today for already expired
        // NOTE: template_id is null to avoid unique constraint on (template_id, due_date, site_id)
        const { error } = await supabase.from("checklist_tasks").insert({
          template_id: null,
          company_id: record.company_id,
          site_id: siteId,
          custom_name: taskName,
          due_date: isExpired ? todayString : record.expiry_date,
          status: "pending",
          priority: daysUntilExpiry <= 0 ? "urgent" : daysUntilExpiry <= 7 ? "urgent" : daysUntilExpiry <= 14 ? "high" : "medium",
          generated_at: today.toISOString(),
          task_data: {
            source_type: "training_certificate",
            training_record_id: record.id,
            course_id: record.course_id,
            course_name: course.name,
            course_code: course.code || null,
            profile_id: record.profile_id,
            expiry_date: record.expiry_date,
            days_until_expiry: daysUntilExpiry
          }
        });
        if (error) {
          log.errors.push(`Training cert insert failed: ${error.message} (record: ${record.id}, profile: ${record.profile_id})`);
        } else {
          log.certificate_tasks_created++;
        }
      }
    } catch (e) {
      log.errors.push(`Error processing training record expiry tasks: ${e}`);
    }
    // ========================================================================
    // 7. SOP REVIEW TASKS (30 days before review date)
    // ========================================================================
    try {
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const { data: sopTemplate } = await supabase.from("task_templates").select("id").eq("slug", "sop-review-generic").single();
      if (sopTemplate) {
        // Fetch SOPs that need review
        const { data: sops } = await supabase.from("sop_entries").select("id, title, ref_code, company_id, site_id, sop_data, updated_at, created_at");
        for (const sop of sops || []){
          // Calculate review date: use review_date from sop_data, or updated_at + 1 year, or created_at + 1 year
          let reviewDate = null;
          if (sop.sop_data && typeof sop.sop_data === "object" && sop.sop_data.review_date) {
            reviewDate = new Date(sop.sop_data.review_date);
          } else if (sop.updated_at) {
            reviewDate = new Date(sop.updated_at);
            reviewDate.setFullYear(reviewDate.getFullYear() + 1);
          } else if (sop.created_at) {
            reviewDate = new Date(sop.created_at);
            reviewDate.setFullYear(reviewDate.getFullYear() + 1);
          }
          if (!reviewDate) continue;
          const daysUntilReview = Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          // Only create task if review is within 30 days and not overdue
          if (daysUntilReview < 0 || daysUntilReview > 30) continue;
          const taskName = `SOP Review Due: ${sop.title || "SOP"} (${sop.ref_code || "N/A"})`;
          // Check if task already exists
          const { data: existing } = await supabase.from("checklist_tasks").select("id").eq("site_id", sop.site_id).eq("due_date", todayString).contains("task_data", {
            source_type: "sop_review",
            sop_id: sop.id
          }).limit(1);
          if (existing && existing.length > 0) continue;
          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: sopTemplate.id,
            company_id: sop.company_id,
            site_id: sop.site_id,
            custom_name: taskName,
            due_date: todayString,
            status: "pending",
            generated_at: today.toISOString(),
            task_data: {
              source_type: "sop_review",
              sop_id: sop.id,
              review_date: reviewDate.toISOString().split("T")[0],
              days_until_review: daysUntilReview
            }
          });
          if (!error) log.sop_review_tasks_created++;
        }
      }
    } catch (e) {
      log.errors.push(`Error processing SOP review tasks: ${e}`);
    }
    // ========================================================================
    // 8. RISK ASSESSMENT REVIEW TASKS (30 days before review date)
    // ========================================================================
    try {
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysString = thirtyDaysFromNow.toISOString().split("T")[0];
      const { data: raTemplate } = await supabase.from("task_templates").select("id").eq("slug", "ra-review-generic").single();
      if (raTemplate) {
        // Fetch RAs that need review
        const { data: riskAssessments } = await supabase.from("risk_assessments").select("id, title, ref_code, company_id, site_id, next_review_date, status").not("next_review_date", "is", null).neq("status", "Archived").gte("next_review_date", todayString).lte("next_review_date", thirtyDaysString);
        for (const ra of riskAssessments || []){
          if (!ra.next_review_date) continue;
          const reviewDate = new Date(ra.next_review_date);
          const daysUntilReview = Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          // Only create task if review is within 30 days
          if (daysUntilReview < 0 || daysUntilReview > 30) continue;
          const taskName = `Risk Assessment Review Due: ${ra.title || "RA"} (${ra.ref_code || "N/A"})`;
          // Check if task already exists
          const { data: existing } = await supabase.from("checklist_tasks").select("id").eq("site_id", ra.site_id).eq("due_date", todayString).contains("task_data", {
            source_type: "ra_review",
            ra_id: ra.id
          }).limit(1);
          if (existing && existing.length > 0) continue;
          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: raTemplate.id,
            company_id: ra.company_id,
            site_id: ra.site_id,
            custom_name: taskName,
            due_date: todayString,
            status: "pending",
            generated_at: today.toISOString(),
            task_data: {
              source_type: "ra_review",
              ra_id: ra.id,
              review_date: ra.next_review_date,
              days_until_review: daysUntilReview
            }
          });
          if (!error) log.ra_review_tasks_created++;
        }
      }
    } catch (e) {
      log.errors.push(`Error processing RA review tasks: ${e}`);
    }
    // ========================================================================
    // 9. MESSAGING TASKS (from messaging module)
    // ========================================================================
    try {
      // Fetch tasks created from messages that are due today
      const { data: messagingTasks } = await supabase.from("tasks").select("id, name, company_id, site_id, due_date, assigned_to, status, created_from_message_id, notes, linked_asset_id").not("created_from_message_id", "is", null).eq("due_date", todayString).in("status", [
        "todo",
        "pending",
        "in_progress"
      ]); // Only sync active tasks
      if (messagingTasks && messagingTasks.length > 0) {
        // Get a generic template for messaging tasks (or create one if needed)
        let { data: messagingTemplate } = await supabase.from("task_templates").select("id").eq("slug", "messaging-task-generic").single();
        // If template doesn't exist, we'll create tasks without template_id
        for (const msgTask of messagingTasks){
          // Check if task already exists in checklist_tasks
          const { data: existing } = await supabase.from("checklist_tasks").select("id").eq("site_id", msgTask.site_id).eq("due_date", todayString).contains("task_data", {
            source_type: "messaging_task",
            source_id: msgTask.id
          }).limit(1);
          if (existing && existing.length > 0) continue;
          // Create task in checklist_tasks
          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: messagingTemplate?.id || null,
            company_id: msgTask.company_id,
            site_id: msgTask.site_id,
            custom_name: msgTask.name,
            custom_instructions: msgTask.notes || null,
            due_date: todayString,
            due_time: null,
            daypart: "anytime",
            status: msgTask.status === "in_progress" ? "in_progress" : "pending",
            assigned_to_user_id: msgTask.assigned_to || null,
            generated_at: today.toISOString(),
            task_data: {
              source_type: "messaging_task",
              source_id: msgTask.id,
              original_task_id: msgTask.id,
              linked_asset_id: msgTask.linked_asset_id || null
            }
          });
          if (!error) log.messaging_tasks_created++;
        }
      }
    } catch (e) {
      log.errors.push(`Error processing messaging tasks: ${e}`);
    }
    // ========================================================================
    // 10. DOCUMENT/POLICY EXPIRY TASKS (30 days before expiry)
    // ========================================================================
    try {
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysString = thirtyDaysFromNow.toISOString().split("T")[0];
      // Get document review template
      const { data: docTemplate } = await supabase.from("task_templates").select("id").eq("slug", "document-review-generic").single();
      if (docTemplate) {
        // Fetch global_documents with expiry dates within 30 days
        const { data: expiringDocs } = await supabase.from("global_documents").select("id, name, category, expiry_date, company_id, version").not("expiry_date", "is", null).gte("expiry_date", todayString).lte("expiry_date", thirtyDaysString).eq("is_active", true);
        for (const doc of expiringDocs || []){
          if (!doc.expiry_date) continue;
          const expiryDate = new Date(doc.expiry_date);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          // Only create task if expiry is within 30 days
          if (daysUntilExpiry < 0 || daysUntilExpiry > 30) continue;
          const versionText = doc.version ? ` (v${doc.version})` : "";
          const taskName = `Document Review Due: ${doc.name}${versionText} - ${doc.category}`;
          // Check if task already exists
          const { data: existing } = await supabase.from("checklist_tasks").select("id").eq("company_id", doc.company_id).eq("due_date", todayString).contains("task_data", {
            source_type: "document_expiry",
            document_id: doc.id
          }).limit(1);
          if (existing && existing.length > 0) continue;
          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: docTemplate.id,
            company_id: doc.company_id,
            site_id: null,
            custom_name: taskName,
            due_date: todayString,
            status: "pending",
            generated_at: today.toISOString(),
            task_data: {
              source_type: "document_expiry",
              document_id: doc.id,
              document_name: doc.name,
              document_category: doc.category,
              expiry_date: doc.expiry_date,
              days_until_expiry: daysUntilExpiry
            }
          });
          if (!error) log.document_expiry_tasks_created++;
        }
      }
    } catch (e) {
      log.errors.push(`Error processing document expiry tasks: ${e}`);
    }
    // ========================================================================
    // 11. CALLOUT FOLLOW-UP TASKS
    // ========================================================================
    try {
      const { data: callouts } = await supabase.from("callouts").select("id, site_id, company_id, asset_id, fault_description, status").eq("status", "open");
      const { data: calloutTemplate } = await supabase.from("task_templates").select("id").eq("slug", "callout-followup-generic").single();
      if (calloutTemplate) {
        for (const callout of callouts || []){
          // Get asset name if asset_id exists, otherwise use fault_description
          let calloutName = "Callout";
          if (callout.asset_id) {
            const { data: asset } = await supabase.from("assets").select("name").eq("id", callout.asset_id).single();
            calloutName = asset?.name || "Asset";
          } else if (callout.fault_description) {
            calloutName = callout.fault_description.substring(0, 30) + "...";
          }
          const taskName = `Follow up: ${calloutName} Callout`;
          const { data: existing } = await supabase.from("checklist_tasks").select("id").eq("custom_name", taskName).eq("site_id", callout.site_id).eq("due_date", todayString).limit(1);
          if (existing && existing.length > 0) continue;
          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: calloutTemplate.id,
            company_id: callout.company_id,
            site_id: callout.site_id,
            custom_name: taskName,
            due_date: todayString,
            status: "pending",
            generated_at: today.toISOString(),
            task_data: {
              source_type: "callout_followup",
              source_id: callout.id
            }
          });
          if (!error) log.callout_tasks_created++;
        }
      }
    } catch (e) {
      log.errors.push(`Error processing callout tasks: ${e}`);
    }
    // ========================================================================
    // RETURN RESPONSE
    // ========================================================================
    return new Response(JSON.stringify({
      success: true,
      timestamp: today.toISOString(),
      ...log,
      total_tasks_created: log.daily_tasks_created + log.weekly_tasks_created + log.monthly_tasks_created + log.annual_tasks_created + log.ppm_tasks_created + log.callout_tasks_created + log.certificate_tasks_created + log.sop_review_tasks_created + log.ra_review_tasks_created + log.messaging_tasks_created + log.document_expiry_tasks_created
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
