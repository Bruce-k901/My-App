// deno-lint-ignore-file no-explicit-any
// Import Supabase client via ESM for Deno Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";

// Simple CORS helper
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export default Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { library_id, company_id, site_id } = await req.json();
    if (!library_id || !company_id) {
      return new Response(JSON.stringify({ error: "library_id and company_id are required" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the library task definition
    const { data: libTask, error: libError } = await supabase
      .from("task_library")
      .select("*")
      .eq("id", library_id)
      .single();
    if (libError) throw libError;
    if (!libTask) throw new Error("Library task not found");

    // Insert into checklist_templates
    const payload: any = {
      company_id,
      site_id: site_id ?? null,
      name: libTask.name,
      description: libTask.description,
      frequency: libTask.frequency,
      day_part: libTask.daypart ?? libTask.day_part ?? null,
      role_required: libTask.role_required ?? "staff",
      category: libTask.category ?? null,
      form_schema: libTask.form_schema ?? null,
      active: true,
      library_id,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("checklist_templates")
      .insert(payload)
      .select();
    if (insertError) throw insertError;

    return new Response(JSON.stringify(inserted), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 400,
    });
  }
});