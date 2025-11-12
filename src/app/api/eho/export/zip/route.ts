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
 * POST /api/eho/export/zip
 * 
 * Generate ZIP package with PDF, JSON, and evidence photos
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
    
    // Call Edge Function to get ZIP data
    const { data: zipData, error: zipError } = await supabase.functions.invoke(
      'generate-eho-zip',
      {
        body: {
          site_id: siteId,
          start_date: startDate,
          end_date: endDate,
          categories: categories,
          include_missed: includeMissed
        }
      }
    )
    
    if (zipError) {
      console.error('Error calling ZIP Edge Function:', zipError)
      return NextResponse.json(
        { error: 'Failed to generate ZIP package', details: zipError.message },
        { status: 500 }
      )
    }
    
    // For now, return JSON with instructions
    // Actual ZIP creation will happen client-side using JSZip
    return NextResponse.json({
      success: true,
      data: zipData,
      message: 'ZIP generation data prepared. Use client-side JSZip to create the package.'
    })
    
  } catch (error: any) {
    console.error('ZIP export error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

