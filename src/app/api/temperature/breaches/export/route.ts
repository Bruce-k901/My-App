import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenant_id");
  if (!tenantId) {
    return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
  }

  const siteId = url.searchParams.get("site_id");
  const format = url.searchParams.get("format") ?? "json";
  const daysParam = url.searchParams.get("days");
  const toParam = url.searchParams.get("to");

  const toDate = toParam ? new Date(toParam) : new Date();
  if (Number.isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Invalid 'to' date" }, { status: 400 });
  }

  const days = Math.min(365, Math.max(1, Number.parseInt(daysParam ?? "30", 10) || 30));
  const fromDate = new Date(toDate.getTime());
  fromDate.setDate(fromDate.getDate() - (days - 1));

  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("temperature_breach_actions")
      .select(
        `
          id,
          company_id,
          site_id,
          temperature_log_id,
          action_type,
          status,
          due_at,
          completed_at,
          assigned_to,
          notes,
          metadata,
          created_at,
          updated_at,
          site:sites(name),
          assigned_profile:profiles!temperature_breach_actions_assigned_to_fkey(full_name, email),
          temperature_log:temperature_logs (
            recorded_at,
            reading,
            unit,
            status,
            meta,
            asset_id,
            asset:assets(name, working_temp_min, working_temp_max)
          )
        `
      )
      .eq("company_id", tenantId)
      .order("created_at", { ascending: false })
      .gte("created_at", fromIso)
      .lte("created_at", toIso);

    if (siteId) {
      query = query.eq("site_id", siteId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const breaches = (data ?? []).map((row) => {
      const log = row.temperature_log ?? {};
      const evaluation = log.meta?.evaluation ?? null;
      return {
        id: row.id,
        company_id: row.company_id,
        site_id: row.site_id,
        site_name: row.site?.name ?? null,
        action_type: row.action_type,
        status: row.status,
        due_at: row.due_at,
        completed_at: row.completed_at,
        assigned_to: row.assigned_to,
        assigned_name: row.assigned_profile?.full_name ?? null,
        assigned_email: row.assigned_profile?.email ?? null,
        notes: row.notes,
        metadata: row.metadata,
        created_at: row.created_at,
        updated_at: row.updated_at,
        temperature_log: {
          id: row.temperature_log_id,
          recorded_at: log.recorded_at,
          reading: log.reading,
          unit: log.unit,
          status: log.status,
          asset_id: log.asset_id,
          asset_name: log.asset?.name ?? null,
          working_temp_min: log.asset?.working_temp_min ?? null,
          working_temp_max: log.asset?.working_temp_max ?? null,
          evaluation,
        },
      };
    });

    if (format === "csv") {
      const header = [
        "breach_id",
        "site_name",
        "action_type",
        "status",
        "due_at",
        "completed_at",
        "assigned_to",
        "assigned_email",
        "temperature_reading",
        "unit",
        "recorded_at",
        "asset_name",
        "evaluation_status",
        "evaluation_reason",
      ];

      const rows = breaches.map((entry) => {
        const evaluation = entry.temperature_log.evaluation ?? {};
        return [
          entry.id,
          entry.site_name ?? "",
          entry.action_type,
          entry.status,
          entry.due_at ?? "",
          entry.completed_at ?? "",
          entry.assigned_name ?? "",
          entry.assigned_email ?? "",
          entry.temperature_log.reading ?? "",
          entry.temperature_log.unit ?? "",
          entry.temperature_log.recorded_at ?? "",
          entry.temperature_log.asset_name ?? "",
          evaluation.status ?? "",
          evaluation.reason ?? "",
        ]
          .map((value) => {
            if (typeof value === "string" && value.includes(",")) {
              return `"${value.replace(/\"/g, '""')}"`;
            }
            return value ?? "";
          })
          .join(",");
      });

      const csv = [header.join(","), ...rows].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=temperature-breaches-${fromIso.slice(0, 10)}-${toIso.slice(0, 10)}.csv`,
        },
      });
    }

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      range: {
        from: fromIso,
        to: toIso,
        days,
      },
      count: breaches.length,
      breaches,
    });
  } catch (error) {
    console.error("Temperature breach export error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


