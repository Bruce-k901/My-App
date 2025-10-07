// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";

// Deletes or archives old tasks beyond a retention window.
// Schedule via Supabase cron: daily at 03:00.
// Adjust RETENTION_DAYS as needed.

const RETENTION_DAYS = Number(Deno.env.get("TASK_RETENTION_DAYS") || 90);

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const cutoff = daysAgo(RETENTION_DAYS);

  // Hard delete tasks older than retention window. Alternatively move to an archive table.
  const { error } = await supabase
    .from("tasks")
    .delete()
    .lt("due_date", cutoff);

  if (error) return new Response(`Cleanup error: ${error.message}`, { status: 500 });
  return new Response(JSON.stringify({ deleted_before: cutoff }), {
    headers: { "Content-Type": "application/json" },
  });
});