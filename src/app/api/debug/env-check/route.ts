import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // This endpoint helps debug environment variable issues in Vercel
  // DO NOT expose actual key values - only show if they exist and their prefix
  
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey1 = process.env.SUPABASE_SERVICE_ROLE_KEY
  const serviceKey2 = process.env.SUPABASE_SERVICE_ROLE
  const serviceKey3 = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  
  return NextResponse.json({
    environment: process.env.VERCEL_ENV || 'development',
    hasUrl: !!url,
    urlPrefix: url ? url.substring(0, 20) + '...' : 'MISSING',
    hasServiceKey1: !!serviceKey1,
    serviceKey1Prefix: serviceKey1 ? serviceKey1.substring(0, 15) + '...' : 'MISSING',
    serviceKey1Type: serviceKey1 ? (serviceKey1.startsWith('sb_publishable_') ? 'PUBLISHABLE (WRONG!)' : serviceKey1.startsWith('eyJ') ? 'JWT (CORRECT)' : 'UNKNOWN') : 'MISSING',
    hasServiceKey2: !!serviceKey2,
    serviceKey2Prefix: serviceKey2 ? serviceKey2.substring(0, 15) + '...' : 'MISSING',
    hasServiceKey3: !!serviceKey3,
    serviceKey3Prefix: serviceKey3 ? serviceKey3.substring(0, 15) + '...' : 'MISSING',
    recommendation: !serviceKey1 && !serviceKey2 
      ? 'Set SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables'
      : serviceKey1?.startsWith('sb_publishable_')
      ? 'ERROR: SUPABASE_SERVICE_ROLE_KEY contains publishable key. Use service_role key (starts with eyJ...)'
      : 'Environment variables appear to be set correctly'
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  })
}

