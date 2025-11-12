// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";

type SiteChecklist = {
  id: string;
  site_id: string;
  checklist_template_id: string;
  name: string;
  day_part: string | null;
  frequency: string | null;
  notes: string | null;
  sites: { company_id: string };
};

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date().toISOString().split("T")[0];
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().split("T")[0];

  const { data: checklists, error: clErr } = await supabase
    .from("site_checklists")
    .select(
      "id, site_id, checklist_template_id, name, day_part, frequency, notes, sites(company_id)"
    )
    .eq("active", true);

  if (clErr) return new Response(`Error: ${clErr.message}`, { status: 500 });
  if (!checklists || checklists.length === 0) return new Response("No checklists found");

  const { data: existing, error: exErr } = await supabase
    .from("tasks")
    .select("checklist_template_id, site_id")
    .eq("due_date", today);

  if (exErr) return new Response(`Error: ${exErr.message}`, { status: 500 });

  const existingKeys = new Set(
    (existing ?? []).map((e: any) => `${e.checklist_template_id}-${e.site_id}`)
  );

  const newTasks = (checklists as SiteChecklist[])
    .filter((c) => !existingKeys.has(`${c.checklist_template_id}-${c.site_id}`))
    .map((c) => ({
      company_id: c.sites.company_id,
      site_id: c.site_id,
      checklist_template_id: c.checklist_template_id,
      name: c.name,
      day_part: c.day_part ?? null,
      frequency: c.frequency ?? "daily",
      due_date: today,
      status: "pending",
      template_notes: c.notes ?? null,
    }));

  if (newTasks.length) {
    const { error: insErr } = await supabase.from("tasks").insert(newTasks);
    if (insErr) return new Response(`Insert error: ${insErr.message}`, { status: 500 });
  }

  // Automated alert: missed tasks from yesterday
  const { data: missed, error: missErr } = await supabase
    .from("tasks")
    .select("company_id, site_id, name, template_notes")
    .eq("due_date", yesterday)
    .neq("status", "completed");

  if (!missErr && missed && missed.length) {
    const inserts = (missed as any[]).map((m) => ({
      company_id: m.company_id,
      site_id: m.site_id,
      type: "Missed Task",
      description: `Task "${m.name}" was not completed.${m.template_notes ? ` Guidance: ${m.template_notes}` : ""}`,
      severity: "low",
      status: "open",
    }));
    const { error: incErr } = await supabase.from("incidents").insert(inserts);
    if (incErr) return new Response(`Incident insert error: ${incErr.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ inserted: newTasks.length }), {
    headers: { "Content-Type": "application/json" },
  });
});