import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase credentials are not configured");
  }

  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const tenantId = request.nextUrl.searchParams.get("tenant_id");
    if (!tenantId) {
      return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
    }

    const siteId = request.nextUrl.searchParams.get("site_id");
    const daysParam = request.nextUrl.searchParams.get("days");
    const toParam = request.nextUrl.searchParams.get("to");

    const toDate = toParam ? new Date(toParam) : new Date();
    if (Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
    }
    const sanitizedDays = Math.min(365, Math.max(1, Number.parseInt(daysParam ?? "30", 10) || 30));
    const fromDate = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate()));
    fromDate.setUTCDate(fromDate.getUTCDate() - (sanitizedDays - 1));

    const toDateIso = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate()))
      .toISOString()
      .split("T")[0];
    const fromDateIso = fromDate.toISOString().split("T")[0];

    // Check if compliance views exist by attempting to query them
    // If they don't exist or have errors, return empty/default data instead of 500
    let history: any[] = [];
    let latestSites: any[] = [];
    let siteLatest: any = null;
    let tenantOverview: any = null;

    try {
      const historyQuery = supabase
        .from("site_compliance_score")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("score_date", fromDateIso)
        .lte("score_date", toDateIso)
        .order("score_date", { ascending: true })
        .order("created_at", { ascending: true });

      const { data: historyData, error: historyError } = siteId 
        ? await historyQuery.eq("site_id", siteId) 
        : await historyQuery;
      
      if (historyError) {
        console.warn("Error fetching compliance history:", historyError);
        // Continue with empty history instead of failing
      } else {
        history = historyData ?? [];
      }
    } catch (err) {
      console.warn("Exception fetching compliance history:", err);
    }

    try {
      // Fetch latest scores and join with sites table to get site names
      const { data: latestSitesData, error: latestSitesError } = await supabase
        .from("site_compliance_score_latest")
        .select(`
          *,
          site:sites(name)
        `)
        .eq("tenant_id", tenantId)
        .order("score", { ascending: true });
      
      if (latestSitesError) {
        console.warn("Error fetching latest compliance scores:", latestSitesError);
        // Fallback: try without join
        const { data: fallbackData } = await supabase
          .from("site_compliance_score_latest")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("score", { ascending: true });
        
        latestSites = fallbackData ?? [];
        
        // Fetch site names separately
        if (latestSites.length > 0) {
          const siteIds = latestSites.map((s: any) => s.site_id).filter(Boolean);
          if (siteIds.length > 0) {
            const { data: sitesData } = await supabase
              .from("sites")
              .select("id, name")
              .in("id", siteIds);
            
            if (sitesData) {
              const sitesMap = new Map(sitesData.map((s: any) => [s.id, s.name]));
              latestSites = latestSites.map((score: any) => ({
                ...score,
                site_name: sitesMap.get(score.site_id) || null
              }));
            }
          }
        }
      } else {
        // Transform the data to include site_name
        latestSites = (latestSitesData ?? []).map((item: any) => ({
          ...item,
          site_name: item.site?.name || null
        }));
      }
    } catch (err) {
      console.warn("Exception fetching latest compliance scores:", err);
    }

    if (siteId && latestSites.length > 0) {
      siteLatest = latestSites.find((site) => site?.site_id === siteId) ?? null;
      if (!siteLatest) {
        try {
          const { data: latestSingle, error: latestSingleError } = await supabase
            .from("site_compliance_score_latest")
            .select("*")
            .eq("site_id", siteId)
            .maybeSingle();
          
          if (!latestSingleError && latestSingle) {
            siteLatest = latestSingle;
          }
        } catch (err) {
          console.warn("Exception fetching single site latest score:", err);
        }
      }
    }

    try {
      const { data: tenantOverviewData, error: tenantOverviewError } = await supabase
        .from("tenant_compliance_overview")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (tenantOverviewError) {
        console.warn("Error fetching tenant overview:", tenantOverviewError);
        // Continue with null overview instead of failing
      } else {
        tenantOverview = tenantOverviewData ?? null;
      }
    } catch (err) {
      console.warn("Exception fetching tenant overview:", err);
    }

    return NextResponse.json({
      tenant_id: tenantId,
      range: {
        from: fromDateIso,
        to: toDateIso,
        days: sanitizedDays,
      },
      tenant: {
        overview: tenantOverview,
        sites: latestSites,
      },
      site: siteId
        ? {
          site_id: siteId,
          latest: siteLatest,
          history: history,
        }
        : null,
    });
  } catch (error) {
    console.error("Compliance summary error", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        tenant_id: request.nextUrl.searchParams.get("tenant_id") ?? null,
        range: {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          to: new Date().toISOString().split("T")[0],
          days: 30,
        },
        tenant: {
          overview: null,
          sites: [],
        },
        site: null,
      },
      { status: 500 },
    );
  }
}

