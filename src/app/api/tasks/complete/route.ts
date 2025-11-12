import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Parse completion record from request
    const completionRecord = await request.json()

    // Use service role client to bypass RLS entirely
    // We'll verify the user's identity via the completed_by field
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
    const { data: task } = await serviceClient
      .from('checklist_tasks')
      .select('id, task_data, flag_reason, flagged')
      .eq('id', completionRecord.task_id)
      .single()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
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
      const { data: updatedTask, error: updateError } = await serviceClient
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: completionRecord.completed_at,
          completed_by: completionRecord.completed_by
        })
        .eq('id', completionRecord.task_id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Task status update error:', updateError)
        // Log but don't fail - completion record was saved successfully
      } else if (updatedTask) {
        taskUpdateSuccess = true
        console.log('✅ Task status updated successfully:', {
          taskId: updatedTask.id,
          status: updatedTask.status,
          completed_at: updatedTask.completed_at
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

