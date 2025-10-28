import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TaskGenerationLog {
  run_date: Date;
  daily_tasks_created: number;
  weekly_tasks_created: number;
  monthly_tasks_created: number;
  triggered_tasks_created: number;
  errors: string[];
}

serve(async (req: Request) => {
  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Verify request has auth (for security)
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
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
        const { data: sites, error: sitesError } = await supabase
          .from("sites")
          .select("id, company_id")
          .eq("is_active", true);

        if (sitesError) {
          log.errors.push(`Failed to fetch sites: ${sitesError.message}`);
          continue;
        }

        // Filter sites if template is site-specific
        const targetSites = template.site_id
          ? sites?.filter((s) => s.id === template.site_id)
          : sites;

        for (const site of targetSites || []) {
          // Check if task already exists for today (prevent duplicates)
          const today = new Date().toISOString().split("T")[0];

          const { data: existingTask } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("template_id", template.id)
            .eq("site_id", site.id)
            .eq("due_date", today)
            .single();

          if (existingTask) {
            continue; // Task already exists
          }

          // Create task
          const { error: insertError } = await supabase
            .from("checklist_tasks")
            .insert({
              template_id: template.id,
              company_id: site.company_id,
              site_id: site.id,
              due_date: today,
              due_time: template.time_of_day,
              daypart: template.dayparts?.[0] || "before_open",
              assigned_to_role: template.assigned_to_role,
              assigned_to_user_id: template.assigned_to_user_id,
              status: "pending",
              priority: template.is_critical ? "critical" : "medium",
              generated_at: new Date(),
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires tomorrow
            });

          if (insertError) {
            log.errors.push(
              `Failed to create daily task for template ${template.id}: ${insertError.message}`
            );
          } else {
            log.daily_tasks_created++;
          }
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
        const pattern = template.recurrence_pattern as {
          weeks?: number[];
        } | null;

        // Default: run on Monday (1)
        const targetDays = pattern?.weeks || [1];

        if (!targetDays.includes(dayOfWeek)) {
          continue; // Not today
        }

        // Same logic as daily: create tasks for all sites
        const { data: sites } = await supabase
          .from("sites")
          .select("id, company_id")
          .eq("is_active", true);

        const targetSites = template.site_id
          ? sites?.filter((s) => s.id === template.site_id)
          : sites;

        for (const site of targetSites || []) {
          const today = new Date().toISOString().split("T")[0];

          const { data: existingTask } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("template_id", template.id)
            .eq("site_id", site.id)
            .eq("due_date", today)
            .single();

          if (existingTask) continue;

          const { error: insertError } = await supabase
            .from("checklist_tasks")
            .insert({
              template_id: template.id,
              company_id: site.company_id,
              site_id: site.id,
              due_date: today,
              due_time: template.time_of_day,
              daypart: template.dayparts?.[0] || "anytime",
              assigned_to_role: template.assigned_to_role,
              status: "pending",
              priority: template.is_critical ? "critical" : "medium",
              generated_at: new Date(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 1 week
            });

          if (insertError) {
            log.errors.push(
              `Failed to create weekly task for template ${template.id}: ${insertError.message}`
            );
          } else {
            log.weekly_tasks_created++;
          }
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

        // Create tasks for all sites
        const { data: sites } = await supabase
          .from("sites")
          .select("id, company_id")
          .eq("is_active", true);

        const targetSites = template.site_id
          ? sites?.filter((s) => s.id === template.site_id)
          : sites;

        for (const site of targetSites || []) {
          const today = new Date().toISOString().split("T")[0];

          const { data: existingTask } = await supabase
            .from("checklist_tasks")
            .select("id")
            .eq("template_id", template.id)
            .eq("site_id", site.id)
            .eq("due_date", today)
            .single();

          if (existingTask) continue;

          const { error: insertError } = await supabase
            .from("checklist_tasks")
            .insert({
              template_id: template.id,
              company_id: site.company_id,
              site_id: site.id,
              due_date: today,
              due_time: template.time_of_day,
              daypart: template.dayparts?.[0] || "anytime",
              assigned_to_role: template.assigned_to_role,
              status: "pending",
              priority: template.is_critical ? "critical" : "medium",
              generated_at: new Date(),
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
            });

          if (insertError) {
            log.errors.push(
              `Failed to create monthly task for template ${template.id}: ${insertError.message}`
            );
          } else {
            log.monthly_tasks_created++;
          }
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
          .eq("is_active", true)
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
            const { error: insertError } = await supabase
              .from("checklist_tasks")
              .insert({
                template_id: ppmTemplate.id,
                company_id: asset.company_id,
                site_id: asset.site_id,
                asset_id: asset.id,
                due_date: today,
                status: "pending",
                priority: "high",
                generated_at: new Date(),
              });

            if (insertError) {
              log.errors.push(
                `Failed to create PPM task for asset ${asset.id}: ${insertError.message}`
              );
            } else {
              log.triggered_tasks_created++;
            }
          }
        }
      }
    } catch (e) {
      log.errors.push(`Error processing triggered tasks: ${e}`);
    }

    // ===== STEP 5: Clean Up Expired Tasks =====
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
