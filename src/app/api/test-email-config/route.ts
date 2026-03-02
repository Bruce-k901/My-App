import { NextResponse } from 'next/server'

export async function GET() {
  const config = {
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasResendFrom: !!process.env.RESEND_FROM,
    hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    resendFrom: process.env.RESEND_FROM,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  }

  const allConfigured = Object.values(config).every(v => v === true || typeof v === 'string')

  return NextResponse.json({
    configured: allConfigured,
    details: config,
    message: allConfigured 
      ? '✅ Email system is fully configured and ready!' 
      : '⚠️ Some configuration is missing',
  })
}
