import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase credentials are not configured')
  }

  return createClient(url, key)
}

/**
 * GET /api/eho/report
 * 
 * Fetch EHO report data for a given site and date range
 * 
 * Query params:
 * - site_id: UUID of the site
 * - start_date: YYYY-MM-DD format
 * - end_date: YYYY-MM-DD format
 * - categories: comma-separated list of template categories (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    
    const siteId = searchParams.get('site_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const categoriesParam = searchParams.get('categories')
    
    // Validation
    if (!siteId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: site_id, start_date, end_date' },
        { status: 400 }
      )
    }
    
    // Parse categories if provided
    const categories = categoriesParam 
      ? categoriesParam.split(',').map(c => c.trim()).filter(Boolean)
      : null
    
    // Validate date format
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }
    
    if (startDateObj > endDateObj) {
      return NextResponse.json(
        { error: 'start_date must be before or equal to end_date' },
        { status: 400 }
      )
    }
    
    // Check date range limit (max 6 months)
    const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 180) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 180 days (6 months)' },
        { status: 400 }
      )
    }
    
    // Call RPC function to get report data
    const { data: reportData, error: reportError } = await supabase.rpc(
      'get_eho_report_data',
      {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_template_categories: categories
      }
    )
    
    if (reportError) {
      console.error('Error fetching EHO report data:', reportError)
      return NextResponse.json(
        { error: 'Failed to fetch report data', details: reportError.message },
        { status: 500 }
      )
    }
    
    // Get compliance summary
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      'get_compliance_summary',
      {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate
      }
    )
    
    if (summaryError) {
      console.error('Error fetching compliance summary:', summaryError)
      // Don't fail the request, just log the error
    }
    
    return NextResponse.json({
      success: true,
      data: {
        report_data: reportData || [],
        summary: summaryData || [],
        metadata: {
          site_id: siteId,
          start_date: startDate,
          end_date: endDate,
          categories: categories,
          total_records: reportData?.length || 0,
          date_range_days: daysDiff
        }
      }
    })
  } catch (error: any) {
    console.error('EHO report API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

