import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EHOZipRequest {
  site_id: string
  start_date: string
  end_date: string
  categories?: string[]
  include_missed?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { site_id, start_date, end_date, categories, include_missed }: EHOZipRequest = await req.json()

    if (!site_id || !start_date || !end_date) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch report data
    const { data: reportData, error: reportError } = await supabaseClient.rpc(
      'get_eho_report_data',
      {
        p_site_id: site_id,
        p_start_date: start_date,
        p_end_date: end_date,
        p_template_categories: categories || null
      }
    )

    if (reportError) {
      throw new Error(`Failed to fetch report data: ${reportError.message}`)
    }

    // Fetch compliance summary
    const { data: summaryData } = await supabaseClient.rpc('get_compliance_summary', {
      p_site_id: site_id,
      p_start_date: start_date,
      p_end_date: end_date
    })

    // Fetch site info
    const { data: siteData } = await supabaseClient
      .from('sites')
      .select('id, name, address, postcode, company_id')
      .eq('id', site_id)
      .single()

    // Fetch company info
    let companyData = null
    if (siteData?.company_id) {
      const { data } = await supabaseClient
        .from('companies')
        .select('id, name')
        .eq('id', siteData.company_id)
        .single()
      companyData = data
    }

    // Get completion IDs for evidence files
    const completionIds = (reportData || []).map((r: any) => r.completion_id)
    
    // Fetch evidence file paths
    const { data: evidenceData } = await supabaseClient.rpc('get_evidence_files', {
      p_completion_ids: completionIds
    })

    // Build JSON export
    const jsonExport = {
      metadata: {
        generated_at: new Date().toISOString(),
        site_id: site_id,
        site_name: siteData?.name || 'Unknown Site',
        site_address: siteData?.address || '',
        site_postcode: siteData?.postcode || '',
        company_name: companyData?.name || '',
        date_range: { start: start_date, end: end_date },
        categories: categories || 'all',
        include_missed_tasks: include_missed || false,
        total_records: reportData?.length || 0
      },
      summary: summaryData || [],
      task_completions: reportData || []
    }

    // For ZIP generation, we'll return instructions to the client
    // The actual ZIP creation will happen client-side or via a service
    // This is because Deno's ZIP libraries are limited
    
    // Return JSON with all data needed for ZIP creation
    return new Response(
      JSON.stringify({
        success: true,
        message: 'ZIP generation requires client-side processing or a ZIP service',
        data: {
          json_export: jsonExport,
          evidence_files: evidenceData || [],
          pdf_html: null // Would need to generate HTML for PDF
        },
        instructions: 'Use a ZIP library client-side or integrate with a ZIP service'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error: any) {
    console.error('Error generating ZIP:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate ZIP' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


