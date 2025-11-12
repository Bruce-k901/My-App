// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";

type DayPartConfig = {
  name: string;
  start_time: string;
  end_time: string;
  soft_deadline_offset_minutes: number | null;
};

type TaskRecord = {
  id: string;
  site_id: string | null;
  status: string | null;
  due_date: string | null;
  day_part: string | null;
  completed_at: string | null;
};

const DEFAULT_MARGIN_MINUTES = 60;
const DEFAULT_START = "08:00:00";
const DEFAULT_END = "18:00:00";

function toUtcDate(date: Date, time: string) {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  const clone = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  clone.setUTCHours(hours ?? 0, minutes ?? 0, seconds ?? 0, 0);
  return clone;
}

function addMinutes(date: Date, minutes: number) {
  const clone = new Date(date.getTime());
  clone.setUTCMinutes(clone.getUTCMinutes() + minutes);
  return clone;
}

function getDayPartWindow(
  task: TaskRecord,
  dayPartLookup: Map<string, Map<string, DayPartConfig>>,
  today: Date,
) {
  const siteId = task.site_id ?? "";
  const dayPartKey = (task.day_part ?? "anytime").toLowerCase();
  const siteParts = dayPartLookup.get(siteId);

  const config = siteParts?.get(dayPartKey);
  const startTime = config?.start_time ?? DEFAULT_START;
  const endTime = config?.end_time ?? DEFAULT_END;
  const marginAfter = config?.soft_deadline_offset_minutes ?? DEFAULT_MARGIN_MINUTES;

  const start = addMinutes(toUtcDate(today, startTime), -DEFAULT_MARGIN_MINUTES);
  const end = addMinutes(toUtcDate(today, endTime), marginAfter);
  return { start, end };
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  const todayIso = now.toISOString().split("T")[0];

  const { data: dayParts, error: dayPartError } = await supabase
    .from("site_day_parts")
    .select("site_id, name, start_time, end_time, soft_deadline_offset_minutes");

  if (dayPartError) {
    console.error("Failed to fetch day parts", dayPartError);
    return new Response(`Error: ${dayPartError.message}`, { status: 500 });
  }

  const dayPartLookup = new Map<string, Map<string, DayPartConfig>>();
  (dayParts ?? []).forEach((part: any) => {
    const siteId = part.site_id as string;
    const key = (part.name as string).toLowerCase();
    if (!dayPartLookup.has(siteId)) {
      dayPartLookup.set(siteId, new Map());
    }
    dayPartLookup.get(siteId)!.set(key, {
      name: part.name,
      start_time: part.start_time,
      end_time: part.end_time,
      soft_deadline_offset_minutes: part.soft_deadline_offset_minutes ?? null,
    });
  });

  const { data: tasks, error: taskError } = await supabase
    .from("tasks")
    .select("id, site_id, status, due_date, day_part, completed_at")
    .eq("due_date", todayIso)
    .is("completed_at", null);

  if (taskError) {
    console.error("Failed to fetch today's tasks", taskError);
    return new Response(`Error: ${taskError.message}`, { status: 500 });
  }

  const updates: Array<{ id: string; status: string }> = [];
  for (const task of (tasks ?? []) as TaskRecord[]) {
    if (!task.due_date) continue;
    const { start, end } = getDayPartWindow(task, dayPartLookup, now);
    const currentStatus = task.status ?? "pending";

    let nextStatus = currentStatus;
    if (now < start) {
      nextStatus = "pending";
    } else if (now >= start && now <= end) {
      nextStatus = "active";
    } else if (now > end) {
      nextStatus = "overdue";
    }

    if (nextStatus !== currentStatus) {
      updates.push({ id: task.id, status: nextStatus });
    }
  }

  for (const chunk of chunkArray(updates, 50)) {
    const { error: updateError } = await supabase
      .from("tasks")
      .upsert(chunk.map(({ id, status }) => ({ id, status, updated_at: new Date().toISOString() })));
    if (updateError) {
      console.error("Failed updating task statuses", updateError);
      return new Response(`Error: ${updateError.message}`, { status: 500 });
    }
  }

  return new Response(JSON.stringify({ updated: updates.length }), {
    headers: { "Content-Type": "application/json" },
  });
});

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

