import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * API route to get user profile (bypasses RLS)
 * Used when direct Supabase queries fail due to RLS restrictions
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow users to fetch their own profile
    if (user.id !== userId) {
      return NextResponse.json({ error: "Forbidden - can only fetch own profile" }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = getSupabaseAdmin();

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("❌ Profile fetch error:", error);
      return NextResponse.json(
        {
          error: error.message || "Failed to fetch profile",
          details: error.details,
          code: error.code,
        },
        { status: 400 }
      );
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    console.log("✅ Profile fetched via API:", profile.id);
    return NextResponse.json(profile);
  } catch (e: any) {
    console.error("❌ Server error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}




