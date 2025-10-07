// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";
import PDFDocument from "https://esm.sh/pdfkit@0.15.0";

function isoDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { company_id, site_id, start_date, end_date, include } = await req.json();
    if (!company_id || !site_id || !start_date || !end_date) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const startISO = new Date(start_date).toISOString();
    const endISO = new Date(end_date).toISOString();

    const [tasks, temperature, maintenance, incidents] = await Promise.all([
      include?.tasks
        ? supabase
            .from("tasks")
            .select("name,status,completed_at")
            .eq("site_id", site_id)
            .gte("completed_at", startISO)
            .lte("completed_at", endISO)
        : Promise.resolve({ data: [] }),
      include?.temperature
        ? supabase
            .from("temperature_logs")
            .select("asset_id,reading,unit,status,recorded_at")
            .eq("site_id", site_id)
            .gte("recorded_at", startISO)
            .lte("recorded_at", endISO)
        : Promise.resolve({ data: [] }),
      include?.maintenance
        ? supabase
            .from("maintenance_logs")
            .select("asset_id,performed_at,notes,status")
            .eq("site_id", site_id)
            .gte("performed_at", startISO)
            .lte("performed_at", endISO)
        : Promise.resolve({ data: [] }),
      include?.incidents
        ? supabase
            .from("incidents")
            .select("type,description,severity,status,resolved_at,created_at")
            .eq("site_id", site_id)
            .gte("created_at", startISO)
            .lte("created_at", endISO)
        : Promise.resolve({ data: [] }),
    ]);

    // Fetch site name for header
    const { data: siteRes } = await supabase
      .from("sites")
      .select("id,name")
      .eq("id", site_id)
      .limit(1);
    const siteName = siteRes?.[0]?.name || site_id;

    const pdf = new PDFDocument({ margin: 40 });
    const chunks: Uint8Array[] = [];
    pdf.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    let ended = new Promise<void>((resolve) => pdf.on("end", () => resolve()));

    pdf.fontSize(20).text("EHO Compliance Pack", { align: "center" });
    pdf.moveDown().fontSize(12).text(`Site: ${siteName} (${site_id})`);
    pdf.text(`Date Range: ${isoDate(startISO)} → ${isoDate(endISO)}`);
    pdf.moveDown();

    const section = (title: string) => {
      pdf.fontSize(16).text(title);
      pdf.moveDown(0.25);
    };

    if ((tasks as any).data?.length) {
      section("Tasks & Checklists");
      for (const t of (tasks as any).data) {
        pdf.fontSize(12).text(`• ${t.name}: ${t.status} (${t.completed_at || "not completed"})`);
      }
      pdf.moveDown();
    }

    if ((temperature as any).data?.length) {
      section("Temperature Logs");
      for (const r of (temperature as any).data) {
        const unit = r.unit || "°C";
        pdf.fontSize(12).text(`• ${r.asset_id}: ${r.reading}${unit} [${r.status}] (${r.recorded_at})`);
      }
      pdf.moveDown();
    }

    if ((maintenance as any).data?.length) {
      section("Maintenance Logs");
      for (const m of (maintenance as any).data) {
        pdf.fontSize(12).text(`• ${m.asset_id}: ${m.notes || ""} (${m.status}, ${m.performed_at})`);
      }
      pdf.moveDown();
    }

    if ((incidents as any).data?.length) {
      section("Incidents");
      for (const i of (incidents as any).data) {
        const resolved = i.status === "resolved" ? `resolved at ${i.resolved_at}` : `opened ${i.created_at}`;
        pdf.fontSize(12).text(`• ${i.type}: ${i.description} [${i.severity}] (${resolved})`);
      }
    }

    pdf.end();
    await ended;

    // Compose file blob
    const file = new Blob(chunks, { type: "application/pdf" });
    const fileName = `EHO-Pack-${site_id}-${Date.now()}.pdf`;

    // Upload to public reports bucket under company/site path
    const objectPath = `${company_id}/${site_id}/${fileName}`;
    const { error: upErr } = await supabase.storage
      .from("reports")
      .upload(objectPath, file, { upsert: true });
    if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500 });

    const { data: urlRes } = await supabase.storage
      .from("reports")
      .getPublicUrl(objectPath);

    return new Response(JSON.stringify({ url: urlRes.publicUrl, path: objectPath }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), { status: 500 });
  }
});