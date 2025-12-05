import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Diagnostic endpoint to check email/invite configuration
 * Helps debug why invite emails might not be working
 */
export async function GET(req: Request) {
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {},
    };

    // Check environment variables
    diagnostics.checks.envVars = {
      hasSupabaseUrl: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasServiceRoleKey: !!(
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE ||
        process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
      ),
      hasAppUrl: !!(
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.VERCEL_URL
      ),
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
    };

    // Try to initialize admin client
    try {
      const admin = getSupabaseAdmin();
      diagnostics.checks.adminClient = { status: "ok" };

      // Try to list users (tests auth connection)
      try {
        const { data: usersData, error: usersError } = await admin.auth.admin.listUsers();
        diagnostics.checks.authConnection = {
          status: usersError ? "error" : "ok",
          error: usersError?.message,
          userCount: usersData?.users?.length || 0,
        };
      } catch (e: any) {
        diagnostics.checks.authConnection = {
          status: "error",
          error: e?.message,
        };
      }

      // Try to get auth settings (if available)
      try {
        // Note: This might not be available via the JS client
        diagnostics.checks.authSettings = {
          note: "Auth settings check not available via JS client. Check Supabase Dashboard > Authentication > Settings > Email",
        };
      } catch (e: any) {
        diagnostics.checks.authSettings = {
          status: "error",
          error: e?.message,
        };
      }
    } catch (e: any) {
      diagnostics.checks.adminClient = {
        status: "error",
        error: e?.message,
      };
    }

    // Summary
    const allChecks = Object.values(diagnostics.checks);
    const hasErrors = allChecks.some((check: any) => check.status === "error");
    const hasWarnings = allChecks.some((check: any) => check.status === "warning");

    diagnostics.summary = {
      overall: hasErrors ? "error" : hasWarnings ? "warning" : "ok",
      message: hasErrors
        ? "Some checks failed. Check Supabase Dashboard for SMTP configuration."
        : hasWarnings
        ? "Some warnings detected. Verify email configuration in Supabase Dashboard."
        : "Basic checks passed. If emails still don't work, verify SMTP settings in Supabase Dashboard > Authentication > Settings > Email.",
      recommendations: [
        "Check Supabase Dashboard > Authentication > Settings > Email",
        "Verify SMTP server is configured (if using custom SMTP)",
        "Check Supabase project email rate limits",
        "Verify email templates are configured",
        "Check email logs in Supabase Dashboard > Logs > Auth",
      ],
    };

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (e: any) {
    console.error("🔥 [DIAGNOSE] Unhandled exception:", e);
    return NextResponse.json(
      {
        error: e?.message || "Server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
