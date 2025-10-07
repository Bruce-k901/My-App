// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { site_id, company_id } = await req.json();

  // 1. Create default dayparts
  const dayparts = [
    { name: "Opening", start_time: "06:00", end_time: "08:30" },
    { name: "Pre-Service", start_time: "08:30", end_time: "11:00" },
    { name: "Post-Service", start_time: "20:00", end_time: "22:00" },
  ];
  await supabase
    .from("dayparts")
    .insert(dayparts.map((d) => ({ ...d, site_id })));

  // 2. Clone checklist templates for this company
  const { data: templates } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("company_id", company_id)
    .eq("active", true);

  if (templates && templates.length) {
    const clones = templates.map((t: any) => ({
      site_id,
      checklist_template_id: t.id,
      name: t.name,
      day_part: t.day_part,
      frequency: t.frequency,
      active: true,
    }));
    await supabase.from("site_checklists").insert(clones);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});