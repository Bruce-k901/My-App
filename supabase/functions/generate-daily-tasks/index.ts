// ============================================================================
// REBUILT EDGE FUNCTION: generate-daily-tasks
// ============================================================================
// Reads from site_checklists (configurations) and creates checklist_tasks (instances)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
      errors: [] as string[]
    };

    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    const todayDayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    async function taskExists(
      siteChecklistId: string,
      dueDate: string,
      dueTime: string | null
    ): Promise<boolean> {
      let query = supabase
        .from("checklist_tasks")
        .select("id")
        .eq("site_checklist_id", siteChecklistId)
        .eq("due_date", dueDate)
        .limit(1);

      if (dueTime) {
        query = query.eq("due_time", dueTime);
      }

      const { data, error } = await query;
      
      if (error || !data || data.length === 0) {
        return false;
      }
      
      return true;
    }

    async function createTask(params: {
      siteChecklistId: string;
      templateId: string;
      companyId: string;
      siteId: string;
      dueDate: string;
      dueTime: string | null;
      daypart: string | null;
      equipmentConfig?: any;
      template?: any; // Template data to get repeatable_field_name
    }): Promise<boolean> {
      // Build task_data from equipment_config and template
      // Always initialize taskData as an object to ensure features can be added
      let taskData: Record<string, any> = {};
      
      // ========================================================================
      // 1. POPULATE CHECKLIST ITEMS FROM TEMPLATE
      // ========================================================================
      if (params.template) {
        // Parse recurrence_pattern (could be string or object)
        let recurrencePattern = params.template.recurrence_pattern;
        if (typeof recurrencePattern === 'string') {
          try {
            recurrencePattern = JSON.parse(recurrencePattern);
          } catch (e) {
            console.error('Failed to parse recurrence_pattern:', e);
            recurrencePattern = null;
          }
        }
        
        // Get default checklist items from template
        const defaultChecklistItems = recurrencePattern?.default_checklist_items || [];
        const evidenceTypes = params.template.evidence_types || [];
        const hasYesNoChecklist = evidenceTypes.includes('yes_no_checklist');
        const hasTemperature = evidenceTypes.includes('temperature');
        
        // Populate checklist items based on evidence type
        if (Array.isArray(defaultChecklistItems) && defaultChecklistItems.length > 0) {
          if (hasYesNoChecklist) {
            // Yes/No checklist format
            taskData.yesNoChecklistItems = defaultChecklistItems.map((item: any) => ({
              text: typeof item === 'string' ? item : (item.text || item.label || ''),
              answer: null as 'yes' | 'no' | null
            })).filter((item: { text: string }) => item.text && item.text.trim().length > 0);
          } else {
            // Regular checklist format
            taskData.checklistItems = defaultChecklistItems.map((item: any) => 
              typeof item === 'string' ? item : (item.text || item.label || '')
            ).filter((item: string) => item && item.trim().length > 0);
          }
        }
        
      }
      
      // ========================================================================
      // 2. POPULATE EQUIPMENT/ASSET DATA
      // ========================================================================
      console.log('🔧 [EDGE FUNCTION] Processing equipment_config:', {
        hasEquipmentConfig: !!params.equipmentConfig,
        equipmentConfigType: typeof params.equipmentConfig,
        equipmentConfigIsArray: Array.isArray(params.equipmentConfig),
        equipmentConfigLength: Array.isArray(params.equipmentConfig) ? params.equipmentConfig.length : 'N/A',
        templateId: params.templateId,
        templateName: params.template?.name,
        repeatableFieldName: params.template?.repeatable_field_name
      })
      
      if (params.equipmentConfig && Array.isArray(params.equipmentConfig) && params.equipmentConfig.length > 0) {
        // Handle both cases: array of IDs (strings) or array of objects
        const isArrayOfIds = typeof params.equipmentConfig[0] === 'string';
        
        console.log('🔧 [EDGE FUNCTION] Equipment config is array of IDs:', isArrayOfIds, 'length:', params.equipmentConfig.length)
        
        // Extract selected asset IDs
        const selectedAssets = isArrayOfIds
          ? params.equipmentConfig.filter((id: any) => typeof id === 'string' && id.length > 0)
          : params.equipmentConfig
              .map((item: any) => item.id || item.asset_id || item.value || (typeof item === 'string' ? item : null))
              .filter(Boolean);
        
        console.log('🔧 [EDGE FUNCTION] Extracted selectedAssets:', {
          count: selectedAssets.length,
          assets: selectedAssets.slice(0, 5) // Log first 5
        })
        
        if (selectedAssets.length > 0) {
          taskData.selectedAssets = selectedAssets;
        }
        
        // Map equipment_config to repeatable field if template has one
        if (params.template?.repeatable_field_name) {
          const repeatableFieldName = params.template.repeatable_field_name;
          
          if (isArrayOfIds) {
            // If it's an array of IDs, create objects with just the ID
            taskData[repeatableFieldName] = params.equipmentConfig.map((id: string) => ({
              value: id,
              asset_id: id,
              id: id
            }));
          } else {
            // If it's an array of objects, map them properly
            taskData[repeatableFieldName] = params.equipmentConfig.map((item: any) => ({
              value: item.id || item.asset_id || item.value || item,
              asset_id: item.id || item.asset_id || item.value || item,
              id: item.id || item.asset_id || item.value || item,
              nickname: item.nickname || item.equipment || null,
              equipment: item.equipment || item.name || null,
              asset_name: item.name || item.equipment || null
            }));
          }
          
          console.log('🔧 [EDGE FUNCTION] Mapped to repeatable field:', {
            fieldName: repeatableFieldName,
            count: taskData[repeatableFieldName]?.length || 0
          })
        }
        
        // Preserve any other fields from equipment_config (only if it's an array of objects)
        if (!isArrayOfIds && params.equipmentConfig[0] && typeof params.equipmentConfig[0] === 'object') {
          // Check if there are temperature fields
          const firstItem = params.equipmentConfig[0];
          if (firstItem.temp !== undefined || firstItem.temperature !== undefined) {
            taskData.temperatures = params.equipmentConfig.map((item: any) => ({
              assetId: item.id || item.asset_id || item.value,
              temp: item.temp || item.temperature || null,
              nickname: item.nickname || null
            }));
          }
        }
      } else {
        console.warn('⚠️ [EDGE FUNCTION] No equipment_config or equipment_config is empty:', {
          hasEquipmentConfig: !!params.equipmentConfig,
          equipmentConfigType: typeof params.equipmentConfig,
          equipmentConfigIsArray: Array.isArray(params.equipmentConfig),
          equipmentConfigLength: Array.isArray(params.equipmentConfig) ? params.equipmentConfig.length : 'N/A'
        })
      }
      
      // ========================================================================
      // 3. INITIALIZE TEMPERATURE ARRAY FOR TEMPLATES WITH TEMPERATURE EVIDENCE
      // ========================================================================
      // If template has temperature evidence type but temperatures haven't been populated yet,
      // initialize it based on selected assets
      if (params.template?.evidence_types?.includes('temperature')) {
        // Only initialize if temperatures array doesn't exist or is empty
        if (!taskData.temperatures || (Array.isArray(taskData.temperatures) && taskData.temperatures.length === 0)) {
          if (taskData.selectedAssets && Array.isArray(taskData.selectedAssets) && taskData.selectedAssets.length > 0) {
            // Initialize temperatures array with one entry per selected asset
            taskData.temperatures = taskData.selectedAssets.map((assetId: string) => ({
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
      
      // DEBUG: Log what we're about to save
      console.log('💾 [EDGE FUNCTION] Creating task with task_data:', {
        templateId: params.templateId,
        templateName: params.template?.name,
        hasTaskData: !!taskData,
        taskDataKeys: taskData ? Object.keys(taskData) : [],
        selectedAssets: taskData?.selectedAssets,
        selectedAssetsCount: Array.isArray(taskData?.selectedAssets) ? taskData.selectedAssets.length : 0,
        repeatableField: params.template?.repeatable_field_name,
        repeatableFieldValue: taskData?.[params.template?.repeatable_field_name || ''],
        repeatableFieldValueCount: Array.isArray(taskData?.[params.template?.repeatable_field_name || '']) ? taskData[params.template?.repeatable_field_name || ''].length : 0,
        checklistItems: taskData?.checklistItems,
        checklistItemsCount: Array.isArray(taskData?.checklistItems) ? taskData.checklistItems.length : 0,
        yesNoChecklistItems: taskData?.yesNoChecklistItems,
        yesNoChecklistItemsCount: Array.isArray(taskData?.yesNoChecklistItems) ? taskData.yesNoChecklistItems.length : 0,
        temperatures: taskData?.temperatures,
        temperaturesCount: Array.isArray(taskData?.temperatures) ? taskData.temperatures.length : 0
      })
      
      const { error } = await supabase.from("checklist_tasks").insert({
        site_checklist_id: params.siteChecklistId,
        template_id: params.templateId,
        company_id: params.companyId,
        site_id: params.siteId,
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

    const { data: dailyConfigs, error: dailyError } = await supabase
      .from("site_checklists")
      .select("*, task_templates(*)")
      .eq("frequency", "daily")
      .eq("active", true);

    if (dailyError) {
      log.errors.push(`Failed to fetch daily configs: ${dailyError.message}`);
    }

    for (const config of dailyConfigs || []) {
      try {
        // Multi-time tasks (SFBB temp checks)
        if (config.daypart_times && typeof config.daypart_times === 'object') {
          for (const [daypart, times] of Object.entries(config.daypart_times)) {
            const timeArray = Array.isArray(times) ? times : [times];
            for (const time of timeArray) {
              if (await taskExists(config.id, todayString, time)) continue;

              const success = await createTask({
                siteChecklistId: config.id,
                templateId: config.template_id,
                companyId: config.company_id,
                siteId: config.site_id,
                dueDate: todayString,
                dueTime: time,
                daypart: daypart,
                equipmentConfig: config.equipment_config,
                template: config.task_templates
              });

              if (success) log.daily_tasks_created++;
            }
          }
        }
        // Simple single-time tasks
        else {
          const time = config.task_templates?.time_of_day || "12:00";
          const daypart = config.task_templates?.dayparts?.[0] || "anytime";

          if (await taskExists(config.id, todayString, time)) continue;

          const success = await createTask({
            siteChecklistId: config.id,
            templateId: config.template_id,
            companyId: config.company_id,
            siteId: config.site_id,
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

    const { data: weeklyConfigs } = await supabase
      .from("site_checklists")
      .select("*, task_templates(*)")
      .eq("frequency", "weekly")
      .eq("active", true);

    for (const config of weeklyConfigs || []) {
      try {
        const scheduledDays = config.days_of_week || [1]; // Default Monday
        if (!scheduledDays.includes(todayDayOfWeek)) continue;

        if (await taskExists(config.id, todayString, null)) continue;

        const success = await createTask({
          siteChecklistId: config.id,
          templateId: config.template_id,
          companyId: config.company_id,
          siteId: config.site_id,
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

    const { data: monthlyConfigs } = await supabase
      .from("site_checklists")
      .select("*, task_templates(*)")
      .eq("frequency", "monthly")
      .eq("active", true);

    const todayDate = today.getDate();

    for (const config of monthlyConfigs || []) {
      try {
        const scheduledDate = config.date_of_month || 1;
        if (todayDate !== scheduledDate) continue;

        if (await taskExists(config.id, todayString, null)) continue;

        const success = await createTask({
          siteChecklistId: config.id,
          templateId: config.template_id,
          companyId: config.company_id,
          siteId: config.site_id,
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

    const { data: annualConfigs } = await supabase
      .from("site_checklists")
      .select("*, task_templates(*)")
      .eq("frequency", "annually")
      .eq("active", true);

    for (const config of annualConfigs || []) {
      try {
        if (!config.anniversary_date) continue;

        const anniversaryDate = new Date(config.anniversary_date);
        const anniversaryMonth = anniversaryDate.getMonth();
        const anniversaryDay = anniversaryDate.getDate();
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();

        // Check if today matches the anniversary date
        if (todayMonth !== anniversaryMonth || todayDay !== anniversaryDay) continue;

        if (await taskExists(config.id, todayString, null)) continue;

        const success = await createTask({
          siteChecklistId: config.id,
          templateId: config.template_id,
          companyId: config.company_id,
          siteId: config.site_id,
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
    // 5. PPM OVERDUE TASKS (System-generated)
    // ========================================================================

    try {
      const sixMonthsAgo = new Date(today);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: overdueAssets } = await supabase
        .from("assets")
        .select("id, site_id, company_id, name")
        .or(`last_service_date.lt.${sixMonthsAgo.toISOString()},next_service_date.lte.${todayString}`)
        .eq("status", "active");

      const { data: ppmTemplate } = await supabase
        .from("task_templates")
        .select("id")
        .eq("slug", "ppm-overdue-generic")
        .single();

      if (ppmTemplate) {
        for (const asset of overdueAssets || []) {
          const taskName = `PPM Required: ${asset.name}`;

          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("custom_name", taskName)
            .eq("site_id", asset.site_id)
            .eq("due_date", todayString)
            .limit(1);

          if (existing && existing.length > 0) continue;

          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: ppmTemplate.id,
            company_id: asset.company_id,
            site_id: asset.site_id,
            custom_name: taskName,
            due_date: todayString,
            status: "pending",
            generated_at: today.toISOString(),
            task_data: { source_type: "ppm_overdue", source_id: asset.id }
          });

          if (!error) log.ppm_tasks_created++;
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
      const { data: certTemplate } = await supabase
        .from("task_templates")
        .select("id")
        .eq("slug", "certificate-renewal-generic")
        .single();

      if (certTemplate) {
        // Fetch all profiles - we'll filter in code for certificates expiring within 30 days
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, site_id, company_id, food_safety_expiry_date, h_and_s_expiry_date, fire_marshal_expiry_date, first_aid_expiry_date, cossh_expiry_date, food_safety_level, h_and_s_level");

        for (const profile of allProfiles || []) {
          // Check each certificate type
          const certificates = [
            { type: "food_safety", date: profile.food_safety_expiry_date, level: profile.food_safety_level },
            { type: "h_and_s", date: profile.h_and_s_expiry_date, level: profile.h_and_s_level },
            { type: "fire_marshal", date: profile.fire_marshal_expiry_date },
            { type: "first_aid", date: profile.first_aid_expiry_date },
            { type: "cossh", date: profile.cossh_expiry_date }
          ];

          for (const cert of certificates) {
            if (!cert.date) continue;

            const expiryDate = new Date(cert.date);
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            // Only create task if expiry is within 30 days and not already expired
            if (daysUntilExpiry < 0 || daysUntilExpiry > 30) continue;

            const certTypeLabel = cert.type === "food_safety" ? "Food Safety" :
                                 cert.type === "h_and_s" ? "Health & Safety" :
                                 cert.type === "fire_marshal" ? "Fire Marshal" :
                                 cert.type === "first_aid" ? "First Aid" : "COSHH";

            const levelText = cert.level ? ` Level ${cert.level}` : "";
            const taskName = `${certTypeLabel}${levelText} Certificate Expiring: ${profile.full_name || "Staff Member"}`;

            // Check if task already exists (check by source_id to avoid duplicates)
            const { data: existing } = await supabase
              .from("checklist_tasks")
              .select("id")
              .eq("site_id", profile.site_id)
              .eq("due_date", todayString)
              .contains("task_data", { source_type: "certificate_expiry", certificate_type: cert.type, profile_id: profile.id })
              .limit(1);

            if (existing && existing.length > 0) continue;

            // Create task TODAY (so it appears in Today's Tasks)
            // The actual expiry date is stored in task_data

            const { error } = await supabase.from("checklist_tasks").insert({
              template_id: certTemplate.id,
              company_id: profile.company_id,
              site_id: profile.site_id,
              custom_name: taskName,
              due_date: todayString, // Always create for today
                status: "pending",
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
    } catch (e) {
      log.errors.push(`Error processing certificate expiry tasks: ${e}`);
    }

    // ========================================================================
    // 7. SOP REVIEW TASKS (30 days before review date)
    // ========================================================================

    try {
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysString = thirtyDaysFromNow.toISOString().split("T")[0];

      const { data: sopTemplate } = await supabase
        .from("task_templates")
        .select("id")
        .eq("slug", "sop-review-generic")
        .single();

      if (sopTemplate) {
        // Fetch SOPs that need review (check review_date field or calculate from updated_at + 1 year)
        const { data: sops } = await supabase
          .from("sop_entries")
          .select("id, title, ref_code, company_id, site_id, sop_data, updated_at, created_at");

        for (const sop of sops || []) {
          // Calculate review date: use review_date from sop_data, or updated_at + 1 year, or created_at + 1 year
          let reviewDate: Date | null = null;
          
          if (sop.sop_data && typeof sop.sop_data === 'object' && (sop.sop_data as any).review_date) {
            reviewDate = new Date((sop.sop_data as any).review_date);
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

          // Check if task already exists (check by source_id to avoid duplicates)
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("site_id", sop.site_id)
            .eq("due_date", todayString)
            .contains("task_data", { source_type: "sop_review", sop_id: sop.id })
            .limit(1);

          if (existing && existing.length > 0) continue;

          // Create task TODAY (so it appears in Today's Tasks)
          // The actual review date is stored in task_data

          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: sopTemplate.id,
            company_id: sop.company_id,
            site_id: sop.site_id,
            custom_name: taskName,
            due_date: todayString, // Always create for today
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

      const { data: raTemplate } = await supabase
        .from("task_templates")
        .select("id")
        .eq("slug", "ra-review-generic")
        .single();

      if (raTemplate) {
        // Fetch RAs that need review
        const { data: riskAssessments } = await supabase
          .from("risk_assessments")
          .select("id, title, ref_code, company_id, site_id, next_review_date, status")
          .not("next_review_date", "is", null)
          .neq("status", "Archived")
          .gte("next_review_date", todayString)
          .lte("next_review_date", thirtyDaysString);

        for (const ra of riskAssessments || []) {
          if (!ra.next_review_date) continue;

          const reviewDate = new Date(ra.next_review_date);
          const daysUntilReview = Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // Only create task if review is within 30 days
          if (daysUntilReview < 0 || daysUntilReview > 30) continue;

          const taskName = `Risk Assessment Review Due: ${ra.title || "RA"} (${ra.ref_code || "N/A"})`;

          // Check if task already exists (check by source_id to avoid duplicates)
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("site_id", ra.site_id)
            .eq("due_date", todayString)
            .contains("task_data", { source_type: "ra_review", ra_id: ra.id })
            .limit(1);

          if (existing && existing.length > 0) continue;

          // Create task TODAY (so it appears in Today's Tasks)
          // The actual review date is stored in task_data

          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: raTemplate.id,
            company_id: ra.company_id,
            site_id: ra.site_id,
            custom_name: taskName,
            due_date: todayString, // Always create for today
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
      // These are in the 'tasks' table, we need to sync them to 'checklist_tasks'
      // Note: tasks table uses 'name' and 'notes', not 'title' and 'description'
      const { data: messagingTasks } = await supabase
        .from("tasks")
        .select("id, name, company_id, site_id, due_date, assigned_to, status, created_from_message_id, notes, linked_asset_id")
        .not("created_from_message_id", "is", null)
        .eq("due_date", todayString)
        .in("status", ["todo", "pending", "in_progress"]); // Only sync active tasks

      if (messagingTasks && messagingTasks.length > 0) {
        // Get a generic template for messaging tasks (or create one if needed)
        let { data: messagingTemplate } = await supabase
          .from("task_templates")
          .select("id")
          .eq("slug", "messaging-task-generic")
          .single();

        // If template doesn't exist, we'll create tasks without template_id
        // (they'll still appear in Today's Tasks)

        for (const msgTask of messagingTasks) {
          // Check if task already exists in checklist_tasks
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("site_id", msgTask.site_id)
            .eq("due_date", todayString)
            .contains("task_data", { source_type: "messaging_task", source_id: msgTask.id })
            .limit(1);

          if (existing && existing.length > 0) continue;

          // Create task in checklist_tasks
          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: messagingTemplate?.id || null,
            company_id: msgTask.company_id,
            site_id: msgTask.site_id,
            custom_name: msgTask.name,
            custom_instructions: msgTask.notes || null,
            due_date: todayString,
            due_time: null, // Messaging tasks don't have specific times
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
      const { data: docTemplate } = await supabase
        .from("task_templates")
        .select("id")
        .eq("slug", "document-review-generic")
        .single();

      if (docTemplate) {
        // Fetch global_documents with expiry dates within 30 days
        const { data: expiringDocs } = await supabase
          .from("global_documents")
          .select("id, name, category, expiry_date, company_id, version")
          .not("expiry_date", "is", null)
          .gte("expiry_date", todayString)
          .lte("expiry_date", thirtyDaysString)
          .eq("is_active", true);

        for (const doc of expiringDocs || []) {
          if (!doc.expiry_date) continue;

          const expiryDate = new Date(doc.expiry_date);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // Only create task if expiry is within 30 days
          if (daysUntilExpiry < 0 || daysUntilExpiry > 30) continue;

          const versionText = doc.version ? ` (v${doc.version})` : "";
          const taskName = `Document Review Due: ${doc.name}${versionText} - ${doc.category}`;

          // Check if task already exists
          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("company_id", doc.company_id)
            .eq("due_date", todayString)
            .contains("task_data", { source_type: "document_expiry", document_id: doc.id })
            .limit(1);

          if (existing && existing.length > 0) continue;

          // Create task TODAY (so it appears in Today's Tasks)
          // The actual expiry date is stored in task_data
          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: docTemplate.id,
            company_id: doc.company_id,
            site_id: null, // Documents are company-wide, not site-specific
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
      const { data: callouts } = await supabase
        .from("callouts")
        .select("id, site_id, company_id, asset_id, fault_description, status")
        .eq("status", "open");

      const { data: calloutTemplate } = await supabase
        .from("task_templates")
        .select("id")
        .eq("slug", "callout-followup-generic")
        .single();

      if (calloutTemplate) {
        for (const callout of callouts || []) {
          // Get asset name if asset_id exists, otherwise use fault_description
          let calloutName = 'Callout';
          if (callout.asset_id) {
            const { data: asset } = await supabase
              .from("assets")
              .select("name")
              .eq("id", callout.asset_id)
              .single();
            calloutName = asset?.name || 'Asset';
          } else if (callout.fault_description) {
            calloutName = callout.fault_description.substring(0, 30) + '...';
          }
          
          const taskName = `Follow up: ${calloutName} Callout`;

          const { data: existing } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("custom_name", taskName)
            .eq("site_id", callout.site_id)
            .eq("due_date", todayString)
            .limit(1);

          if (existing && existing.length > 0) continue;

          const { error } = await supabase.from("checklist_tasks").insert({
            template_id: calloutTemplate.id,
            company_id: callout.company_id,
            site_id: callout.site_id,
            custom_name: taskName,
            due_date: todayString,
            status: "pending",
            generated_at: today.toISOString(),
            task_data: { source_type: "callout_followup", source_id: callout.id }
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

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: today.toISOString(),
        ...log,
        total_tasks_created:
          log.daily_tasks_created +
          log.weekly_tasks_created +
          log.monthly_tasks_created +
          log.annual_tasks_created +
          log.ppm_tasks_created +
          log.callout_tasks_created +
          log.certificate_tasks_created +
          log.sop_review_tasks_created +
          log.ra_review_tasks_created +
          log.messaging_tasks_created +
          log.document_expiry_tasks_created
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
