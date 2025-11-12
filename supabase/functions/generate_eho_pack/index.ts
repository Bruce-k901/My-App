// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";
import PDFDocument from "https://esm.sh/pdfkit@0.15.0";

function isoDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

function formatDateTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-GB", { 
    day: "2-digit", 
    month: "short", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { company_id, site_id, start_date, end_date, include, format = "pdf" } = await req.json();
    if (!company_id || !site_id || !start_date || !end_date) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const startISO = new Date(start_date).toISOString();
    const endISO = new Date(end_date + "T23:59:59.999Z").toISOString();

    // Fetch site and company info
    const [siteRes, companyRes] = await Promise.all([
      supabase.from("sites").select("id,name,address_line1,city,postcode").eq("id", site_id).single(),
      supabase.from("companies").select("id,name").eq("id", company_id).single(),
    ]);
    const siteName = siteRes.data?.name || site_id;
    const companyName = companyRes.data?.name || company_id;

    // Fetch completed tasks with completion records and evidence
    let completedTasks: any[] = [];
    if (include?.tasks) {
      const { data: tasksData, error: tasksError } = await supabase
        .from("checklist_tasks")
        .select(`
          id,
          custom_name,
          due_date,
          due_time,
          status,
          completed_at,
          completed_by,
          template: task_templates(
            id,
            name,
            category,
            is_critical
          )
        `)
        .eq("site_id", site_id)
        .eq("company_id", company_id)
        .in("status", ["completed"])
        .gte("completed_at", startISO)
        .lte("completed_at", endISO)
        .order("completed_at", { ascending: false });

      if (!tasksError && tasksData) {
        // Fetch completion records with evidence
        const taskIds = tasksData.map((t: any) => t.id);
        const { data: completionRecords } = await supabase
          .from("task_completion_records")
          .select(`
            id,
            task_id,
            completed_at,
            completed_by,
            completion_data,
            evidence_attachments,
            duration_seconds,
            flagged,
            flag_reason,
            profiles:completed_by(full_name)
          `)
          .in("task_id", taskIds)
          .order("completed_at", { ascending: false });

        // Map completion records to tasks
        const recordsMap = new Map((completionRecords || []).map((r: any) => [r.task_id, r]));
        
        completedTasks = tasksData.map((task: any) => {
          const record = recordsMap.get(task.id);
          return {
            ...task,
            completion_record: record || null,
            task_name: task.custom_name || task.template?.name || "Unknown Task",
            category: task.template?.category || "General",
            is_critical: task.template?.is_critical || false,
          };
        });
      }
    }

    // Fetch temperature logs
    let temperatureLogs: any[] = [];
    if (include?.temperature) {
      const { data: tempData } = await supabase
        .from("temperature_logs")
        .select(`
          id,
          asset_id,
          reading,
          unit,
          status,
          recorded_at,
          assets:asset_id(name)
        `)
        .eq("site_id", site_id)
        .gte("recorded_at", startISO)
        .lte("recorded_at", endISO)
        .order("recorded_at", { ascending: false });
      
      temperatureLogs = (tempData || []).map((t: any) => ({
        ...t,
        asset_name: t.assets?.name || t.asset_id,
      }));
    }

    // Fetch maintenance logs
    let maintenanceLogs: any[] = [];
    if (include?.maintenance) {
      const { data: maintData } = await supabase
        .from("maintenance_logs")
        .select(`
          id,
          asset_id,
          performed_at,
          notes,
          status,
          assets:asset_id(name)
        `)
        .eq("site_id", site_id)
        .gte("performed_at", startISO)
        .lte("performed_at", endISO)
        .order("performed_at", { ascending: false });
      
      maintenanceLogs = (maintData || []).map((m: any) => ({
        ...m,
        asset_name: m.assets?.name || m.asset_id,
      }));
    }

    // Fetch incidents
    let incidents: any[] = [];
    if (include?.incidents) {
      const { data: incidentsData } = await supabase
        .from("incidents")
        .select(`
          id,
          title,
          description,
          incident_type,
          severity,
          status,
          reported_date,
          incident_date,
          riddor_reportable,
          riddor_reported,
          riddor_reference,
          created_at
        `)
        .eq("site_id", site_id)
        .gte("reported_date", start_date)
        .lte("reported_date", end_date)
        .order("reported_date", { ascending: false });
      
      incidents = incidentsData || [];
    }

    // Build export data structure
    const exportData = {
      metadata: {
        company_id,
        company_name: companyName,
        site_id,
        site_name: siteName,
        site_address: [
          siteRes.data?.address_line1,
          siteRes.data?.city,
          siteRes.data?.postcode,
        ].filter(Boolean).join(", "),
        export_date: new Date().toISOString(),
        date_range: {
          start: start_date,
          end: end_date,
        },
        generated_by: "EHO Compliance Pack Generator",
      },
      summary: {
        completed_tasks: completedTasks.length,
        temperature_logs: temperatureLogs.length,
        maintenance_logs: maintenanceLogs.length,
        incidents: incidents.length,
        total_evidence_attachments: completedTasks.reduce(
          (sum, t) => sum + (t.completion_record?.evidence_attachments?.length || 0),
          0
        ),
      },
      data: {
        completed_tasks: completedTasks.map((t) => ({
          task_id: t.id,
          task_name: t.task_name,
          category: t.category,
          is_critical: t.is_critical,
          due_date: t.due_date,
          due_time: t.due_time,
          completed_at: t.completed_at,
          completed_by: t.completion_record?.profiles?.full_name || t.completed_by || "Unknown",
          duration_seconds: t.completion_record?.duration_seconds,
          completion_data: t.completion_record?.completion_data || {},
          evidence_attachments: t.completion_record?.evidence_attachments || [],
          flagged: t.completion_record?.flagged || false,
          flag_reason: t.completion_record?.flag_reason,
        })),
        temperature_logs: temperatureLogs.map((t) => ({
          id: t.id,
          asset_name: t.asset_name,
          reading: t.reading,
          unit: t.unit || "°C",
          status: t.status,
          recorded_at: t.recorded_at,
        })),
        maintenance_logs: maintenanceLogs.map((m) => ({
          id: m.id,
          asset_name: m.asset_name,
          performed_at: m.performed_at,
          notes: m.notes,
          status: m.status,
        })),
        incidents: incidents.map((i) => {
          const incidentDate = i.reported_date || i.incident_date || i.created_at;
          return {
            id: i.id,
            title: i.title || i.incident_type || "Incident",
            description: i.description,
            incident_type: i.incident_type,
            severity: i.severity,
            status: i.status,
            reported_date: incidentDate,
            riddor_reportable: i.riddor_reportable || false,
            riddor_reported: i.riddor_reported || false,
            riddor_reference: i.riddor_reference,
          };
        }),
      },
    };

    // Return JSON format
    if (format === "json") {
      const fileName = `EHO-Pack-${site_id}-${Date.now()}.json`;
      const objectPath = `${company_id}/${site_id}/${fileName}`;
      const file = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      
      const { error: upErr } = await supabase.storage
        .from("reports")
        .upload(objectPath, file, { upsert: true });
      
      if (upErr) {
        return new Response(JSON.stringify({ error: upErr.message }), { status: 500 });
      }

      const { data: urlRes } = await supabase.storage
        .from("reports")
        .getPublicUrl(objectPath);

      return new Response(JSON.stringify({ url: urlRes.publicUrl, path: objectPath, format: "json" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate PDF
    const pdf = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Uint8Array[] = [];
    pdf.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    let ended = new Promise<void>((resolve) => pdf.on("end", () => resolve()));

    // Header
    pdf.fontSize(24).fillColor("#000000").text("EHO Compliance Pack", { align: "center" });
    pdf.moveDown(0.5);
    pdf.fontSize(14).fillColor("#666666").text(companyName, { align: "center" });
    pdf.moveDown(1);

    // Site Information
    pdf.fontSize(12).fillColor("#000000");
    pdf.text(`Site: ${siteName}`, { continued: false });
    if (siteRes.data?.address_line1) {
      pdf.text(`Address: ${exportData.metadata.site_address}`, { continued: false });
    }
    pdf.text(`Date Range: ${isoDate(startISO)} → ${isoDate(endISO)}`, { continued: false });
    pdf.text(`Generated: ${formatDateTime(new Date())}`, { continued: false });
    pdf.moveDown(1);

    // Summary Section
    pdf.fontSize(16).fillColor("#000000").text("Summary", { underline: true });
    pdf.moveDown(0.5);
    pdf.fontSize(11).fillColor("#333333");
    pdf.text(`Completed Tasks: ${exportData.summary.completed_tasks}`, { continued: false });
    pdf.text(`Temperature Logs: ${exportData.summary.temperature_logs}`, { continued: false });
    pdf.text(`Maintenance Logs: ${exportData.summary.maintenance_logs}`, { continued: false });
    pdf.text(`Incidents: ${exportData.summary.incidents}`, { continued: false });
    pdf.text(`Evidence Attachments: ${exportData.summary.total_evidence_attachments}`, { continued: false });
    pdf.moveDown(1);

    // Completed Tasks Section
    if (completedTasks.length > 0) {
      pdf.addPage();
      pdf.fontSize(16).fillColor("#000000").text("Completed Tasks & Checklists", { underline: true });
      pdf.moveDown(0.5);
      
      for (const task of completedTasks) {
        pdf.fontSize(12).fillColor("#000000");
        pdf.text(`${task.task_name}`, { continued: false });
        
        pdf.fontSize(10).fillColor("#666666");
        pdf.text(`Category: ${task.category}`, { indent: 20, continued: false });
        if (task.is_critical) {
          pdf.text("⚠️ CRITICAL TASK", { indent: 20, continued: false, color: "#FF0000" });
        }
        pdf.text(`Due: ${task.due_date}${task.due_time ? ` at ${task.due_time}` : ""}`, { indent: 20, continued: false });
        pdf.text(`Completed: ${formatDateTime(task.completed_at)}`, { indent: 20, continued: false });
        pdf.text(`Completed by: ${task.completion_record?.profiles?.full_name || "Unknown"}`, { indent: 20, continued: false });
        
        if (task.completion_record?.duration_seconds) {
          const minutes = Math.floor(task.completion_record.duration_seconds / 60);
          pdf.text(`Duration: ${minutes} minutes`, { indent: 20, continued: false });
        }

        if (task.completion_record?.flagged) {
          pdf.text(`⚠️ FLAGGED: ${task.completion_record.flag_reason || "No reason provided"}`, { 
            indent: 20, 
            continued: false,
            color: "#FF6600"
          });
        }

        // Completion data summary
        if (task.completion_record?.completion_data) {
          const data = task.completion_record.completion_data;
          const keys = Object.keys(data).filter(k => k !== 'photos' && k !== 'signatures');
          if (keys.length > 0) {
            pdf.text("Completion Data:", { indent: 20, continued: false });
            keys.slice(0, 5).forEach((key) => {
              const value = data[key];
              if (typeof value === 'string' || typeof value === 'number') {
                pdf.text(`  • ${key}: ${value}`, { indent: 30, continued: false });
              }
            });
          }
        }

        // Evidence attachments
        if (task.completion_record?.evidence_attachments?.length > 0) {
          pdf.text(`Evidence: ${task.completion_record.evidence_attachments.length} attachment(s)`, { 
            indent: 20, 
            continued: false,
            color: "#0066CC"
          });
          task.completion_record.evidence_attachments.slice(0, 3).forEach((url: string, idx: number) => {
            pdf.text(`  ${idx + 1}. ${url.substring(0, 80)}...`, { indent: 30, continued: false });
          });
        }

        pdf.moveDown(0.5);
        
        // Check if we need a new page
        if (pdf.y > 700) {
          pdf.addPage();
        }
      }
    } else if (include?.tasks) {
      pdf.fontSize(12).fillColor("#666666").text("No completed tasks in this period.", { continued: false });
      pdf.moveDown(1);
    }

    // Temperature Logs Section
    if (temperatureLogs.length > 0) {
      pdf.addPage();
      pdf.fontSize(16).fillColor("#000000").text("Temperature Logs", { underline: true });
      pdf.moveDown(0.5);
      
      for (const log of temperatureLogs.slice(0, 100)) { // Limit to 100 entries
        pdf.fontSize(11).fillColor("#000000");
        pdf.text(`${log.asset_name}: ${log.reading}${log.unit || "°C"}`, { continued: false });
        pdf.fontSize(10).fillColor("#666666");
        pdf.text(`Status: ${log.status || "OK"} | Recorded: ${formatDateTime(log.recorded_at)}`, { indent: 20, continued: false });
        pdf.moveDown(0.3);
        
        if (pdf.y > 750) {
          pdf.addPage();
        }
      }
    } else if (include?.temperature) {
      pdf.fontSize(12).fillColor("#666666").text("No temperature logs in this period.", { continued: false });
      pdf.moveDown(1);
    }

    // Maintenance Logs Section
    if (maintenanceLogs.length > 0) {
      pdf.addPage();
      pdf.fontSize(16).fillColor("#000000").text("Maintenance Logs", { underline: true });
      pdf.moveDown(0.5);
      
      for (const log of maintenanceLogs) {
        pdf.fontSize(11).fillColor("#000000");
        pdf.text(`${log.asset_name}`, { continued: false });
        pdf.fontSize(10).fillColor("#666666");
        pdf.text(`Status: ${log.status} | Performed: ${formatDateTime(log.performed_at)}`, { indent: 20, continued: false });
        if (log.notes) {
          pdf.text(`Notes: ${log.notes.substring(0, 200)}`, { indent: 20, continued: false });
        }
        pdf.moveDown(0.5);
        
        if (pdf.y > 750) {
          pdf.addPage();
        }
      }
    } else if (include?.maintenance) {
      pdf.fontSize(12).fillColor("#666666").text("No maintenance logs in this period.", { continued: false });
      pdf.moveDown(1);
    }

    // Incidents Section
    if (incidents.length > 0) {
      pdf.addPage();
      pdf.fontSize(16).fillColor("#000000").text("Incidents, Accidents & Complaints", { underline: true });
      pdf.moveDown(0.5);
      
      for (const incident of incidents) {
        const incidentDate = incident.reported_date || incident.incident_date || incident.created_at;
        const dateStr = incidentDate ? isoDate(incidentDate) : "Unknown date";
        
        pdf.fontSize(12).fillColor("#000000");
        pdf.text(`${incident.title || incident.incident_type || "Incident"}`, { continued: false });
        
        pdf.fontSize(10).fillColor("#666666");
        pdf.text(`Type: ${incident.incident_type || "other"} | Severity: ${incident.severity || "unknown"} | Status: ${incident.status || "open"}`, { indent: 20, continued: false });
        pdf.text(`Date: ${dateStr}`, { indent: 20, continued: false });
        
        if (incident.description) {
          pdf.text(`Description: ${incident.description.substring(0, 300)}`, { indent: 20, continued: false });
        }

        if (incident.riddor_reportable) {
          pdf.text(`RIDDOR Reportable: ${incident.riddor_reported ? "Yes - Reported" : "Yes - Not Yet Reported"}`, { 
            indent: 20, 
            continued: false,
            color: incident.riddor_reported ? "#006600" : "#FF6600"
          });
          if (incident.riddor_reference) {
            pdf.text(`RIDDOR Reference: ${incident.riddor_reference}`, { indent: 20, continued: false });
          }
        }

        pdf.moveDown(0.5);
        
        if (pdf.y > 750) {
          pdf.addPage();
        }
      }
    } else if (include?.incidents) {
      pdf.fontSize(12).fillColor("#666666").text("No incidents, accidents, complaints, or RIDDOR reports recorded in this period.", { continued: false });
      pdf.moveDown(1);
    }

    // Footer
    pdf.fontSize(8).fillColor("#999999");
    pdf.text(`Generated by EHO Compliance Pack Generator | ${new Date().toISOString()}`, { 
      align: "center",
      continued: false
    });

    pdf.end();
    await ended;

    // Upload PDF
    const file = new Blob(chunks, { type: "application/pdf" });
    const fileName = `EHO-Pack-${site_id}-${Date.now()}.pdf`;
    const objectPath = `${company_id}/${site_id}/${fileName}`;
    
    const { error: upErr } = await supabase.storage
      .from("reports")
      .upload(objectPath, file, { upsert: true });
    
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), { status: 500 });
    }

    const { data: urlRes } = await supabase.storage
      .from("reports")
      .getPublicUrl(objectPath);

    return new Response(JSON.stringify({ url: urlRes.publicUrl, path: objectPath, format: "pdf" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), { status: 500 });
  }
});
