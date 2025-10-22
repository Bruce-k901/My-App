// src/app/api/users/create/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const {
      full_name,
      email,
      company_id,
      site_id,
      app_role,
      position_title,
      boh_foh,
      phone_number,
      pin_code,
    } = await req.json();

    if (!email || !company_id) {
      console.error("❌ Missing email or company_id", { email, company_id });
      return NextResponse.json(
        { error: "Missing email or company_id" },
        { status: 400 }
      );
    }

    // Init admin client
    let admin;
    try {
      admin = getSupabaseAdmin();
    } catch (e: any) {
      const msg = e?.message || "Server misconfigured";
      console.error("❌ Supabase admin init failed:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    console.log("🟢 Incoming user payload:", {
      full_name,
      email,
      company_id,
      site_id,
      app_role,
      position_title,
      boh_foh,
      phone_number,
      pin_code,
    });

    // Check duplicates
    const { data: existing, error: checkErr } = await admin
      .from("profiles")
      .select("id")
      .eq("company_id", company_id)
      .eq("email", String(email).toLowerCase())
      .limit(1);

    if (checkErr) {
      console.error("❌ Profile check failed:", checkErr);
      return NextResponse.json({ error: checkErr.message }, { status: 500 });
    }

    if (existing && existing.length > 0) {
      console.warn("⚠️ Profile already exists for this company:", email);
      return NextResponse.json(
        { error: "Profile already exists", code: "profile_exists" },
        { status: 409 }
      );
    }

    // Generate UUID and insert directly into profiles
    const newUserId = crypto.randomUUID();
    console.log("🟢 Generated local user ID:", newUserId);

    const roleValue = String(app_role || "staff").toLowerCase();

    const { error: insertError } = await admin.from("profiles").insert({
      id: newUserId,
      full_name,
      email: String(email).toLowerCase(),
      company_id,
      site_id: site_id ?? null,
      app_role: roleValue,
      position_title: position_title ?? null,
      boh_foh: boh_foh ?? null,
      phone_number: phone_number ?? null,
      pin_code: pin_code ?? null,
    });

    if (insertError) {
      console.error("❌ Insert failed:", insertError);
      return NextResponse.json(
        {
          error: "Insert failed",
          details: insertError.message || insertError,
        },
        { status: 400 }
      );
    }

    console.log(`✅ New user saved locally: ${email} (${newUserId})`);
    return NextResponse.json({ ok: true, id: newUserId }, { status: 200 });
  } catch (e: any) {
    console.error("🔥 Unhandled server error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error", stack: e?.stack || "No stack" },
      { status: 500 }
    );
  }
}
