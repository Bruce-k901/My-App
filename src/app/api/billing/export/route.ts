import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Data Export API
 * Generates a comprehensive JSON export of all company data
 * Used for GDPR compliance and customer data portability
 */
export async function POST(request: NextRequest) {
  try {
    const adminSupabase = getSupabaseAdmin();

    // Get authenticated user from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify token and get user
    const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's company
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: "No company found" }, { status: 400 });
    }

    const companyId = profile.company_id;

    // Get export type from request body
    const { exportType = "full" } = await request.json();

    // Build export data object
    const exportData: any = {
      export_date: new Date().toISOString(),
      company_id: companyId,
      export_type: exportType,
      data: {},
    };

    // Export tasks and checklists
    if (exportType === "full" || exportType === "tasks") {
      const { data: tasks } = await adminSupabase
        .from("checklist_tasks")
        .select("*")
        .eq("site_id", (await adminSupabase.from("sites").select("id").eq("company_id", companyId).limit(1)).data?.[0]?.id || "");

      const { data: taskTemplates } = await adminSupabase
        .from("task_templates")
        .select("*")
        .eq("company_id", companyId);

      const { data: taskCompletions } = await adminSupabase
        .from("task_completion_records")
        .select("*")
        .in("task_id", tasks?.map((t: any) => t.id) || []);

      exportData.data.tasks = tasks || [];
      exportData.data.task_templates = taskTemplates || [];
      exportData.data.task_completions = taskCompletions || [];
    }

    // Export incidents
    if (exportType === "full" || exportType === "incidents") {
      const siteIds = (await adminSupabase.from("sites").select("id").eq("company_id", companyId)).data?.map((s: any) => s.id) || [];
      
      if (siteIds.length > 0) {
        const { data: incidents } = await adminSupabase
          .from("incidents")
          .select("*")
          .in("site_id", siteIds);

        exportData.data.incidents = incidents || [];
      }
    }

    // Export assets
    if (exportType === "full" || exportType === "assets") {
      const { data: assets } = await adminSupabase
        .from("assets")
        .select("*")
        .eq("company_id", companyId);

      const { data: ppmSchedules } = await adminSupabase
        .from("ppm_schedule")
        .select("*")
        .in("asset_id", assets?.map((a: any) => a.id) || []);

      exportData.data.assets = assets || [];
      exportData.data.maintenance_schedules = ppmSchedules || [];
    }

    // Export SOPs
    if (exportType === "full" || exportType === "sops") {
      const { data: sops } = await adminSupabase
        .from("sops")
        .select("*")
        .eq("company_id", companyId);

      exportData.data.sops = sops || [];
    }

    // Export temperature logs
    if (exportType === "full") {
      const siteIds = (await adminSupabase.from("sites").select("id").eq("company_id", companyId)).data?.map((s: any) => s.id) || [];
      
      if (siteIds.length > 0) {
        const { data: tempLogs } = await adminSupabase
          .from("temperature_logs")
          .select("*")
          .in("site_id", siteIds)
          .order("recorded_at", { ascending: false })
          .limit(10000); // Limit to prevent huge exports

        exportData.data.temperature_logs = tempLogs || [];
      }
    }

    // Export library items
    if (exportType === "full") {
      const libraries = [
        "ingredients_library",
        "ppe_library",
        "chemicals_library",
        "drinks_library",
        "disposables_library",
        "glassware_library",
        "packaging_library",
      ];

      exportData.data.libraries = {};
      for (const lib of libraries) {
        const { data } = await adminSupabase
          .from(lib)
          .select("*")
          .eq("company_id", companyId);
        exportData.data.libraries[lib] = data || [];
      }
    }

    // Create export request record
    const { data: exportRequest, error: exportError } = await adminSupabase
      .from("data_export_requests")
      .insert({
        company_id: companyId,
        requested_by: user.id,
        export_type: exportType,
        status: "completed",
        file_size_bytes: JSON.stringify(exportData).length,
      })
      .select()
      .single();

    if (exportError) {
      console.error("Error creating export request:", exportError);
    }

    // Return JSON response
    return NextResponse.json(exportData, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="checkly-export-${companyId}-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating data export:", error);
    return NextResponse.json(
      { error: "Failed to generate export", details: error.message },
      { status: 500 }
    );
  }
}

