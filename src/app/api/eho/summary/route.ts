import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function getSupabaseClient() {
  // Try service role first
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    return createClient(url, key);
  }

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
 * GET /api/eho/summary
 *
 * Get compliance summary only (faster than full report)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const { searchParams } = new URL(request.url);

    const siteId = searchParams.get("site_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    console.log("EHO Summary API called with:", { siteId, startDate, endDate });

    if (!siteId || !startDate || !endDate) {
      const missing = [];
      if (!siteId) missing.push("site_id");
      if (!startDate) missing.push("start_date");
      if (!endDate) missing.push("end_date");

      console.error("Missing required parameters:", missing);
      return NextResponse.json(
        { error: `Missing required parameters: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    // Validate UUID format for siteId
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(siteId)) {
      console.error("Invalid site_id format:", siteId);
      return NextResponse.json(
        { error: "Invalid site_id format" },
        { status: 400 },
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      console.error("Invalid date format:", { startDate, endDate });
      return NextResponse.json(
        { error: "Invalid date format. Expected YYYY-MM-DD" },
        { status: 400 },
      );
    }

    console.log("Calling RPC function get_compliance_summary...");

    // Check if the function exists first
    try {
      const { data, error } = await supabase.rpc("get_compliance_summary", {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        console.error("RPC error fetching compliance summary:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        // If function doesn't exist, return empty data instead of error
        if (
          error.code === "42883" || error.message?.includes("does not exist")
        ) {
          console.warn(
            "get_compliance_summary function not found, returning empty data",
          );
          return NextResponse.json({
            success: true,
            data: [],
            warning: "Compliance summary function not available",
          });
        }

        return NextResponse.json(
          {
            error: "Failed to fetch summary",
            details: error.message,
            hint: error.hint,
            code: error.code,
          },
          { status: 500 },
        );
      }

      console.log("RPC call successful, returning data:", {
        count: data?.length || 0,
      });
      return NextResponse.json({
        success: true,
        data: data || [],
      });
    } catch (rpcError: any) {
      console.error("Exception calling RPC function:", rpcError);
      // If RPC call fails completely, return empty data
      return NextResponse.json({
        success: true,
        data: [],
        warning: "Compliance summary temporarily unavailable",
      });
    }
  } catch (error: any) {
    console.error("EHO summary API error:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error?.message || "Unknown error",
        type: error?.name || "Error",
      },
      { status: 500 },
    );
  }
}
