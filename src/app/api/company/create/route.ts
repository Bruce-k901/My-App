import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      industry,
      country,
      contact_email,
      company_number,
      vat_number,
      user_id,
    } = body || {};

    if (!name || !industry || !user_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: company, error: cErr } = await supabaseAdmin
      .from("companies")
      .insert({
        name,
        industry,
        country: country ?? null,
        contact_email: contact_email ?? null,
        company_number: company_number ?? null,
        vat_number: vat_number ?? null,
        created_by: user_id,
        setup_status: "new",
        active: false,
      })
      .select("id")
      .single();
    if (cErr) {
      return NextResponse.json({ error: cErr.message }, { status: 400 });
    }

    // Link the creating user to the company as admin
    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update({ company_id: company.id, app_role: "admin" })
      .eq("id", user_id);
    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 400 });
    }

    return NextResponse.json({ id: company.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}