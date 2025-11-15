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
    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (initError: any) {
      console.error("Failed to initialize Supabase admin client:", initError);
      return NextResponse.json(
        { 
          error: "Database configuration error",
          details: initError?.message || "Failed to initialize database connection",
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

    if (!supabase) {
      return NextResponse.json(
        { 
          error: "Database client not initialized",
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
        console.error("Error fetching compliance history:", {
          error: historyError,
          message: historyError.message,
          details: historyError.details,
          hint: historyError.hint,
          code: historyError.code,
          tenantId,
          siteId,
          fromDateIso,
          toDateIso
        });
        
        // Check if it's a "relation does not exist" error (table/view missing)
        if (historyError.code === '42P01' || historyError.message?.includes('does not exist')) {
          console.warn("Compliance score table may not exist - returning empty history");
          history = [];
        }
        // Continue with empty history instead of failing
      } else {
        history = historyData ?? [];
      }
    } catch (err: any) {
      console.error("Exception fetching compliance history:", {
        error: err,
        message: err?.message,
        stack: err?.stack,
        tenantId,
        siteId
      });
      // Ensure we have an empty array on exception
      history = [];
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
        console.error("Error fetching latest compliance scores:", {
          error: latestSitesError,
          message: latestSitesError.message,
          details: latestSitesError.details,
          hint: latestSitesError.hint,
          code: latestSitesError.code,
        });
        
        // Check if it's a "relation does not exist" error (view/table missing)
        if (latestSitesError.code === '42P01' || latestSitesError.message?.includes('does not exist')) {
          console.warn("Compliance views may not exist - returning empty data");
          latestSites = [];
        } else {
          // Fallback: try without join
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("site_compliance_score_latest")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("score", { ascending: true });
          
          if (fallbackError) {
            console.error("Fallback query also failed:", fallbackError);
            latestSites = [];
          } else {
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
          }
        }
      } else {
        // Transform the data to include site_name
        latestSites = (latestSitesData ?? []).map((item: any) => ({
          ...item,
          site_name: item.site?.name || null
        }));
      }
    } catch (err: any) {
      console.error("Exception fetching latest compliance scores:", {
        error: err,
        message: err?.message,
        stack: err?.stack,
      });
      // Ensure we have an empty array on exception
      latestSites = [];
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
        console.error("Error fetching tenant overview:", {
          error: tenantOverviewError,
          message: tenantOverviewError.message,
          details: tenantOverviewError.details,
          hint: tenantOverviewError.hint,
          code: tenantOverviewError.code,
        });
        
        // Check if it's a "relation does not exist" error (view missing)
        if (tenantOverviewError.code === '42P01' || tenantOverviewError.message?.includes('does not exist')) {
          console.warn("Tenant compliance overview view may not exist - returning null");
          tenantOverview = null;
        }
        // Continue with null overview instead of failing
      } else {
        tenantOverview = tenantOverviewData ?? null;
      }
    } catch (err: any) {
      console.error("Exception fetching tenant overview:", {
        error: err,
        message: err?.message,
        stack: err?.stack,
      });
      // Ensure we have null on exception
      tenantOverview = null;
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
  } catch (error: any) {
    console.error("Compliance summary error", {
      error,
      message: error?.message,
      stack: error?.stack,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      tenant_id: request.nextUrl.searchParams.get("tenant_id"),
      site_id: request.nextUrl.searchParams.get("site_id"),
    });
    
    // Return 200 with empty data instead of 500 to prevent widget errors
    // The widget will display "No data available" instead of showing an error
    const tenantId = request.nextUrl.searchParams.get("tenant_id");
    const siteId = request.nextUrl.searchParams.get("site_id");
    const toDate = new Date();
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    return NextResponse.json({
      tenant_id: tenantId ?? null,
      range: {
        from: fromDate.toISOString().split("T")[0],
        to: toDate.toISOString().split("T")[0],
        days: 30,
      },
      tenant: {
        overview: null,
        sites: [],
      },
      site: siteId
        ? {
            site_id: siteId,
            latest: null,
            history: [],
          }
        : null,
    });
  }
}

