import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EHOReportRequest {
  site_id: string;
  start_date: string;
  end_date: string;
  categories?: string[];
  include_missed?: boolean;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");

    // Create Supabase client
    // If we have a service role key, use it (admin mode)
    // If not, use the user's auth token from the request (RLS mode)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let supabaseClient;

    if (serviceRoleKey) {
      supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    } else if (authHeader) {
      // Fallback to user session using the anon key and auth header
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      supabaseClient = createClient(supabaseUrl, anonKey, {
        global: {
          headers: { Authorization: authHeader },
        },
      });
    } else {
      throw new Error("Missing both Service Role Key and Authorization header");
    }

    const { site_id, start_date, end_date, categories, include_missed }:
      EHOReportRequest = await req.json();

    if (!site_id || !start_date || !end_date) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch report data
    const { data: reportData, error: reportError } = await supabaseClient.rpc(
      "get_eho_report_data",
      {
        p_site_id: site_id,
        p_start_date: start_date,
        p_end_date: end_date,
        p_template_categories: categories || null,
      },
    );

    if (reportError) {
      throw new Error(`Failed to fetch report data: ${reportError.message}`);
    }

    // Fetch compliance summary
    const { data: summaryData } = await supabaseClient.rpc(
      "get_compliance_summary",
      {
        p_site_id: site_id,
        p_start_date: start_date,
        p_end_date: end_date,
      },
    );

    // Fetch site info
    const { data: siteData } = await supabaseClient
      .from("sites")
      .select("id, name, address, postcode, company_id")
      .eq("id", site_id)
      .single();

    // Fetch company info
    let companyData = null;
    if (siteData?.company_id) {
      const { data } = await supabaseClient
        .from("companies")
        .select("id, name")
        .eq("id", siteData.company_id)
        .single();
      companyData = data;
    }

    // Fetch extended data in parallel
    const [
      trainingRecords,
      temperatureRecords,
      incidentReports,
      cleaningRecords,
      pestControlRecords,
      openingClosingChecklists,
      supplierDeliveryRecords,
      maintenanceLogs,
      staffHealthDeclarations,
      allergenInformation,
    ] = await Promise.all([
      supabaseClient.rpc("get_eho_training_records", {
        p_site_id: site_id,
        p_start_date: start_date,
        p_end_date: end_date,
      }),
      supabaseClient.rpc("get_eho_temperature_records", {
        p_site_id: site_id,
        p_start_date: start_date,
        p_end_date: end_date,
      }),
      supabaseClient.rpc("get_eho_incident_reports", {
        p_site_id: site_id,
        p_start_date: start_date,
        p_end_date: end_date,
      }),
      supabaseClient.rpc("get_eho_cleaning_records", {
        p_site_id: site_id,
        p_start_date: start_date,
        p_end_date: end_date,
      }),
      supabaseClient.rpc("get_eho_pest_control_records", {
        p_site_id: site_id,
        p_start_date: start_date,
        p_end_date: end_date,
      }),
      supabaseClient.rpc("get_eho_opening_closing_checklists", {
        p_site_id: site_id,
        p_start_date: start_date,
        p_end_date: end_date,
      }),
      supabaseClient.rpc("get_eho_supplier_delivery_records", {
        p_site_id: site_id,
        p_start_date: start_date,
        p_end_date: end_date,
      }),
      supabaseClient.rpc("get_eho_maintenance_logs", {
        p_site_id: site_id,
        p_start_date: start_date,
        p_end_date: end_date,
      }),
      supabaseClient.rpc("get_eho_staff_health_declarations", {
        p_site_id: site_id,
        p_start_date: start_date,
        p_end_date: end_date,
      }),
      supabaseClient.rpc("get_eho_allergen_information", {
        p_site_id: site_id,
      }),
    ]);

    // Generate HTML template
    const html = generatePDFHTML({
      site: siteData,
      company: companyData,
      startDate: start_date,
      endDate: end_date,
      summary: summaryData || [],
      completions: reportData || [],
      trainingRecords: trainingRecords.data || [],
      temperatureRecords: temperatureRecords.data || [],
      incidentReports: incidentReports.data || [],
      cleaningRecords: cleaningRecords.data || [],
      pestControlRecords: pestControlRecords.data || [],
      openingClosingChecklists: openingClosingChecklists.data || [],
      supplierDeliveryRecords: supplierDeliveryRecords.data || [],
      maintenanceLogs: maintenanceLogs.data || [],
      staffHealthDeclarations: staffHealthDeclarations.data || [],
      allergenInformation: allergenInformation.data || [],
      generatedAt: new Date().toISOString(),
    });

    // Convert HTML to PDF using a simple approach
    // For production, you might want to use a headless browser service
    // For now, we'll return HTML and let the client convert it, or use a service

    // Option 1: Return HTML (client can use browser print to PDF)
    // Option 2: Use a PDF service API
    // Option 3: Use pdf-lib (but limited HTML support)

    // For MVP, we'll return HTML with print styles
    // In production, integrate with a PDF service like Gotenberg, Playwright, or similar

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html",
        "Content-Disposition":
          `inline; filename="eho-report-${start_date}-to-${end_date}.html"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate PDF" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

function generatePDFHTML(data: {
  site: any;
  company: any;
  startDate: string;
  endDate: string;
  summary: any[];
  completions: any[];
  trainingRecords: any[];
  temperatureRecords: any[];
  incidentReports: any[];
  cleaningRecords: any[];
  pestControlRecords: any[];
  openingClosingChecklists: any[];
  supplierDeliveryRecords: any[];
  maintenanceLogs: any[];
  staffHealthDeclarations: any[];
  allergenInformation: any[];
  generatedAt: string;
}): string {
  const {
    site,
    company,
    startDate,
    endDate,
    summary,
    completions,
    trainingRecords,
    temperatureRecords,
    incidentReports,
    cleaningRecords,
    pestControlRecords,
    openingClosingChecklists,
    supplierDeliveryRecords,
    maintenanceLogs,
    staffHealthDeclarations,
    allergenInformation,
    generatedAt,
  } = data;

  const totalTasks = summary.reduce((sum, s) => sum + s.total_tasks, 0);
  const totalCompleted = summary.reduce((sum, s) => sum + s.completed_tasks, 0);
  const completionRate = totalTasks > 0
    ? Math.round((totalCompleted / totalTasks) * 100)
    : 0;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>EHO Readiness Pack - ${startDate} to ${endDate}</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 2cm;
      }
      .no-print { display: none; }
    }
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      border-bottom: 3px solid #e91e63;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #e91e63;
      margin: 0;
      font-size: 28px;
    }
    .header-info {
      margin-top: 10px;
      font-size: 14px;
      color: #666;
    }
    .summary-section {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    .summary-card {
      background: white;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
    }
    .summary-card h3 {
      margin: 0 0 10px 0;
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }
    .summary-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #e91e63;
    }
    .category-breakdown {
      margin-top: 20px;
    }
    .category-item {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      border-bottom: 1px solid #ddd;
    }
    .completions-section {
      margin-top: 40px;
    }
    .completion-item {
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .completion-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }
    .completion-header h3 {
      margin: 0;
      color: #e91e63;
    }
    .completion-meta {
      font-size: 12px;
      color: #666;
    }
    .completion-data {
      margin-top: 10px;
    }
    .completion-data table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .completion-data td {
      padding: 5px;
      border-bottom: 1px solid #eee;
    }
    .completion-data td:first-child {
      font-weight: bold;
      width: 30%;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 11px;
      color: #666;
      text-align: center;
    }
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #e91e63;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .print-button:hover {
      background: #c2185b;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>
  
  <div class="header">
    <h1>EHO Readiness Pack</h1>
    <div class="header-info">
      <strong>Site:</strong> ${site?.name || "Unknown"} | 
      <strong>Address:</strong> ${site?.address || "N/A"} ${
    site?.postcode || ""
  }<br>
      <strong>Company:</strong> ${company?.name || "N/A"}<br>
      <strong>Report Period:</strong> ${startDate} to ${endDate}<br>
      <strong>Generated:</strong> ${new Date(generatedAt).toLocaleString()}
    </div>
  </div>

  <div class="summary-section">
    <h2>Executive Summary</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <h3>Total Tasks</h3>
        <div class="value">${totalTasks}</div>
      </div>
      <div class="summary-card">
        <h3>Completed</h3>
        <div class="value" style="color: #4caf50;">${totalCompleted}</div>
      </div>
      <div class="summary-card">
        <h3>Completion Rate</h3>
        <div class="value" style="color: ${
    completionRate >= 90
      ? "#4caf50"
      : completionRate >= 70
      ? "#ff9800"
      : "#f44336"
  };">${completionRate}%</div>
      </div>
    </div>
    
    <div class="category-breakdown">
      <h3>By Category</h3>
      ${
    summary.map((cat) => `
        <div class="category-item">
          <span><strong>${
      cat.category.replace("_", " ").toUpperCase()
    }</strong></span>
          <span>${cat.completed_tasks} / ${cat.total_tasks} (${
      cat.completion_rate.toFixed(1)
    }%)</span>
        </div>
      `).join("")
  }
    </div>
  </div>

  <div class="completions-section">
    <h2>Detailed Task Completions</h2>
    ${
    completions.map((comp, idx) => `
      <div class="completion-item">
        <div class="completion-header">
          <h3>${comp.template_name || "Unknown Task"}</h3>
          <div class="completion-meta">
            ${new Date(comp.completed_at).toLocaleString()}
          </div>
        </div>
        <div class="completion-meta">
          <strong>Completed by:</strong> ${
      comp.completed_by_name || "Unknown"
    } (${comp.completed_by_role || "N/A"})<br>
          <strong>Category:</strong> ${comp.template_category || "N/A"} | 
          <strong>Daypart:</strong> ${comp.daypart || "N/A"} | 
          <strong>Due:</strong> ${comp.due_date} ${comp.due_time || ""}
        </div>
        <div class="completion-data">
          <table>
            ${
      comp.completion_data
        ? Object.entries(comp.completion_data).filter(([key]) =>
          !["photos", "evidence_attachments", "equipment_list"].includes(key)
        ).map(([key, value]) => `
              <tr>
                <td>${
          key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
        }:</td>
                <td>${
          typeof value === "object" ? JSON.stringify(value) : String(value)
        }</td>
              </tr>
            `).join("")
        : ""
    }
            ${
      comp.completion_data?.equipment_list
        ? `
              <tr>
                <td>Equipment Checked:</td>
                <td>${comp.completion_data.equipment_list.length} item(s)</td>
              </tr>
            `
        : ""
    }
            ${
      comp.completion_data?.photos?.length > 0
        ? `
              <tr>
                <td>Evidence Photos:</td>
                <td>${comp.completion_data.photos.length} photo(s) attached</td>
              </tr>
            `
        : ""
    }
            ${
      comp.notes
        ? `
              <tr>
                <td>Notes:</td>
                <td>${comp.notes}</td>
              </tr>
            `
        : ""
    }
          </table>
        </div>
      </div>
    `).join("")
  }
  </div>

  <div class="training-section" style="margin-top: 40px; page-break-before: always;">
    <h2>Training Records</h2>
    ${
    trainingRecords.length > 0
      ? `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Staff Member</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Training Type</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Completed</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Expiry</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Certificate</th>
          </tr>
        </thead>
        <tbody>
          ${
        trainingRecords.map((tr) => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          tr.staff_name || "Unknown"
        }</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          tr.training_type || "N/A"
        }</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          new Date(tr.completed_at).toLocaleDateString()
        }</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          tr.expiry_date ? new Date(tr.expiry_date).toLocaleDateString() : "N/A"
        }</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          tr.certificate_number || "N/A"
        }</td>
            </tr>
          `).join("")
      }
        </tbody>
      </table>
    `
      : '<p style="color: #666; font-style: italic;">No training records found for this period.</p>'
  }
  </div>

  <div class="temperature-section" style="margin-top: 40px; page-break-before: always;">
    <h2>Temperature Records</h2>
    ${
    temperatureRecords.length > 0
      ? `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Date/Time</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Asset</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Reading</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Status</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Recorded By</th>
          </tr>
        </thead>
        <tbody>
          ${
        temperatureRecords.map((tr) => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          new Date(tr.recorded_at).toLocaleString()
        }</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          tr.asset_name || "Unknown"
        }</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${tr.reading} ${
          tr.unit || "°C"
        }</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">
                <span style="color: ${
          tr.status === "breach"
            ? "#f44336"
            : tr.status === "warning"
            ? "#ff9800"
            : "#4caf50"
        };">
                  ${tr.status?.toUpperCase() || "OK"}
                </span>
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          tr.recorded_by_name || "Unknown"
        }</td>
            </tr>
          `).join("")
      }
        </tbody>
      </table>
    `
      : '<p style="color: #666; font-style: italic;">No temperature records found for this period.</p>'
  }
  </div>

  <div class="incidents-section" style="margin-top: 40px; page-break-before: always;">
    <h2>Incident Reports</h2>
    ${
    incidentReports.length > 0
      ? incidentReports.map((inc) => `
      <div class="completion-item">
        <div class="completion-header">
          <h3>${inc.incident_type || "Incident"}</h3>
          <div class="completion-meta">${
        new Date(inc.occurred_at).toLocaleString()
      }</div>
        </div>
        <div class="completion-meta">
          <strong>Reported by:</strong> ${inc.reported_by_name || "Unknown"} | 
          <strong>Severity:</strong> ${inc.severity || "N/A"} | 
          <strong>Status:</strong> ${inc.status || "N/A"}
          ${
        inc.riddor_category
          ? ` | <strong>RIDDOR:</strong> ${inc.riddor_category}`
          : ""
      }
        </div>
        <div class="completion-data">
          <p><strong>Description:</strong> ${
        inc.description || "No description provided"
      }</p>
          ${
        inc.follow_up_actions
          ? `<p><strong>Follow-up Actions:</strong> ${inc.follow_up_actions}</p>`
          : ""
      }
        </div>
      </div>
    `).join("")
      : '<p style="color: #666; font-style: italic;">No incident reports found for this period.</p>'
  }
  </div>

  <div class="cleaning-section" style="margin-top: 40px; page-break-before: always;">
    <h2>Cleaning Schedules & Completion Logs</h2>
    ${
    cleaningRecords.length > 0
      ? cleaningRecords.map((clean) => `
      <div class="completion-item">
        <div class="completion-header">
          <h3>${clean.template_name || "Cleaning Task"}</h3>
          <div class="completion-meta">${
        new Date(clean.completed_at).toLocaleString()
      }</div>
        </div>
        <div class="completion-meta">
          <strong>Completed by:</strong> ${
        clean.completed_by_name || "Unknown"
      } | 
          <strong>Due:</strong> ${clean.due_date} ${clean.daypart || ""}
        </div>
        <div class="completion-data">
          <table>
            ${
        clean.completion_data
          ? Object.entries(clean.completion_data).filter(([key]) =>
            !["photos", "evidence_attachments"].includes(key)
          ).map(([key, value]) => `
              <tr>
                <td>${
            key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
          }:</td>
                <td>${
            typeof value === "object" ? JSON.stringify(value) : String(value)
          }</td>
              </tr>
            `).join("")
          : ""
      }
          </table>
        </div>
      </div>
    `).join("")
      : '<p style="color: #666; font-style: italic;">No cleaning records found for this period.</p>'
  }
  </div>

  <div class="pest-control-section" style="margin-top: 40px; page-break-before: always;">
    <h2>Pest Control Records</h2>
    ${
    pestControlRecords.length > 0
      ? pestControlRecords.map((pest) => `
      <div class="completion-item">
        <div class="completion-header">
          <h3>Pest Control Inspection</h3>
          <div class="completion-meta">${
        new Date(pest.completed_at).toLocaleString()
      }</div>
        </div>
        <div class="completion-meta">
          <strong>Inspected by:</strong> ${pest.completed_by_name || "Unknown"}
        </div>
        <div class="completion-data">
          <p><strong>Assessment:</strong> 
            <span style="color: ${
        pest.assessment_result === "pass" ? "#4caf50" : "#f44336"
      };">
              ${pest.assessment_result?.toUpperCase() || "N/A"}
            </span>
          </p>
          ${
        pest.findings
          ? `<p><strong>Findings:</strong> ${pest.findings}</p>`
          : ""
      }
          ${
        pest.actions_taken
          ? `<p><strong>Actions Taken:</strong> ${pest.actions_taken}</p>`
          : ""
      }
        </div>
      </div>
    `).join("")
      : '<p style="color: #666; font-style: italic;">No pest control records found for this period.</p>'
  }
  </div>

  <div class="checklists-section" style="margin-top: 40px; page-break-before: always;">
    <h2>Opening & Closing Checklists</h2>
    ${
    openingClosingChecklists.length > 0
      ? openingClosingChecklists.map((checklist) => `
      <div class="completion-item">
        <div class="completion-header">
          <h3>${checklist.checklist_type || "Checklist"}</h3>
          <div class="completion-meta">${
        new Date(checklist.completed_at).toLocaleString()
      }</div>
        </div>
        <div class="completion-meta">
          <strong>Completed by:</strong> ${
        checklist.completed_by_name || "Unknown"
      } | 
          <strong>Daypart:</strong> ${checklist.daypart || "N/A"}
        </div>
        <div class="completion-data">
          <table>
            ${
        checklist.completion_data
          ? Object.entries(checklist.completion_data).filter(([key]) =>
            !["photos", "evidence_attachments"].includes(key)
          ).map(([key, value]) => `
              <tr>
                <td>${
            key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
          }:</td>
                <td>${
            typeof value === "object" ? JSON.stringify(value) : String(value)
          }</td>
              </tr>
            `).join("")
          : ""
      }
          </table>
        </div>
      </div>
    `).join("")
      : '<p style="color: #666; font-style: italic;">No opening/closing checklists found for this period.</p>'
  }
  </div>

  <div class="supplier-delivery-section" style="margin-top: 40px; page-break-before: always;">
    <h2>Supplier & Delivery Records</h2>
    ${
    supplierDeliveryRecords.length > 0
      ? `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Supplier</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Items</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Received By</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Temperature Check</th>
          </tr>
        </thead>
        <tbody>
          ${
        supplierDeliveryRecords.map((del) => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          del.delivery_date
            ? new Date(del.delivery_date).toLocaleDateString()
            : "N/A"
        }</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          del.supplier_name || "Unknown"
        }</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          del.items_received || "N/A"
        }</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          del.received_by_name || "Unknown"
        }</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          del.temperature_check || "N/A"
        }</td>
            </tr>
          `).join("")
      }
        </tbody>
      </table>
    `
      : '<p style="color: #666; font-style: italic;">No supplier/delivery records found for this period. (Feature pending implementation)</p>'
  }
  </div>

  <div class="maintenance-section" style="margin-top: 40px; page-break-before: always;">
    <h2>Maintenance Logs</h2>
    ${
    maintenanceLogs.length > 0
      ? maintenanceLogs.map((maint) => `
      <div class="completion-item">
        <div class="completion-header">
          <h3>${maint.maintenance_type || "Maintenance"} - ${
        maint.asset_name || "Unknown Asset"
      }</h3>
          <div class="completion-meta">${
        maint.completed_at
          ? new Date(maint.completed_at).toLocaleString()
          : "N/A"
      }</div>
        </div>
        <div class="completion-meta">
          <strong>Completed by:</strong> ${maint.completed_by_name || "Unknown"}
          ${
        maint.next_due_date
          ? ` | <strong>Next Due:</strong> ${
            new Date(maint.next_due_date).toLocaleDateString()
          }`
          : ""
      }
        </div>
        <div class="completion-data">
          <p><strong>Description:</strong> ${
        maint.description || "No description provided"
      }</p>
        </div>
      </div>
    `).join("")
      : '<p style="color: #666; font-style: italic;">No maintenance logs found for this period. (Feature pending implementation)</p>'
  }
  </div>

  <div class="staff-health-section" style="margin-top: 40px; page-break-before: always;">
    <h2>Staff Health Declarations</h2>
    ${
    staffHealthDeclarations.length > 0
      ? `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Staff Member</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Health Status</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Fit for Work</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Symptoms</th>
          </tr>
        </thead>
        <tbody>
          ${
        staffHealthDeclarations.map((decl) => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          decl.declaration_date
            ? new Date(decl.declaration_date).toLocaleDateString()
            : "N/A"
        }</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          decl.staff_name || "Unknown"
        }</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          decl.health_status || "N/A"
        }</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">
                <span style="color: ${
          decl.fit_for_work ? "#4caf50" : "#f44336"
        };">
                  ${decl.fit_for_work ? "YES" : "NO"}
                </span>
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          decl.symptoms || "None reported"
        }</td>
            </tr>
          `).join("")
      }
        </tbody>
      </table>
    `
      : '<p style="color: #666; font-style: italic;">No staff health declarations found for this period. (Feature pending implementation)</p>'
  }
  </div>

  <div class="allergen-section" style="margin-top: 40px; page-break-before: always;">
    <h2>Allergen Information & Procedures</h2>
    ${
    allergenInformation.length > 0
      ? allergenInformation.map((allergen) => `
      <div class="completion-item">
        <div class="completion-header">
          <h3>${allergen.allergen_name || "Allergen"}</h3>
          ${
        allergen.last_updated
          ? `<div class="completion-meta">Last Updated: ${
            new Date(allergen.last_updated).toLocaleDateString()
          }</div>`
          : ""
      }
        </div>
        <div class="completion-data">
          ${
        allergen.present_in_items && allergen.present_in_items.length > 0
          ? `
            <p><strong>Present in:</strong> ${
            allergen.present_in_items.join(", ")
          }</p>
          `
          : ""
      }
          ${
        allergen.procedures
          ? `<p><strong>Procedures:</strong> ${allergen.procedures}</p>`
          : ""
      }
        </div>
      </div>
    `).join("")
      : '<p style="color: #666; font-style: italic;">No allergen information available. (Feature pending implementation)</p>'
  }
  </div>

  <div class="footer">
    <p>This report was generated automatically by the Compliance Management System.</p>
    <p>For questions or support, please contact your system administrator.</p>
    <p style="margin-top: 20px; font-size: 10px; color: #999;">
      <strong>Note:</strong> This report includes task completions, training records, temperature logs, 
      incident reports, cleaning schedules, pest control records, and opening/closing checklists 
      for the period ${startDate} to ${endDate}.
    </p>
  </div>
</body>
</html>
  `;
}
