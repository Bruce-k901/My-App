import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, role, companyId, siteId, first_name, last_name } = body || {};

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!companyId) {
      return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
    }

    // Create or upsert profile record for tracking
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin.from("profiles").upsert(
      {
        email,
        role: role || "staff",
        company_id: companyId,
        site_id: siteId ?? null,
        first_name: first_name || null,
        last_name: last_name || null,
        active: false,
      },
      { onConflict: "email" }
    );

    // Attempt to generate an invite link (Supabase JS v2)
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        // Redirect back to login once the user accepts the invite
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/login`,
        data: { role: role || "staff", company_id: companyId, site_id: siteId ?? null },
      },
    } as any);

    if (linkErr) {
      // Fallback: create the user so they receive a confirmation email
      const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { role: role || "staff" },
      } as any);
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: "Invite created via createUser." });
    }

    // Return the invite link so the client can display a confirmation or copy action
    return NextResponse.json({ success: true, invite_link: linkData?.properties?.action_link });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to send invite" }, { status: 500 });
  }
}