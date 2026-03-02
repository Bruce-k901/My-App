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
    const { calloutId, assetId, assetName, companyId, siteId, assignedTo } = await request.json()

    if (!calloutId || !assetId || !companyId || !siteId) {
      return NextResponse.json(
        { error: 'Missing required fields: calloutId, assetId, companyId, siteId' },
        { status: 400 }
      )
    }

    // Check if asset is archived - don't create tasks for archived assets
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, archived, name')
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    if (asset.archived) {
      console.log(`Skipping follow-up task creation for archived asset: ${asset.name || assetId}`)
      return NextResponse.json(
        {
          success: false,
          message: 'Asset is archived - follow-up task not created',
          skipped: true
        },
        { status: 200 }
      )
    }

    // STEP 1: Complete the original PPM overdue task
    try {
      const { error: completeError } = await supabase
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: assignedTo || null
        })
        .eq('task_data->>source_id', assetId)
        .in('task_data->>source_type', ['ppm_overdue', 'ppm_service_overdue'])
        .eq('status', 'pending')

      if (completeError) {
        console.error('Error completing original PPM task:', completeError)
      } else {
        console.log(`✅ Completed original PPM task for asset ${assetId}`)
      }
    } catch (err) {
      console.warn('Could not complete original PPM task:', err)
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

    // Use the provided assignedTo or find site manager
    let siteManagerId: string | null = assignedTo || null

    if (!siteManagerId) {
      try {
        // Get site manager from site_staff where is_manager is true
        const { data: siteStaff } = await supabase
          .from('site_staff')
          .select('profile_id')
          .eq('site_id', siteId)
          .eq('is_manager', true)
          .limit(1)
          .single()

        if (siteStaff?.profile_id) {
          siteManagerId = siteStaff.profile_id
          console.log(`Found site manager for site ${siteId}: ${siteManagerId}`)
        } else {
          // Fallback: find any user with manager role at this site
          const { data: managerProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('company_id', companyId)
            .eq('role', 'manager')
            .limit(1)
            .single()

          if (managerProfile?.id) {
            siteManagerId = managerProfile.id
            console.log(`Using fallback manager for site ${siteId}: ${siteManagerId}`)
          }
        }
      } catch (err) {
        console.warn('Could not find site manager, task will be unassigned:', err)
      }
    }

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const dayAfter = new Date()
    dayAfter.setDate(dayAfter.getDate() + 2)
    const expiresAt = dayAfter.toISOString()

    // Create follow-up task for PPM callout
    const taskInsertData: Record<string, any> = {
      company_id: companyId,
      site_id: siteId,
      template_id: templateId,
      due_date: tomorrowStr,
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
        source_id: calloutId,
        asset_id: assetId,
        asset_name: assetName,
        callout_id: calloutId,
        requires_notes_or_close: true
      }
    }

    // Assign to site manager if found
    if (siteManagerId) {
      taskInsertData.assigned_to = siteManagerId
    }

    const { data: followupTask, error: taskError } = await supabase
      .from('checklist_tasks')
      .insert(taskInsertData)
      .select()
      .single()

    if (taskError) {
      console.error('Error creating PPM follow-up task:', taskError)
      return NextResponse.json(
        { error: taskError.message || 'Failed to create follow-up task' },
        { status: 500 }
      )
    }

    console.log(`✅ Created follow-up task ${followupTask.id} for asset ${assetId}`)

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
