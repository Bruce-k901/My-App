import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    // Parse completion record from request
    const completionRecord = await request.json()

    // Use service role client to bypass RLS entirely
    // We'll verify the user's identity via the completed_by field
    let serviceClient
    try {
      serviceClient = getSupabaseAdmin()
    } catch (error: any) {
      console.error('❌ Failed to initialize Supabase admin client:', error)
      console.error('❌ Environment check:', {
        hasUrl: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasServiceKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE),
        url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
        keyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) || process.env.SUPABASE_SERVICE_ROLE?.substring(0, 10) || 'MISSING'
      })
      return NextResponse.json({ 
        error: 'Supabase service role key is required',
        details: error.message,
        hint: 'Please ensure SUPABASE_SERVICE_ROLE_KEY is set in your environment variables (Vercel deployment settings)'
      }, { status: 500 })
    }

    // Verify completed_by exists and get their profile
    if (!completionRecord.completed_by) {
      return NextResponse.json({ error: 'completed_by is required' }, { status: 400 })
    }

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('id, company_id')
      .eq('id', completionRecord.completed_by)
      .or(`auth_user_id.eq.${completionRecord.completed_by}`)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found for completed_by' }, { status: 404 })
    }

    // Verify company_id matches profile's company
    if (completionRecord.company_id !== profile.company_id) {
      return NextResponse.json({ error: 'Company ID mismatch' }, { status: 403 })
    }

    // Insert completion record using service role (bypasses RLS)
    console.log('📝 Inserting completion record:', {
      task_id: completionRecord.task_id,
      company_id: completionRecord.company_id,
      site_id: completionRecord.site_id,
      completed_by: completionRecord.completed_by
    })
    
    const { data: insertedRecord, error: insertError } = await serviceClient
      .from('task_completion_records')
      .insert(completionRecord)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Task completion insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    
    console.log('✅ Completion record inserted successfully:', {
      id: insertedRecord?.id,
      task_id: insertedRecord?.task_id,
      completed_at: insertedRecord?.completed_at
    })

    // Update task status to 'completed' using service role (bypasses RLS)
    // Check if task has multiple dayparts - if so, only mark complete if all dayparts are done
    const { data: task, error: taskFetchError } = await serviceClient
      .from('checklist_tasks')
      .select('id, task_data, flag_reason, flagged, status')
      .eq('id', completionRecord.task_id)
      .single()

    if (taskFetchError) {
      console.error('❌ Error fetching task for status update:', {
        error: taskFetchError,
        code: taskFetchError.code,
        message: taskFetchError.message,
        task_id: completionRecord.task_id
      })
      // Don't fail - completion record was saved successfully
      // But log the error clearly
    }

    if (!task) {
      console.error('❌ Task not found for status update:', {
        task_id: completionRecord.task_id,
        error: taskFetchError
      })
      // Don't fail - completion record was saved successfully
      // Return success but indicate task update failed
      return NextResponse.json({ 
        data: insertedRecord,
        taskUpdated: false,
        taskUpdateSuccess: false,
        warning: 'Task not found - completion record saved but task status not updated'
      })
    }

    const taskData = task.task_data || {}
    const daypartsInData = taskData.dayparts || []
    const hasMultipleDayparts = Array.isArray(daypartsInData) && daypartsInData.length > 1
    const isMonitoringTask = task.flag_reason === 'monitoring' || task.flagged === true

    // Helper function to normalize daypart names
    const normalizeDaypart = (daypart: string | null | undefined): string => {
      if (!daypart || typeof daypart !== 'string') {
        return 'anytime'
      }
      const normalized = daypart.toLowerCase().trim()
      const daypartMap: Record<string, string> = {
        'afternoon': 'during_service',
        'morning': 'before_open',
        'evening': 'after_service',
        'night': 'after_service',
        'lunch': 'during_service',
        'dinner': 'during_service'
      }
      return daypartMap[normalized] || normalized
    }

    let shouldMarkTaskCompleted = true

    // For multi-daypart tasks, check if all dayparts are completed
    if (hasMultipleDayparts && !isMonitoringTask) {
      const { data: existingCompletions } = await serviceClient
        .from('task_completion_records')
        .select('completion_data')
        .eq('task_id', task.id)

      const completedDayparts = new Set<string>()
      if (existingCompletions) {
        existingCompletions.forEach(record => {
          const completedDaypart = record.completion_data?.completed_daypart
          if (completedDaypart) {
            completedDayparts.add(normalizeDaypart(completedDaypart))
          }
        })
      }

      // Normalize all dayparts from task data (handle both strings and objects)
      const allDayparts = daypartsInData.map((d: any) => {
        const daypartStr = typeof d === 'string' ? d : (d.daypart || d)
        return normalizeDaypart(daypartStr)
      })
      
      const allCompleted = allDayparts.every(daypart => completedDayparts.has(daypart))
      shouldMarkTaskCompleted = allCompleted
    }

    // Update task status if it should be marked as completed
    let taskUpdateSuccess = false
    if (shouldMarkTaskCompleted) {
      console.log('🔄 Attempting to update task status to completed:', {
        task_id: completionRecord.task_id,
        completed_at: completionRecord.completed_at,
        completed_by: completionRecord.completed_by
      })

      // Use maybeSingle() to handle case where task might not exist
      // But we already checked above, so this should work
      const { data: updatedTask, error: updateError } = await serviceClient
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: completionRecord.completed_at,
          completed_by: completionRecord.completed_by
        })
        .eq('id', completionRecord.task_id)
        .select()
        .maybeSingle()

      if (updateError) {
        console.error('❌ Task status update error:', {
          error: updateError,
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          task_id: completionRecord.task_id
        })
        // For critical errors, we should still return success for the completion record
        // but log the task update failure clearly
        // Don't throw - completion record was saved successfully
      } else if (updatedTask) {
        taskUpdateSuccess = true
        console.log('✅ Task status updated successfully:', {
          taskId: updatedTask.id,
          status: updatedTask.status,
          completed_at: updatedTask.completed_at,
          completed_by: updatedTask.completed_by
        })

        // Handle PPM schedule update for PPM tasks
        // NOTE: This runs AFTER task is marked as completed, so errors here won't affect task completion
        // Run asynchronously to avoid blocking the response
        const taskData = updatedTask.task_data || {}
        if (taskData.source_type === 'ppm_overdue' || taskData.source_type === 'ppm_followup') {
          const assetId = taskData.source_id || taskData.asset_id
          if (assetId) {
            // Run PPM update asynchronously - don't await, so it doesn't block the response
            // Errors are caught and logged, but won't affect task completion
            ;(async () => {
              try {
                console.log('🔧 Updating PPM schedule for asset:', assetId)
                
                // Find the PPM schedule record for this asset
                const { data: ppmSchedule, error: ppmError } = await serviceClient
                  .from('ppm_schedule')
                  .select('id, frequency_months, next_service_date')
                  .eq('asset_id', assetId)
                  .order('next_service_date', { ascending: true })
                  .limit(1)
                  .maybeSingle()

                if (ppmError) {
                  console.error('❌ Error fetching PPM schedule:', ppmError)
                  return // Exit early on error
                }
                
                if (!ppmSchedule) {
                  console.warn('⚠️ No PPM schedule found for asset:', assetId)
                  return // Exit early if no schedule found
                }

                // Calculate next service date based on frequency_months
                const completedDate = new Date(completionRecord.completed_at)
                const nextServiceDate = new Date(completedDate)
                nextServiceDate.setMonth(nextServiceDate.getMonth() + (ppmSchedule.frequency_months || 12))

                // Update PPM schedule
                const { error: updatePPMError } = await serviceClient
                  .from('ppm_schedule')
                  .update({
                    last_service_date: completedDate.toISOString().split('T')[0],
                    next_service_date: nextServiceDate.toISOString().split('T')[0],
                    status: 'upcoming',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', ppmSchedule.id)

                if (updatePPMError) {
                  console.error('❌ Error updating PPM schedule:', updatePPMError)
                } else {
                  console.log('✅ PPM schedule updated successfully:', {
                    ppm_id: ppmSchedule.id,
                    last_service_date: completedDate.toISOString().split('T')[0],
                    next_service_date: nextServiceDate.toISOString().split('T')[0],
                    frequency_months: ppmSchedule.frequency_months
                  })
                }
              } catch (ppmUpdateError: any) {
                console.error('❌ Error in PPM schedule update:', ppmUpdateError)
                // Don't fail the task completion - just log the error
              }
            })().catch(err => {
              // Extra safety catch - ensure no unhandled promise rejection
              console.error('❌ Unhandled error in PPM update:', err)
            })
          }
        }
      } else {
        console.warn('⚠️ Task update returned no data - task may not exist:', {
          task_id: completionRecord.task_id
        })
      }
    } else {
      console.log('ℹ️ Task not marked as completed (multi-daypart task, waiting for all instances)')
    }

    return NextResponse.json({ 
      data: insertedRecord,
      taskUpdated: shouldMarkTaskCompleted && taskUpdateSuccess,
      taskUpdateSuccess
    })
  } catch (error: any) {
    console.error('Task completion API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

