import { NextResponse } from "next/server";

/**
 * Debug endpoint to check what environment variables are available
 * This helps diagnose why NEXT_PUBLIC_* variables might not be working
 * 
 * Access this at: https://YOUR-VERCEL-URL.vercel.app/api/debug/env
 * Or on your custom domain: https://yourdomain.com/api/debug/env
 */
export async function GET() {
  // Server-side check - comprehensive diagnostic
  const allEnvKeys = Object.keys(process.env).sort();
  const nextPublicVars = allEnvKeys.filter((k) => k.startsWith("NEXT_PUBLIC_"));
  const supabaseVars = allEnvKeys.filter((k) => k.includes("SUPABASE"));
  
  const serverEnv = {
    // VAPID Key
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: {
      exists: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      value: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY 
        ? `${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.substring(0, 20)}...` 
        : "NOT SET",
      length: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.length || 0,
      expectedLength: 87,
    },
    // Service Role Key
    SUPABASE_SERVICE_ROLE_KEY: {
      exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      value: process.env.SUPABASE_SERVICE_ROLE_KEY 
        ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` 
        : "NOT SET",
      length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      startsWithEyJ: process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith("eyJ") || false,
    },
    // Alternative names
    SUPABASE_SERVICE_ROLE: {
      exists: !!process.env.SUPABASE_SERVICE_ROLE,
      value: process.env.SUPABASE_SERVICE_ROLE 
        ? `${process.env.SUPABASE_SERVICE_ROLE.substring(0, 20)}...` 
        : "NOT SET",
    },
    // Environment info
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL: process.env.VERCEL,
    },
    // All related variables
    allNextPublicVars: nextPublicVars,
    allSupabaseVars: supabaseVars,
    totalEnvVars: allEnvKeys.length,
  };

  // Determine issues
  const issues = [];
  if (!serverEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY.exists) {
    issues.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set on server");
  }
  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY.exists && !serverEnv.SUPABASE_SERVICE_ROLE.exists) {
    issues.push("SUPABASE_SERVICE_ROLE_KEY is not set on server");
  }
  if (serverEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY.exists && serverEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY.length !== 87) {
    issues.push(`NEXT_PUBLIC_VAPID_PUBLIC_KEY has wrong length: ${serverEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY.length} (expected 87)`);
  }
  if (serverEnv.SUPABASE_SERVICE_ROLE_KEY.exists && !serverEnv.SUPABASE_SERVICE_ROLE_KEY.startsWithEyJ) {
    issues.push("SUPABASE_SERVICE_ROLE_KEY doesn't start with 'eyJ' - might be wrong key type");
  }

  return NextResponse.json({
    message: "Environment variable debug info",
    server: serverEnv,
    issues: issues.length > 0 ? issues : ["No issues detected"],
    note: "This shows server-side env vars. NEXT_PUBLIC_* vars are embedded at build time for client.",
    troubleshooting: {
      ifBothKeysMissing: [
        "1. Check Vercel Settings → Environment Variables",
        "2. Verify you're checking the correct environment (Production vs Preview)",
        "3. Check Vercel build logs for env var warnings",
        "4. Try deleting and re-adding the variables",
        "5. Ensure all environments are selected (Production, Preview, Development)",
      ],
      ifKeysSetButNotWorking: [
        "1. Check which environment you're testing (Production/Preview)",
        "2. Verify variables are set for that specific environment",
        "3. Check for typos in variable names",
        "4. Check for extra characters (quotes, spaces) in values",
        "5. Clear Vercel build cache and redeploy",
      ],
      environmentMismatch: [
        "If testing on Preview but variables only set for Production, they won't work.",
        "Solution: Set variables for ALL environments (Production, Preview, Development)",
      ],
    },
  });
}

