import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
  }
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("sites")
    .select("id,name")
    .eq("company_id", companyId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

/**
 * POST /api/sites — Create or update a site using admin client (bypasses RLS).
 * Auth: requires logged-in user with admin/owner/platform-admin role.
 */
export async function POST(request: Request) {
  try {
    // Verify the user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user has admin-level access
    const supabaseAdmin = getSupabaseAdmin();
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, company_id, app_role, is_platform_admin")
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .limit(1);

    const profile = profiles?.[0];
    if (profileError || !profile) {
      console.error("Profile lookup failed:", { profileError, userId: user.id });
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    const role = (profile.app_role || "").toLowerCase();
    const isAdmin = ["owner", "admin", "super admin"].includes(role) || profile.is_platform_admin === true;
    if (!isAdmin) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { siteData, closures } = body;

    if (!siteData || !siteData.company_id || !siteData.name) {
      return NextResponse.json({ error: "Missing required site fields" }, { status: 400 });
    }

    // Upsert site using admin client (bypasses RLS)
    const { data: siteResult, error: siteError } = await supabaseAdmin
      .from("sites")
      .upsert(siteData, { onConflict: "id" })
      .select()
      .single();

    if (siteError) {
      console.error("Admin site upsert failed:", siteError);
      return NextResponse.json({ error: siteError.message, code: siteError.code }, { status: 500 });
    }

    const siteId = siteResult.id;

    // Handle closures if provided
    if (closures !== undefined) {
      // Delete existing closures
      await supabaseAdmin
        .from("site_closures")
        .delete()
        .eq("site_id", siteId);

      // Insert new closures
      if (Array.isArray(closures) && closures.length > 0) {
        const closureRows = closures.map((c: any) => ({
          site_id: siteId,
          closure_start: c.start,
          closure_end: c.end,
          notes: c.notes || "",
          is_active: true,
        }));
        const { error: closureError } = await supabaseAdmin
          .from("site_closures")
          .insert(closureRows);
        if (closureError) {
          console.error("Closure insert failed:", closureError);
          // Don't fail the whole save
        }
      }
    }

    // Update subscription site count (best-effort, don't fail the save)
    try {
      const { count } = await supabaseAdmin
        .from("sites")
        .select("id", { count: "exact", head: true })
        .eq("company_id", siteData.company_id);

      if (count !== null) {
        await supabaseAdmin
          .from("company_subscriptions")
          .update({ site_count: count, updated_at: new Date().toISOString() })
          .eq("company_id", siteData.company_id);
      }
    } catch {
      // Non-critical — don't fail the save
    }

    return NextResponse.json({ data: siteResult });
  } catch (err) {
    console.error("POST /api/sites error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}