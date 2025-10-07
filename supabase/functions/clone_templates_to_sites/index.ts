import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { company_id } = await req.json();

  const { data: sites } = await supabase
    .from("sites")
    .select("id")
    .eq("company_id", company_id);

  const { data: templates } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("company_id", company_id)
    .eq("active", true);

  if (sites && templates) {
    const inserts = sites.flatMap((site: any) =>
      templates.map((t: any) => ({
        site_id: site.id,
        checklist_template_id: t.id,
        name: t.name,
        day_part: t.day_part,
        frequency: t.frequency,
        active: true,
      }))
    );
    if (inserts.length) {
      await supabase.from("site_checklists").insert(inserts);
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});