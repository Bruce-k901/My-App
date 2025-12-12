// ============================================================================
// EDGE FUNCTION: mark-overdue-tasks
// ============================================================================
// Marks tasks as missed based on their completion window
// 
// COMPLETION WINDOWS:
// - Daily tasks: 1 hour after due_time
// - Weekly tasks: 1 day after due_date
// - Monthly tasks: 1 week after due_date
// - PPM tasks: 1 month after due_date
// - Callout follow-ups: 1 day after due_date
//
// BEHAVIOR:
// - Changes status from 'pending' to 'missed'
// - Sets completed_at timestamp so tasks move out of Today's Tasks
// - Tasks appear in Completed Tasks page with red "Missed" badge
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const log = {
      daily_tasks_marked: 0,
      weekly_tasks_marked: 0,
      monthly_tasks_marked: 0,
      ppm_tasks_marked: 0,
      callout_tasks_marked: 0,
      errors: [] as string[]
    };

    const now = new Date();

    async function markTasksMissed(taskIds: string[], taskType: string): Promise<number> {
      if (taskIds.length === 0) return 0;

      const { error } = await supabase
        .from("checklist_tasks")
        .update({ 
          status: "missed",
          updated_at: now.toISOString(),
          completed_at: now.toISOString()
        })
        .in("id", taskIds)
        .eq("status", "pending");

      if (error) {
        log.errors.push('Error marking ' + taskType + ' tasks: ' + error.message);
        return 0;
      }

      return taskIds.length;
    }

    // ========================================================================
    // 1. DAILY TASKS (1 hour after due_time)
    // ========================================================================

    try {
      const oneHourAgo = new Date(now);
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      const oneHourAgoTime = oneHourAgo.toTimeString().substring(0, 5);
      const today = now.toISOString().split("T")[0];

      const { data: dailyTasks } = await supabase
        .from("checklist_tasks")
        .select("id, site_checklists!inner(frequency)")
        .eq("status", "pending")
        .eq("due_date", today)
        .eq("site_checklists.frequency", "daily")
        .lt("due_time", oneHourAgoTime);

      if (dailyTasks && dailyTasks.length > 0) {
        log.daily_tasks_marked = await markTasksMissed(dailyTasks.map(t => t.id), "daily");
      }
    } catch (e) {
      log.errors.push(`Error processing daily tasks: ${e}`);
    }

    // ========================================================================
    // 2. WEEKLY TASKS (1 day after due_date)
    // ========================================================================

    try {
      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const oneDayAgoString = oneDayAgo.toISOString().split("T")[0];

      const { data: weeklyTasks } = await supabase
        .from("checklist_tasks")
        .select("id, site_checklists!inner(frequency)")
        .eq("status", "pending")
        .eq("site_checklists.frequency", "weekly")
        .lt("due_date", oneDayAgoString);

      if (weeklyTasks && weeklyTasks.length > 0) {
        log.weekly_tasks_marked = await markTasksMissed(weeklyTasks.map(t => t.id), "weekly");
      }
    } catch (e) {
      log.errors.push(`Error processing weekly tasks: ${e}`);
    }

    // ========================================================================
    // 3. MONTHLY TASKS (1 week after due_date)
    // ========================================================================

    try {
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoString = oneWeekAgo.toISOString().split("T")[0];

      const { data: monthlyTasks } = await supabase
        .from("checklist_tasks")
        .select("id, site_checklists!inner(frequency)")
        .eq("status", "pending")
        .eq("site_checklists.frequency", "monthly")
        .lt("due_date", oneWeekAgoString);

      if (monthlyTasks && monthlyTasks.length > 0) {
        log.monthly_tasks_marked = await markTasksMissed(monthlyTasks.map(t => t.id), "monthly");
      }
    } catch (e) {
      log.errors.push(`Error processing monthly tasks: ${e}`);
    }

    // ========================================================================
    // 4. PPM TASKS (1 month after due_date)
    // ========================================================================

    try {
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const oneMonthAgoString = oneMonthAgo.toISOString().split("T")[0];

      const { data: ppmTasks } = await supabase
        .from("checklist_tasks")
        .select("id")
        .eq("status", "pending")
        .contains("task_data", { source_type: "ppm_overdue" })
        .lt("due_date", oneMonthAgoString);

      if (ppmTasks && ppmTasks.length > 0) {
        log.ppm_tasks_marked = await markTasksMissed(ppmTasks.map(t => t.id), "PPM");
      }
    } catch (e) {
      log.errors.push(`Error processing PPM tasks: ${e}`);
    }

    // ========================================================================
    // 5. CALLOUT FOLLOW-UP TASKS (1 day after due_date)
    // ========================================================================

    try {
      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const oneDayAgoString = oneDayAgo.toISOString().split("T")[0];

      const { data: calloutTasks } = await supabase
        .from("checklist_tasks")
        .select("id")
        .eq("status", "pending")
        .contains("task_data", { source_type: "callout_followup" })
        .lt("due_date", oneDayAgoString);

      if (calloutTasks && calloutTasks.length > 0) {
        log.callout_tasks_marked = await markTasksMissed(calloutTasks.map(t => t.id), "callout");
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
        timestamp: now.toISOString(),
        ...log,
        total_tasks_marked: 
          log.daily_tasks_marked + 
          log.weekly_tasks_marked + 
          log.monthly_tasks_marked + 
          log.ppm_tasks_marked + 
          log.callout_tasks_marked
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
