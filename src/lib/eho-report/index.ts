import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { fetchAllReportData } from './data-fetcher'
import { generateFullReportHtml } from './html-generator'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase credentials are not configured')
  }
  return createClient(url, key)
}

export async function generateComprehensiveReport(searchParams: URLSearchParams): Promise<NextResponse> {
  try {
    const siteId = searchParams.get('site_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!siteId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: site_id, start_date, end_date' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const data = await fetchAllReportData(supabase, siteId, startDate, endDate)
    const html = generateFullReportHtml(data)

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="eho-compliance-pack-${startDate}-to-${endDate}.html"`,
      },
    })
  } catch (error: any) {
    console.error('EHO comprehensive report error:', error)
    return NextResponse.json(
      { error: 'Failed to generate EHO compliance pack', details: error.message },
      { status: 500 }
    )
  }
}
