import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API route to create a follow-up task after a PPM callout is placed
 * Uses service role to bypass RLS policies
 */
export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { calloutId, assetId, assetName, companyId, siteId } = await request.json()

    if (!calloutId || !assetId || !companyId || !siteId) {
      return NextResponse.json(
        { error: 'Missing required fields: calloutId, assetId, companyId, siteId' },
        { status: 400 }
      )
    }

    // Get the ppm-update-generic template (or create a generic one)
    const { data: template } = await supabase
      .from('task_templates')
      .select('id')
      .eq('slug', 'ppm-update-generic')
      .is('company_id', null)
      .single()

    // If template doesn't exist, we'll create task without template_id
    const templateId = template?.id || null

    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const expiresAt = tomorrow.toISOString()

    // Create follow-up task for PPM callout
    const { data: followupTask, error: taskError } = await supabase
      .from('checklist_tasks')
      .insert({
        company_id: companyId,
        site_id: siteId,
        template_id: templateId,
        due_date: today,
        due_time: new Date().toTimeString().slice(0, 5),
        daypart: 'during_service',
        assigned_to_role: 'manager',
        status: 'pending',
        priority: 'high',
        flagged: true,
        flag_reason: 'ppm_followup',
        generated_at: new Date().toISOString(),
        expires_at: expiresAt,
        custom_name: `Update PPM Task: ${assetName || 'Asset'}`,
        custom_instructions: `Follow-up task for PPM callout. Add notes or close off the PPM task once service has been carried out. This task expires in 24 hours.`,
        task_data: {
          source_type: 'ppm_followup',
          source_id: calloutId, // Callout ID
          asset_id: assetId,
          asset_name: assetName,
          callout_id: calloutId,
          requires_notes_or_close: true
        }
      })
      .select()
      .single()

    if (taskError) {
      console.error('Error creating PPM follow-up task:', taskError)
      return NextResponse.json(
        { error: taskError.message || 'Failed to create follow-up task' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      taskId: followupTask.id,
      message: 'PPM follow-up task created successfully'
    })
  } catch (error: any) {
    console.error('Error in create-ppm-followup route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

