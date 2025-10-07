import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyId, status } = body || {};
    if (!companyId || !status) {
      return NextResponse.json({ error: "Missing companyId or status" }, { status: 400 });
    }
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("companies")
      .update({ setup_status: status })
      .eq("id", companyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update setup status" }, { status: 500 });
  }
}