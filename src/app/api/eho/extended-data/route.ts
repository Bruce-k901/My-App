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
 * GET /api/eho/extended-data
 * 
 * Fetch all extended EHO report data (training, temperature, incidents, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    
    const siteId = searchParams.get('site_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    
    if (!siteId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: site_id, start_date, end_date' },
        { status: 400 }
      )
    }
    
    // Fetch all extended data in parallel
    const [
      trainingRecords,
      temperatureRecords,
      incidentReports,
      cleaningRecords,
      pestControlRecords,
      openingClosingChecklists,
      supplierDeliveryRecords,
      maintenanceLogs,
      staffHealthDeclarations,
      allergenInformation
    ] = await Promise.all([
      supabase.rpc('get_eho_training_records', {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate
      }),
      supabase.rpc('get_eho_temperature_records', {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate
      }),
      supabase.rpc('get_eho_incident_reports', {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate
      }),
      supabase.rpc('get_eho_cleaning_records', {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate
      }),
      supabase.rpc('get_eho_pest_control_records', {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate
      }),
      supabase.rpc('get_eho_opening_closing_checklists', {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate
      }),
      supabase.rpc('get_eho_supplier_delivery_records', {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate
      }),
      supabase.rpc('get_eho_maintenance_logs', {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate
      }),
      supabase.rpc('get_eho_staff_health_declarations', {
        p_site_id: siteId,
        p_start_date: startDate,
        p_end_date: endDate
      }),
      supabase.rpc('get_eho_allergen_information', {
        p_site_id: siteId
      })
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        training_records: trainingRecords.data || [],
        temperature_records: temperatureRecords.data || [],
        incident_reports: incidentReports.data || [],
        cleaning_records: cleaningRecords.data || [],
        pest_control_records: pestControlRecords.data || [],
        opening_closing_checklists: openingClosingChecklists.data || [],
        supplier_delivery_records: supplierDeliveryRecords.data || [],
        maintenance_logs: maintenanceLogs.data || [],
        staff_health_declarations: staffHealthDeclarations.data || [],
        allergen_information: allergenInformation.data || [],
        metadata: {
          site_id: siteId,
          start_date: startDate,
          end_date: endDate
        }
      },
      errors: {
        training: trainingRecords.error?.message,
        temperature: temperatureRecords.error?.message,
        incidents: incidentReports.error?.message,
        cleaning: cleaningRecords.error?.message,
        pest_control: pestControlRecords.error?.message,
        checklists: openingClosingChecklists.error?.message,
        supplier_delivery: supplierDeliveryRecords.error?.message,
        maintenance: maintenanceLogs.error?.message,
        staff_health: staffHealthDeclarations.error?.message,
        allergen: allergenInformation.error?.message
      }
    })
  } catch (error: any) {
    console.error('Extended data API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

