import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function getSupabaseClient() {
  // Try service role first
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

  if (!url) {
    throw new Error("Supabase URL is not configured (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)");
  }

  if (!key) {
    throw new Error("Supabase service role key is not configured (SUPABASE_SERVICE_ROLE_KEY). This is required for EHO export.");
  }

  // Guard against using publishable key
  if (key.startsWith('sb_publishable_')) {
    throw new Error("Invalid service role key: received publishable anon key. Use service_role key (starts with eyJ...)");
  }

  if (url && key) {
    console.log("✅ Using Service Role Key for EHO Export");
    return createClient(url, key);
  }

  console.log("🔍 Debug Env:", {
    hasUrl: !!url,
    hasKey: !!key,
    keyPrefix: key ? key.substring(0, 15) + "..." : "missing",
    keyType: key?.startsWith('eyJ') ? 'JWT (CORRECT)' : key?.startsWith('sb_publishable_') ? 'PUBLISHABLE (WRONG!)' : 'UNKNOWN',
    env: process.env.VERCEL_ENV,
  });

  console.warn(
    "⚠️ SUPABASE_SERVICE_ROLE_KEY missing, falling back to user session",
  );

  // Fallback to user session
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored
          }
        },
      },
    },
  );
}

/**
 * POST /api/eho/export
 *
 * Generate EHO report export (PDF by default)
 *
 * Query params:
 * - site_id: UUID of the site
 * - start_date: YYYY-MM-DD format
 * - end_date: YYYY-MM-DD format
 * - format: pdf | json | zip (default: pdf)
 * - categories: comma-separated list (optional)
 * - include_missed: boolean (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "pdf") as
      | "pdf"
      | "json"
      | "zip";

    // For now, redirect to format-specific endpoints
    // In the future, this could be a unified endpoint that handles all formats
    if (format === "json") {
      // Will be handled by /api/eho/export/json
      return NextResponse.json({ error: "Use /api/eho/export/json endpoint" }, {
        status: 400,
      });
    }

    if (format === "zip") {
      // Will be handled by /api/eho/export/zip
      return NextResponse.json({ error: "Use /api/eho/export/zip endpoint" }, {
        status: 400,
      });
    }

    // PDF generation logic moved from Edge Function to here
    const supabase = await getSupabaseClient();
    const siteId = searchParams.get("site_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const categoriesParam = searchParams.get("categories");
    const includeMissed = searchParams.get("include_missed") === "true";

    if (!siteId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    const categories = categoriesParam
      ? categoriesParam.split(",").map((c) => c.trim()).filter(Boolean)
      : null;

    // Fetch all data directly here instead of calling Edge Function
    // This avoids the deployment and auth issues with Edge Functions

    // 1. Fetch report data
    console.log("Fetching report data...", {
      siteId,
      startDate,
      endDate,
      categories,
      hasSupabaseClient: !!supabase,
    });
    
    let reportData = null;
    let reportError = null;
    
    try {
      const result = await supabase.rpc(
        "get_eho_report_data",
        {
          p_site_id: siteId,
          p_start_date: startDate,
          p_end_date: endDate,
          p_template_categories: categories || null,
        },
      );
      reportData = result.data;
      reportError = result.error;
    } catch (rpcException: any) {
      console.error("Exception calling get_eho_report_data:", {
        error: rpcException,
        message: rpcException?.message,
        code: rpcException?.code,
        details: rpcException?.details,
        hint: rpcException?.hint,
      });
      reportError = {
        message: rpcException?.message || "RPC function call failed",
        code: rpcException?.code || "P0001",
        details: rpcException?.details,
        hint: rpcException?.hint || "The get_eho_report_data function may not exist or may have an error",
      };
    }

    if (reportError) {
      console.error("Error fetching report data:", {
        error: reportError,
        message: reportError.message,
        code: reportError.code,
        details: reportError.details,
        hint: reportError.hint,
        siteId,
        startDate,
        endDate,
      });
      
      // Return a helpful error instead of throwing
      return NextResponse.json(
        {
          error: "Failed to fetch report data",
          details: reportError.message,
          hint: reportError.hint || "The get_eho_report_data RPC function may not exist. Please check your database migrations.",
          code: reportError.code,
          troubleshooting: {
            checkMigrations: "Run migration 20251111150000_create_eho_report_functions.sql",
            checkPermissions: "Ensure GRANT EXECUTE was run on the function",
            checkServiceRole: "Verify SUPABASE_SERVICE_ROLE_KEY is set in Vercel",
          },
        },
        { status: 500 },
      );
    }

    // 2. Fetch compliance summary
    console.log("Fetching compliance summary...");
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      "get_compliance_summary",
      {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate,
      },
    );

    if (summaryError) {
      console.error("Error fetching compliance summary:", summaryError);
      // Don't throw here, just log it, so we can see if other parts work
    }

    // 3. Fetch site info
    const { data: siteData } = await supabase
      .from("sites")
      .select("id, name, address_line1, postcode, company_id")
      .eq("id", siteId)
      .single();

    // 4. Fetch company info
    let companyData = null;
    if (siteData?.company_id) {
      const { data } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", siteData.company_id)
        .single();
      companyData = data;
    }

    // 5. Fetch extended data in parallel
    console.log("Fetching extended data...");

    // Helper to safely fetch data without crashing the whole request
    const safeRpc = async (name: string, params: any) => {
      try {
        const { data, error } = await supabase.rpc(name, params);
        if (error) {
          console.error(`Error calling RPC ${name}:`, error);
          return { data: [] };
        }
        return { data: data || [] };
      } catch (e) {
        console.error(`Exception calling RPC ${name}:`, e);
        return { data: [] };
      }
    };

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
      safeRpc("get_eho_training_records", {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate,
      }),
      safeRpc("get_eho_temperature_records", {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate,
      }),
      safeRpc("get_eho_incident_reports", {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate,
      }),
      safeRpc("get_eho_cleaning_records", {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate,
      }),
      safeRpc("get_eho_pest_control_records", {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate,
      }),
      safeRpc("get_eho_opening_closing_checklists", {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate,
      }),
      safeRpc("get_eho_supplier_delivery_records", {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate,
      }),
      safeRpc("get_eho_maintenance_logs", {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate,
      }),
      safeRpc("get_eho_staff_health_declarations", {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate,
      }),
      safeRpc("get_eho_allergen_information", {
        p_site_id: siteId,
      }),
    ]);

    // Generate HTML template
    const html = generatePDFHTML({
      site: {
        ...siteData,
        address: siteData?.address_line1, // Map address_line1 to address for template compatibility
      },
      company: companyData,
      startDate: startDate,
      endDate: endDate,
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

    // Return HTML (client can print to PDF)
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition":
          `inline; filename="eho-report-${startDate}-to-${endDate}.html"`,
      },
    });
  } catch (error: any) {
    console.error("❌ EHO export error:", {
      error,
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      siteId: request.nextUrl.searchParams.get("site_id"),
      startDate: request.nextUrl.searchParams.get("start_date"),
      endDate: request.nextUrl.searchParams.get("end_date"),
      hasServiceKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE),
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 15) || process.env.SUPABASE_SERVICE_ROLE?.substring(0, 15) || 'MISSING',
    });
    
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error?.message || "Unknown error occurred",
        hint: error?.hint || "Check Vercel function logs for more details",
        code: error?.code,
      },
      { status: 500 },
    );
  }
}

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
