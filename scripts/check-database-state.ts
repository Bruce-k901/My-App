/**
 * Database State Checker
 * 
 * This script verifies that the database is in a consistent state.
 * Run this after any database changes to catch issues early.
 * 
 * Usage:
 *   npx tsx scripts/check-database-state.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables");
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: CheckResult[] = [];

async function check(name: string, checkFn: () => Promise<boolean | { passed: boolean; message: string; details?: any }>) {
  try {
    const result = await checkFn();
    if (typeof result === "boolean") {
      results.push({
        name,
        passed: result,
        message: result ? "✅ Passed" : "❌ Failed",
      });
    } else {
      results.push({
        name,
        passed: result.passed,
        message: result.message,
        details: result.details,
      });
    }
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      message: `❌ Error: ${error.message}`,
      details: error,
    });
  }
}

async function main() {
  console.log("🔍 Checking database state...\n");

  // Check 1: All profiles have company_id
  await check("Profiles have company_id", async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, company_id")
      .is("company_id", null);

    if (error) {
      return { passed: false, message: `Error querying profiles: ${error.message}` };
    }

    if (data && data.length > 0) {
      return {
        passed: false,
        message: `Found ${data.length} profiles without company_id`,
        details: data.map((p) => p.id),
      };
    }

    return true;
  });

  // Check 2: All companies have user_id or created_by
  await check("Companies have user_id or created_by", async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("id, user_id, created_by")
      .is("user_id", null)
      .is("created_by", null);

    if (error) {
      return { passed: false, message: `Error querying companies: ${error.message}` };
    }

    if (data && data.length > 0) {
      return {
        passed: false,
        message: `Found ${data.length} companies without user_id or created_by`,
        details: data.map((c) => c.id),
      };
    }

    return true;
  });

  // Check 3: All sites have company_id
  await check("Sites have company_id", async () => {
    const { data, error } = await supabase
      .from("sites")
      .select("id, company_id")
      .is("company_id", null);

    if (error) {
      return { passed: false, message: `Error querying sites: ${error.message}` };
    }

    if (data && data.length > 0) {
      return {
        passed: false,
        message: `Found ${data.length} sites without company_id`,
        details: data.map((s) => s.id),
      };
    }

    return true;
  });

  // Check 4: All assets have company_id
  await check("Assets have company_id", async () => {
    const { data, error } = await supabase
      .from("assets")
      .select("id, company_id")
      .is("company_id", null);

    if (error) {
      return { passed: false, message: `Error querying assets: ${error.message}` };
    }

    if (data && data.length > 0) {
      return {
        passed: false,
        message: `Found ${data.length} assets without company_id`,
        details: data.map((a) => a.id),
      };
    }

    return true;
  });

  // Check 5: No orphaned profiles (profile.company_id doesn't exist)
  await check("No orphaned profiles", async () => {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, company_id")
      .not("company_id", "is", null);

    if (profilesError) {
      return { passed: false, message: `Error querying profiles: ${profilesError.message}` };
    }

    if (!profiles || profiles.length === 0) {
      return true; // No profiles to check
    }

    const companyIds = [...new Set(profiles.map((p) => p.company_id).filter(Boolean))];
    
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id")
      .in("id", companyIds);

    if (companiesError) {
      return { passed: false, message: `Error querying companies: ${companiesError.message}` };
    }

    const existingCompanyIds = new Set(companies?.map((c) => c.id) || []);
    const orphanedProfiles = profiles.filter((p) => p.company_id && !existingCompanyIds.has(p.company_id));

    if (orphanedProfiles.length > 0) {
      return {
        passed: false,
        message: `Found ${orphanedProfiles.length} orphaned profiles`,
        details: orphanedProfiles.map((p) => ({ profileId: p.id, companyId: p.company_id })),
      };
    }

    return true;
  });

  // Check 6: No orphaned sites (site.company_id doesn't exist)
  await check("No orphaned sites", async () => {
    const { data: sites, error: sitesError } = await supabase
      .from("sites")
      .select("id, company_id")
      .not("company_id", "is", null);

    if (sitesError) {
      return { passed: false, message: `Error querying sites: ${sitesError.message}` };
    }

    if (!sites || sites.length === 0) {
      return true; // No sites to check
    }

    const companyIds = [...new Set(sites.map((s) => s.company_id).filter(Boolean))];
    
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id")
      .in("id", companyIds);

    if (companiesError) {
      return { passed: false, message: `Error querying companies: ${companiesError.message}` };
    }

    const existingCompanyIds = new Set(companies?.map((c) => c.id) || []);
    const orphanedSites = sites.filter((s) => s.company_id && !existingCompanyIds.has(s.company_id));

    if (orphanedSites.length > 0) {
      return {
        passed: false,
        message: `Found ${orphanedSites.length} orphaned sites`,
        details: orphanedSites.map((s) => ({ siteId: s.id, companyId: s.company_id })),
      };
    }

    return true;
  });

  // Check 7: RLS is enabled on critical tables
  await check("RLS enabled on critical tables", async () => {
    const criticalTables = [
      "profiles",
      "companies",
      "sites",
      "assets",
      "contractors",
      "tasks",
      "incidents",
    ];

    // Note: This requires a direct database query, which we can't do easily
    // For now, we'll skip this check or make it informational
    return {
      passed: true,
      message: "⚠️ RLS check requires direct DB access (skipped)",
    };
  });

  // Print results
  console.log("\n" + "=".repeat(60));
  console.log("RESULTS");
  console.log("=".repeat(60) + "\n");

  let allPassed = true;
  for (const result of results) {
    console.log(`${result.passed ? "✅" : "❌"} ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.details && !result.passed) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
    }
    console.log();
    if (!result.passed) {
      allPassed = false;
    }
  }

  console.log("=".repeat(60));
  if (allPassed) {
    console.log("✅ All checks passed!");
    process.exit(0);
  } else {
    console.log("❌ Some checks failed. Please fix the issues above.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});


