import { NextResponse } from "next/server";

/**
 * Debug endpoint to check what environment variables are available
 * This helps diagnose why NEXT_PUBLIC_* variables might not be working
 */
export async function GET() {
  // Server-side check
  const serverEnv = {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "NOT SET",
    hasVapidKey: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    vapidKeyLength: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.length || 0,
    allNextPublicVars: Object.keys(process.env)
      .filter((k) => k.startsWith("NEXT_PUBLIC_"))
      .sort(),
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  };

  return NextResponse.json({
    message: "Environment variable debug info",
    server: serverEnv,
    note: "This shows server-side env vars. Client-side vars are embedded at build time.",
    troubleshooting: {
      ifVapidKeyNotSet: [
        "1. Check Vercel Settings → Environment Variables",
        "2. Verify variable name is exactly: NEXT_PUBLIC_VAPID_PUBLIC_KEY",
        "3. Check all environments are selected (Production, Preview, Development)",
        "4. Redeploy after adding/updating the variable",
        "5. Check Vercel build logs for any warnings about env vars",
      ],
      ifVapidKeySetButNotWorking: [
        "1. Clear browser cache and hard refresh",
        "2. Check browser console for client-side debug logs",
        "3. Verify the value matches exactly (no quotes, no spaces)",
      ],
    },
  });
}

