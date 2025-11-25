import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get company_id from URL
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("company_id");

    if (!companyId) {
      return NextResponse.json({ error: "Missing company_id" }, {
        status: 400,
      });
    }

    // Verify ownership
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .single();

    if (!profile || profile.company_id !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all data
    const { data: company } = await supabase.from("companies").select("*").eq(
      "id",
      companyId,
    ).single();
    const { data: sites } = await supabase.from("sites").select("*").eq(
      "company_id",
      companyId,
    );
    const { data: users } = await supabase.from("profiles").select("*").eq(
      "company_id",
      companyId,
    );
    const { data: subscription } = await supabase.from("company_subscriptions")
      .select("*").eq("company_id", companyId).single();
    const { data: invoices } = await supabase.from("invoices").select("*").eq(
      "company_id",
      companyId,
    );

    const exportData = {
      company,
      sites,
      users,
      subscription,
      invoices,
      exported_at: new Date().toISOString(),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition":
          `attachment; filename="company-export-${companyId}.json"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
