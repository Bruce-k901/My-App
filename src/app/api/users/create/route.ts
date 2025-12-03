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
      // Training certificate fields
      food_safety_level,
      food_safety_expiry_date,
      h_and_s_level,
      h_and_s_expiry_date,
      fire_marshal_trained,
      fire_marshal_expiry_date,
      first_aid_trained,
      first_aid_expiry_date,
      cossh_trained,
      cossh_expiry_date,
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

    const roleValue = String(app_role || "Staff");

    // Step 1: Try to create auth user via invite first, then use auth user ID for profile
    let authUserId: string | null = null;
    let invitationSent = false;
    
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000');
      
      const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
        String(email).toLowerCase(),
        {
          data: {
            full_name,
            company_id,
          },
          redirectTo: `${appUrl}/setup-account`,
        }
      );

      if (inviteError) {
        console.error("❌ Invite failed:", inviteError);
        // Check if user already exists in auth
        if (inviteError.message?.includes("already registered") || inviteError.message?.includes("already exists")) {
          // User exists in auth - find their ID
          const { data: existingUsers } = await admin.auth.admin.listUsers();
          const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === String(email).toLowerCase());
          
          if (existingUser) {
            authUserId = existingUser.id;
            console.log(`✅ Found existing auth user: ${authUserId}`);
          } else {
            console.warn("⚠️ User exists in auth but could not be found");
          }
        } else {
          // Other error - we'll create profile with generated ID
          console.warn("⚠️ Invitation failed. Profile will be created without auth user link.");
        }
      } else if (inviteData?.user?.id) {
        authUserId = inviteData.user.id;
        invitationSent = true;
        console.log(`✅ Invitation email sent to ${email}, auth user ID: ${authUserId}`);
      }
    } catch (inviteErr: any) {
      console.error("❌ Invite exception:", inviteErr);
      // Continue - we'll create profile with generated ID
    }

    // Step 2: Create profile using auth user ID if available, otherwise generate one
    const profileId = authUserId || crypto.randomUUID();
    console.log(`🟢 Creating profile with ID: ${profileId} ${authUserId ? '(from auth user)' : '(generated)'}`);

    const { error: insertError } = await admin.from("profiles").insert({
      id: profileId,
      full_name,
      email: String(email).toLowerCase(),
      company_id,
      site_id: site_id ?? null,
      app_role: roleValue,
      position_title: position_title ?? null,
      boh_foh: boh_foh ?? null,
      phone_number: phone_number ?? null,
      pin_code: pin_code ?? null,
      // Training certificate fields
      food_safety_level: food_safety_level ?? null,
      food_safety_expiry_date: food_safety_expiry_date || null,
      h_and_s_level: h_and_s_level ?? null,
      h_and_s_expiry_date: h_and_s_expiry_date || null,
      fire_marshal_trained: fire_marshal_trained ?? false,
      fire_marshal_expiry_date: fire_marshal_expiry_date || null,
      first_aid_trained: first_aid_trained ?? false,
      first_aid_expiry_date: first_aid_expiry_date || null,
      cossh_trained: cossh_trained ?? false,
      cossh_expiry_date: cossh_expiry_date || null,
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

    console.log(`✅ New user saved: ${email} (${profileId})${invitationSent ? ' - Invitation sent' : ''}`);
    return NextResponse.json({ ok: true, id: profileId, invited: invitationSent }, { status: 200 });
  } catch (e: any) {
    console.error("🔥 Unhandled server error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error", stack: e?.stack || "No stack" },
      { status: 500 }
    );
  }
}
