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

    // CRITICAL: Validate that the requesting user belongs to this company
    // This prevents users from accessing other companies' data
    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("company_id, app_role, is_platform_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!userProfile) {
      console.error("❌ User profile not found:", user.id);
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Platform admins can access any company (needed for "View As" feature)
    const isPlatformAdmin = userProfile.is_platform_admin === true;

    // Check if user belongs to the company they're requesting
    const userCompanyIdStr = userProfile.company_id ? String(userProfile.company_id) : null;
    const requestedCompanyIdStr = companyId ? String(companyId) : null;

    if (companyId && !isPlatformAdmin && userCompanyIdStr !== requestedCompanyIdStr) {
      console.error("❌ Access denied: User does not belong to requested company", {
        userId: user.id,
        userCompanyId: userProfile.company_id,
        requestedCompanyId: companyId,
        userRole: userProfile.app_role,
      });
      return NextResponse.json(
        { error: "Access denied: You do not have permission to access this company" },
        { status: 403 }
      );
    }

    // If fetching by userId, verify the company matches user's company_id
    const fetchedCompanyIdStr = company.id ? String(company.id) : null;

    if (userId && !isPlatformAdmin && userProfile.company_id && userCompanyIdStr !== fetchedCompanyIdStr) {
      console.error("❌ Access denied: User's company does not match fetched company", {
        userId: user.id,
        userCompanyId: userProfile.company_id,
        fetchedCompanyId: company.id,
        userRole: userProfile.app_role,
      });
      return NextResponse.json(
        { error: "Access denied: Company mismatch" },
        { status: 403 }
      );
    }

    // Log successful access for debugging
    console.log("✅ Company access granted:", {
      userId: user.id,
      companyId: company.id,
      companyName: company.name,
      userRole: userProfile.app_role,
      userCompanyId: userProfile.company_id,
    });

    console.log("✅ Company fetched:", company.id, "for user:", user.id);
    return NextResponse.json(company);
  } catch (e: any) {
    console.error("❌ Server error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}





