import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!companyId && !userId) {
      return NextResponse.json({ error: "Company ID or User ID is required" }, { status: 400 });
    }

    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = getSupabaseAdmin();

    let company;
    let error;

    if (companyId) {
      // Get by company ID
      const result = await supabaseAdmin
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();
      company = result.data;
      error = result.error;
    } else if (userId) {
      // Get by user ID (created_by or user_id)
      const result = await supabaseAdmin
        .from("companies")
        .select("*")
        .or(`created_by.eq.${userId},user_id.eq.${userId}`)
        .maybeSingle();
      company = result.data;
      error = result.error;
    }

    if (error) {
      console.error("❌ Company fetch error:", error);
      return NextResponse.json(
        {
          error: error.message || "Failed to fetch company",
          details: error.details,
          code: error.code,
        },
        { status: 400 }
      );
    }

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    console.log("✅ Company fetched:", company.id);
    return NextResponse.json(company);
  } catch (e: any) {
    console.error("❌ Server error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}


