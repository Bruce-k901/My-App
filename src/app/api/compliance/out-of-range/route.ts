import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { instance_id, equipment_id, recorded_temp, action, check_frequency_hours } = await request.json()
    
    // Get user from auth header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user_id = '00000000-0000-0000-0000-000000000000' // Replace with actual auth

    const { data: instance } = await supabase
      .from('compliance_task_instances')
      .select('site_id, site_compliance_task_id')
      .eq('id', instance_id)
      .single()

    if (action === 'monitoring') {
      // Create monitoring task
      const due_date = new Date()
      due_date.setHours(due_date.getHours() + check_frequency_hours)

      const { data: monitoring_task, error } = await supabase
        .from('monitoring_tasks')
        .insert({
          site_compliance_task_id: instance.site_compliance_task_id,
          asset_id: equipment_id,
          triggered_by_instance_id: instance_id,
          triggered_by_user_id: user_id,
          check_frequency_hours,
          last_recorded_temp: recorded_temp,
          due_date: due_date.toISOString().split('T')[0],
          due_time: due_date.toTimeString().split(' ')[0],
        })
        .select()

      if (error) throw error

      // Send alert to manager/owner
      // TODO: Call alert service (email/SMS)

      return NextResponse.json({ 
        success: true,
        monitoring_task_id: monitoring_task[0].id,
        next_check_time: due_date.toISOString()
      })
    }

    if (action === 'callout') {
      // Return signal to open asset modal
      // TODO: Send alert to manager/owner
      
      return NextResponse.json({ 
        success: true,
        open_asset_modal: true,
        asset_id: equipment_id
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
