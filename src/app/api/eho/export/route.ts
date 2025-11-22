import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function getSupabaseClient() {
  // Try service role first
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    console.log("✅ Using Service Role Key for EHO Export");
    return createClient(url, key);
  }

  console.log("🔍 Debug Env:", {
    hasUrl: !!url,
    hasKey: !!key,
    keyPrefix: key ? key.substring(0, 5) + "..." : "missing",
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

    // PDF generation via Edge Function
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

    // Call Edge Function to generate PDF HTML
    const { data: pdfData, error: pdfError } = await supabase.functions.invoke(
      "generate-eho-pdf",
      {
        body: {
          site_id: siteId,
          start_date: startDate,
          end_date: endDate,
          categories: categories,
          include_missed: includeMissed,
        },
      },
    );

    if (pdfError) {
      console.error("Error calling PDF Edge Function:", pdfError);
      return NextResponse.json(
        { error: "Failed to generate PDF", details: pdfError.message },
        { status: 500 },
      );
    }

    // Return HTML (client can print to PDF or we can convert server-side)
    return new NextResponse(pdfData, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition":
          `attachment; filename="eho-report-${startDate}-to-${endDate}.html"`,
      },
    });
  } catch (error: any) {
    console.error("EHO export error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
