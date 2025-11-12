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
 * POST /api/eho/export/json
 * 
 * Generate JSON export of EHO report data
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const supabase = getSupabaseAdmin()
    
    const siteId = searchParams.get('site_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const categoriesParam = searchParams.get('categories')
    const includeMissed = searchParams.get('include_missed') === 'true'
    
    if (!siteId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: site_id, start_date, end_date' },
        { status: 400 }
      )
    }
    
    const categories = categoriesParam 
      ? categoriesParam.split(',').map(c => c.trim()).filter(Boolean)
      : null
    
    // Fetch report data
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
      return NextResponse.json(
        { error: 'Failed to fetch report data', details: reportError.message },
        { status: 500 }
      )
    }
    
    // Get compliance summary
    const { data: summaryData } = await supabase.rpc('get_compliance_summary', {
      p_site_id: siteId,
      p_start_date: startDate,
      p_end_date: endDate
    })
    
    // Get site info
    const { data: siteData } = await supabase
      .from('sites')
      .select('id, name, address, postcode')
      .eq('id', siteId)
      .single()
    
    // Fetch extended data
    const extendedDataResponse = await fetch(
      `${request.nextUrl.origin}/api/eho/extended-data?site_id=${siteId}&start_date=${startDate}&end_date=${endDate}`
    )
    const extendedData = extendedDataResponse.ok 
      ? await extendedDataResponse.json().then(r => r.data).catch(() => null)
      : null
    
    // Build comprehensive JSON export structure
    const exportData = {
      metadata: {
        generated_at: new Date().toISOString(),
        site_id: siteId,
        site_name: siteData?.name || 'Unknown Site',
        site_address: siteData?.address || '',
        site_postcode: siteData?.postcode || '',
        date_range: {
          start: startDate,
          end: endDate
        },
        categories: categories || 'all',
        include_missed_tasks: includeMissed,
        total_records: reportData?.length || 0
      },
      summary: summaryData || [],
      task_completions: reportData || [],
      training_records: extendedData?.training_records || [],
      temperature_records: extendedData?.temperature_records || [],
      incident_reports: extendedData?.incident_reports || [],
      cleaning_records: extendedData?.cleaning_records || [],
      pest_control_records: extendedData?.pest_control_records || [],
      opening_closing_checklists: extendedData?.opening_closing_checklists || [],
      supplier_delivery_records: extendedData?.supplier_delivery_records || [],
      maintenance_logs: extendedData?.maintenance_logs || [],
      staff_health_declarations: extendedData?.staff_health_declarations || [],
      allergen_information: extendedData?.allergen_information || []
    }
    
    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="eho-report-${startDate}-to-${endDate}.json"`
      }
    })
  } catch (error: any) {
    console.error('JSON export error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

