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

    // ── 3. Get ALL companies ──
    const { data: allCompanies } = await admin
      .from("companies")
      .select("id, name, created_by");

    // Build lookup maps
    const profileById = new Map((allProfiles || []).map((p) => [p.id, p]));
    const profileByEmail = new Map((allProfiles || []).map((p) => [p.email?.toLowerCase(), p]));

    // ── 4. Find problems ──
    const orphanedAuthUsers: any[] = []; // auth user with no profile
    const wrongCompany: any[] = []; // profile exists but company_id is wrong/null
    const okjaProfiles: any[] = []; // profiles correctly linked to Okja
    const phantomCompanies: any[] = []; // "My Company" or companies with no profiles

    for (const u of allUsers.users) {
      const profile = profileById.get(u.id);
      const profileByMail = profileByEmail.get(u.email?.toLowerCase() || "");

      if (!profile && !profileByMail) {
        orphanedAuthUsers.push({
          authId: u.id,
          email: u.email,
          metadata_company_id: u.user_metadata?.company_id || null,
          metadata_app_role: u.user_metadata?.app_role || null,
          metadata_full_name: u.user_metadata?.full_name || null,
          created_at: u.created_at,
        });
      } else {
        const p = profile || profileByMail;
        if (p && p.company_id === OKJA_COMPANY_ID) {
          okjaProfiles.push({ id: p.id, email: p.email, role: p.app_role });
        } else if (p && (!p.company_id || p.company_id !== OKJA_COMPANY_ID)) {
          // Check if this user SHOULD be in Okja (invited via Okja admin)
          // We check: was this user created around the same time as other Okja staff?
          wrongCompany.push({
            authId: u.id,
            profileId: p.id,
            email: p.email,
            current_company_id: p.company_id,
            current_company_name: allCompanies?.find((c) => c.id === p.company_id)?.name || "NONE",
            metadata_company_id: u.user_metadata?.company_id || null,
            role: p.app_role,
          });
        }
      }
    }

    // Find phantom companies
    for (const co of allCompanies || []) {
      const profileCount = (allProfiles || []).filter((p) => p.company_id === co.id).length;
      if (profileCount === 0 || co.name === "My Company") {
        phantomCompanies.push({
          id: co.id,
          name: co.name,
          created_by: co.created_by,
          linkedProfiles: profileCount,
        });
      }
    }

    report.push(`Okja profiles (OK): ${okjaProfiles.length}`);
    report.push(`Orphaned auth users (no profile): ${orphanedAuthUsers.length}`);
    report.push(`Profiles with wrong/null company: ${wrongCompany.length}`);
    report.push(`Phantom/empty companies: ${phantomCompanies.length}`);

    // ── 5. FIX if requested ──
    let fixed = 0;
    let created = 0;
    let deleted = 0;
    const fixErrors: string[] = [];

    if (shouldFix) {
      // Fix orphaned auth users — create profiles linked to Okja
      for (const orphan of orphanedAuthUsers) {
        const { error } = await admin.from("profiles").upsert(
          {
            id: orphan.authId,
            email: orphan.email?.toLowerCase(),
            full_name: orphan.metadata_full_name || orphan.email?.split("@")[0] || "User",
            company_id: OKJA_COMPANY_ID,
            app_role: "Staff",
          },
          { onConflict: "id" }
        );
        if (error) {
          fixErrors.push(`CREATE ${orphan.email}: ${error.message}`);
        } else {
          created++;
          report.push(`CREATED profile for ${orphan.email} → Okja`);
        }

        // Also ensure user_companies row
        try {
          await admin.from("user_companies").upsert(
            {
              profile_id: orphan.authId,
              company_id: OKJA_COMPANY_ID,
              app_role: "Staff",
              is_primary: true,
            },
            { onConflict: "profile_id,company_id" }
          );
        } catch {
          // non-critical
        }
      }

      // Fix profiles with wrong/null company → point to Okja
      for (const wrong of wrongCompany) {
        // Only fix if the profile's company is a phantom "My Company" or NULL
        const isPhantom = phantomCompanies.some((pc) => pc.id === wrong.current_company_id);
        const isNull = !wrong.current_company_id;

        if (isPhantom || isNull) {
          const { error } = await admin
            .from("profiles")
            .update({ company_id: OKJA_COMPANY_ID, app_role: "Staff" })
            .eq("id", wrong.profileId);
          if (error) {
            fixErrors.push(`FIX ${wrong.email}: ${error.message}`);
          } else {
            fixed++;
            report.push(`FIXED ${wrong.email}: ${wrong.current_company_name} → Okja`);
          }

          try {
            await admin.from("user_companies").upsert(
              {
                profile_id: wrong.profileId,
                company_id: OKJA_COMPANY_ID,
                app_role: "Staff",
                is_primary: true,
              },
              { onConflict: "profile_id,company_id" }
            );
          } catch {
            // non-critical
          }
        }
      }

      // Delete phantom companies with 0 profiles
      for (const pc of phantomCompanies) {
        if (pc.linkedProfiles === 0) {
          await admin.from("companies").delete().eq("id", pc.id);
          deleted++;
          report.push(`DELETED empty company "${pc.name}" (${pc.id})`);
        }
      }
    }

    return NextResponse.json({
      mode: shouldFix ? "FIX" : "DIAGNOSE (add ?fix=true to repair)",
      summary: {
        totalAuthUsers: allUsers.users.length,
        totalProfiles: allProfiles?.length || 0,
        okjaProfilesOk: okjaProfiles.length,
        orphanedAuthUsers: orphanedAuthUsers.length,
        wrongCompanyProfiles: wrongCompany.length,
        phantomCompanies: phantomCompanies.length,
        ...(shouldFix && { profilesCreated: created, profilesFixed: fixed, companiesDeleted: deleted }),
      },
      orphanedAuthUsers,
      wrongCompanyProfiles: wrongCompany,
      phantomCompanies,
      okjaProfiles,
      report,
      ...(fixErrors.length > 0 && { fixErrors }),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
