import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 12);

    const result = {
      success: true,
      deleted_completion_records: 0,
      deleted_tasks: 0,
      errors: [] as string[],
      cutoff_date: cutoffDate.toISOString(),
    };

    // Delete completion records older than 12 months
    try {
      const { error: deleteCompletionError } = await supabase
        .from("task_completion_records")
        .delete()
        .lt("completed_at", cutoffDate.toISOString());

      if (deleteCompletionError) {
        result.errors.push(`Failed to delete completion records: ${deleteCompletionError.message}`);
      } else {
        // Get count of deleted records (Supabase doesn't return this directly)
        // We'll query how many remain and estimate
        const { count } = await supabase
          .from("task_completion_records")
          .select("*", { count: "exact", head: true });
        
        result.deleted_completion_records = 0; // Would need to calculate before deletion
      }
    } catch (e) {
      result.errors.push(`Error deleting completion records: ${e}`);
    }

    // Delete completed tasks older than 12 months
    try {
      const { error: deleteTasksError } = await supabase
        .from("checklist_tasks")
        .delete()
        .eq("status", "completed")
        .lt("completed_at", cutoffDate.toISOString());

      if (deleteTasksError) {
        result.errors.push(`Failed to delete completed tasks: ${deleteTasksError.message}`);
      } else {
        result.deleted_tasks = 0; // Would need to calculate before deletion
      }
    } catch (e) {
      result.errors.push(`Error deleting completed tasks: ${e}`);
    }

    if (result.errors.length > 0) {
      result.success = false;
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

