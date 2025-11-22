import { NextResponse } from "next/server";

export async function GET() {
    // Get all environment variable keys (security: don't return values)
    const envVars = Object.keys(process.env).sort();

    // Filter for Supabase related keys
    const supabaseKeys = envVars.filter((key) =>
        key.toUpperCase().includes("SUPABASE")
    );

    // Check specific keys existence and length (not value)
    const diagnostics = {
        VERCEL_ENV: process.env.VERCEL_ENV,
        NODE_ENV: process.env.NODE_ENV,
        SUPABASE_SERVICE_ROLE_KEY: {
            exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
            prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 5) ||
                "N/A",
        },
        SUPABASE_SERVICE_ROLE: {
            exists: !!process.env.SUPABASE_SERVICE_ROLE,
            length: process.env.SUPABASE_SERVICE_ROLE?.length || 0,
        },
        NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: {
            exists: !!process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
            length: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.length ||
                0,
        },
    };

    return NextResponse.json({
        message: "Environment Diagnostics",
        diagnostics,
        availableEnvKeys: envVars,
    });
}
