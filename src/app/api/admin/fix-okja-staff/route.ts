// ONE-TIME FIX: Repair orphaned Okja staff profiles
// Call via GET /api/admin/fix-okja-staff
// DELETE THIS FILE after use

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const OKJA_COMPANY_ID = "73ca65bb-5b6e-4ebe-9bec-5aeff5042680";

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const results: string[] = [];

    // 1. Find all auth users whose metadata says they belong to Okja
    const { data: allUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const okjaAuthUsers = allUsers.users.filter(
      (u) => u.user_metadata?.company_id === OKJA_COMPANY_ID
    );
    results.push(`Found ${okjaAuthUsers.length} auth users with Okja in metadata`);

    // 2. For each, check if they have a profile and fix it
    let created = 0;
    let fixed = 0;
    let alreadyOk = 0;
    const errors: string[] = [];

    for (const authUser of okjaAuthUsers) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id, company_id, app_role, email")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!profile) {
        // No profile at all — create one
        const { error } = await admin.from("profiles").upsert(
          {
            id: authUser.id,
            email: authUser.email?.toLowerCase(),
            full_name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
            company_id: OKJA_COMPANY_ID,
            app_role: authUser.user_metadata?.app_role || "Staff",
          },
          { onConflict: "id" }
        );
        if (error) {
          errors.push(`CREATE ${authUser.email}: ${error.message}`);
        } else {
          created++;
          results.push(`CREATED profile for ${authUser.email}`);
        }
      } else if (profile.company_id !== OKJA_COMPANY_ID) {
        // Profile exists but wrong/null company_id — fix it
        const { error } = await admin
          .from("profiles")
          .update({ company_id: OKJA_COMPANY_ID })
          .eq("id", authUser.id);
        if (error) {
          errors.push(`FIX ${authUser.email}: ${error.message}`);
        } else {
          fixed++;
          results.push(`FIXED ${authUser.email} (was: ${profile.company_id || "NULL"})`);
        }
      } else {
        alreadyOk++;
        results.push(`OK ${authUser.email} — already linked to Okja`);
      }

      // 3. Ensure user_companies row exists
      try {
        await admin.from("user_companies").upsert(
          {
            profile_id: authUser.id,
            company_id: OKJA_COMPANY_ID,
            app_role: authUser.user_metadata?.app_role || "Staff",
            is_primary: true,
          },
          { onConflict: "profile_id,company_id" }
        );
      } catch {
        // user_companies table might not exist — non-critical
      }
    }

    // 4. Also find profiles with NULL company_id that have an auth user with Okja metadata
    // (covers edge case where profile.id != auth user id)
    const { data: nullProfiles } = await admin
      .from("profiles")
      .select("id, email, company_id")
      .is("company_id", null);

    let fixedNull = 0;
    if (nullProfiles) {
      for (const p of nullProfiles) {
        const matchingAuth = okjaAuthUsers.find(
          (u) => u.email?.toLowerCase() === p.email?.toLowerCase()
        );
        if (matchingAuth) {
          const { error } = await admin
            .from("profiles")
            .update({ company_id: OKJA_COMPANY_ID })
            .eq("id", p.id);
          if (!error) {
            fixedNull++;
            results.push(`FIXED null company for ${p.email} (profile ${p.id})`);
          }
        }
      }
    }

    // 5. Clean up phantom "My Company" companies with no linked profiles
    const { data: phantomCompanies } = await admin
      .from("companies")
      .select("id, name, created_by")
      .eq("name", "My Company");

    let deleted = 0;
    if (phantomCompanies) {
      for (const co of phantomCompanies) {
        const { data: linkedProfiles } = await admin
          .from("profiles")
          .select("id")
          .eq("company_id", co.id)
          .limit(1);

        if (!linkedProfiles || linkedProfiles.length === 0) {
          await admin.from("companies").delete().eq("id", co.id);
          deleted++;
          results.push(`DELETED phantom company "${co.name}" (${co.id})`);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      summary: {
        okjaAuthUsers: okjaAuthUsers.length,
        profilesCreated: created,
        profilesFixed: fixed + fixedNull,
        alreadyOk,
        phantomCompaniesDeleted: deleted,
        errors: errors.length,
      },
      details: results,
      errors,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
