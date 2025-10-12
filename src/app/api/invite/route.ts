import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { email, phone_number, pin_code, companyId } = await req.json();

    if (email) {
      const admin = getSupabaseAdmin();
      // Optional server-side duplicate profile guard within the same company
      if (companyId) {
        const { data: existing, error: checkErr } = await admin
          .from("profiles")
          .select("id")
          .eq("company_id", companyId)
          .eq("email", String(email).toLowerCase())
          .limit(1);
        if (checkErr) {
          return NextResponse.json({ error: checkErr.message }, { status: 500 });
        }
        if (existing && existing.length > 0) {
          return NextResponse.json({ error: "Profile already exists for this company", code: "profile_exists" }, { status: 409 });
        }
      }
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
      if (error) {
        // Distinguish common duplicate auth case
        const isDuplicateAuth = /already registered|already exists/i.test(error.message || "");
        const status = isDuplicateAuth ? 409 : 400;
        const code = isDuplicateAuth ? "auth_exists" : undefined;
        return NextResponse.json({ error: error.message, code }, { status });
      }
      return NextResponse.json({ ok: true, data });
    }

    if (phone_number) {
      // Stub for SMS invites until Twilio/Vonage is integrated
      console.log("SMS invite stub", { phone_number, pin_code });
      return NextResponse.json({ ok: true, sms: true });
    }

    return NextResponse.json({ error: "No email or phone_number provided" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}