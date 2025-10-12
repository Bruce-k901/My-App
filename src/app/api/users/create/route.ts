// src/app/api/users/create/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { full_name, email, company_id, site_id, role, position_title, boh_foh, phone_number, pin_code } = await req.json();
    if (!email || !company_id) {
      return NextResponse.json({ error: "Missing email or company_id" }, { status: 400 });
    }

    let admin;
    try {
      admin = getSupabaseAdmin();
    } catch (e: any) {
      const msg = e?.message || "Server misconfigured";
      const code = /publishable|Missing Supabase admin/.test(msg) ? "missing_admin_env" : undefined;
      return NextResponse.json({ error: msg, code }, { status: 500 });
    }

    // Optional duplicate profile guard within the same company
    const { data: existing, error: checkErr } = await admin
      .from("profiles")
      .select("id")
      .eq("company_id", company_id)
      .eq("email", String(email).toLowerCase())
      .limit(1);
    if (checkErr) {
      return NextResponse.json({ error: checkErr.message }, { status: 500 });
    }
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Profile already exists for this company", code: "profile_exists" }, { status: 409 });
    }

    // Step 1: Invite user by email
    const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
    if (inviteError) {
      const isDuplicateAuth = /already registered|already exists/i.test(inviteError.message || "");
      const status = isDuplicateAuth ? 409 : 400;
      const code = isDuplicateAuth ? "auth_exists" : undefined;
      return NextResponse.json({ error: inviteError.message, code }, { status });
    }

    const newUserId = invite?.user?.id;
    if (!newUserId) {
      return NextResponse.json({ error: "Auth user ID not returned", code: "auth_exists_no_id" }, { status: 500 });
    }

    // Step 2: Create profile row (service role bypasses RLS)
    const { error: insertError } = await admin.from("profiles").insert({
      id: newUserId,
      full_name,
      email: String(email).toLowerCase(),
      company_id,
      site_id: site_id ?? null,
      role: String(role || "staff").toLowerCase(),
      position_title: position_title ?? null,
      boh_foh: boh_foh ?? null,
      phone_number: phone_number ?? null,
      pin_code: pin_code ?? null,
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
