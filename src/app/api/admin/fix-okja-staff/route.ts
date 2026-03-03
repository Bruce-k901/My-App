// ONE-TIME FIX: Diagnose and repair orphaned staff profiles
// Call via GET /api/admin/fix-okja-staff          → diagnose only
// Call via GET /api/admin/fix-okja-staff?fix=true → diagnose AND fix
// DELETE THIS FILE after use

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const OKJA_COMPANY_ID = "73ca65bb-5b6e-4ebe-9bec-5aeff5042680";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shouldFix = url.searchParams.get("fix") === "true";

  try {
    const admin = getSupabaseAdmin();
    const report: string[] = [];

    // ── 1. Get ALL auth users ──
    const { data: allUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
    report.push(`Total auth users: ${allUsers.users.length}`);

    // ── 2. Get ALL profiles ──
    const { data: allProfiles } = await admin
      .from("profiles")
      .select("id, email, company_id, app_role, full_name");
    report.push(`Total profiles: ${allProfiles?.length || 0}`);

    // ── 3. Get user_companies rows ──
    let userCompaniesRows: any[] = [];
    try {
      const { data } = await admin.from("user_companies").select("profile_id, company_id, is_primary, app_role");
      userCompaniesRows = data || [];
    } catch {
      report.push("user_companies table not found");
    }

    // ── 4. Get ALL companies ──
    const { data: allCompanies } = await admin
      .from("companies")
      .select("id, name, created_by");

    // Build lookup maps
    const profileById = new Map((allProfiles || []).map((p) => [p.id, p]));
    const profileByEmail = new Map((allProfiles || []).map((p) => [p.email?.toLowerCase(), p]));
    const ucByProfileId = new Map(userCompaniesRows.map((uc) => [uc.profile_id, uc]));

    // ── 5. Detailed per-user analysis ──
    const userAnalysis: any[] = [];
    const idMismatches: any[] = [];
    const missingUserCompanies: any[] = [];

    for (const u of allUsers.users) {
      const profileByID = profileById.get(u.id);
      const profileByMail = profileByEmail.get(u.email?.toLowerCase() || "");
      const uc = ucByProfileId.get(u.id);

      const analysis: any = {
        authId: u.id,
        email: u.email,
        hasProfileById: !!profileByID,
        hasProfileByEmail: !!profileByMail,
        profileId: profileByID?.id || profileByMail?.id || null,
        profileCompanyId: (profileByID || profileByMail)?.company_id || null,
        profileRole: (profileByID || profileByMail)?.app_role || null,
        hasUserCompaniesRow: !!uc,
        metadataCompanyId: u.user_metadata?.company_id || null,
        idMatch: profileByID ? "YES" : profileByMail ? "EMAIL_ONLY" : "NONE",
      };

      // Flag ID mismatches — profile found by email but NOT by auth user ID
      if (!profileByID && profileByMail) {
        analysis.PROBLEM = "ID_MISMATCH: profile.id != auth_user.id (AppContext cannot find this profile)";
        idMismatches.push({
          authId: u.id,
          profileId: profileByMail.id,
          email: u.email,
          profileCompanyId: profileByMail.company_id,
          profileRole: profileByMail.app_role,
        });
      }

      // Flag missing user_companies
      if (profileByID && profileByID.company_id && !uc) {
        missingUserCompanies.push({
          profileId: u.id,
          email: u.email,
          companyId: profileByID.company_id,
        });
      }

      userAnalysis.push(analysis);
    }

    report.push(`ID mismatches (profile exists but wrong ID): ${idMismatches.length}`);
    report.push(`Missing user_companies rows: ${missingUserCompanies.length}`);

    // ── 6. FIX if requested ──
    let fixedIdMismatches = 0;
    let fixedUserCompanies = 0;
    const fixErrors: string[] = [];

    if (shouldFix) {
      // Fix ID mismatches — delete old profile, recreate with correct auth user ID
      for (const mismatch of idMismatches) {
        const existingProfile = profileByEmail.get(mismatch.email?.toLowerCase());
        if (existingProfile) {
          // Step 1: Delete the old profile with the wrong ID
          const { error: delError } = await admin
            .from("profiles")
            .delete()
            .eq("id", mismatch.profileId);

          if (delError) {
            fixErrors.push(`DELETE ${mismatch.email}: ${delError.message}`);
            continue;
          }

          // Step 2: Insert new profile with the correct auth user ID
          const { error: insError } = await admin.from("profiles").insert({
            id: mismatch.authId,
            email: existingProfile.email,
            full_name: existingProfile.full_name,
            company_id: existingProfile.company_id || OKJA_COMPANY_ID,
            app_role: existingProfile.app_role || "Staff",
          });

          if (insError) {
            fixErrors.push(`INSERT ${mismatch.email}: ${insError.message}`);
          } else {
            fixedIdMismatches++;
            report.push(`FIXED ${mismatch.email}: deleted profile ${mismatch.profileId}, created with auth ID ${mismatch.authId}`);
          }
        }

        // Ensure user_companies row with correct profile_id
        try {
          await admin.from("user_companies").upsert(
            {
              profile_id: mismatch.authId,
              company_id: mismatch.profileCompanyId || OKJA_COMPANY_ID,
              app_role: mismatch.profileRole || "Staff",
              is_primary: true,
            },
            { onConflict: "profile_id,company_id" }
          );
        } catch {
          // non-critical
        }
      }

      // Fix missing user_companies rows
      for (const missing of missingUserCompanies) {
        try {
          const { error } = await admin.from("user_companies").upsert(
            {
              profile_id: missing.profileId,
              company_id: missing.companyId,
              app_role: "Staff",
              is_primary: true,
            },
            { onConflict: "profile_id,company_id" }
          );
          if (!error) {
            fixedUserCompanies++;
            report.push(`CREATED user_companies for ${missing.email}`);
          }
        } catch {
          // non-critical
        }
      }
    }

    return NextResponse.json({
      mode: shouldFix ? "FIX" : "DIAGNOSE (add ?fix=true to repair)",
      summary: {
        totalAuthUsers: allUsers.users.length,
        totalProfiles: allProfiles?.length || 0,
        idMismatches: idMismatches.length,
        missingUserCompanies: missingUserCompanies.length,
        ...(shouldFix && { fixedIdMismatches, fixedUserCompanies }),
      },
      idMismatches,
      missingUserCompanies,
      allUsers: userAnalysis,
      report,
      ...(fixErrors.length > 0 && { fixErrors }),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
