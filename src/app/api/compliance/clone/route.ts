import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { site_compliance_task_id, new_daypart } = await request.json()
    
    // Get user from auth header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user_id = '00000000-0000-0000-0000-000000000000' // Replace with actual auth

    // Get original task
    const { data: original_task, error: fetch_error } = await supabase
      .from('site_compliance_tasks')
      .select('*')
      .eq('id', site_compliance_task_id)
      .single()

    if (fetch_error) throw fetch_error

    // Create cloned task
    const { data: cloned_task, error: clone_error } = await supabase
      .from('site_compliance_tasks')
      .insert({
        template_id: original_task.template_id,
        site_id: original_task.site_id,
        daypart: new_daypart,
        is_cloned_from: site_compliance_task_id,
        deployed_by: user_id,
      })
      .select()

    if (clone_error) throw clone_error

    // Clone equipment
    const { data: original_equipment, error: eq_fetch_error } = await supabase
      .from('compliance_task_equipment')
      .select('*')
      .eq('site_compliance_task_id', site_compliance_task_id)

    if (eq_fetch_error) throw eq_fetch_error

    const equipment_to_insert = original_equipment.map(eq => ({
      site_compliance_task_id: cloned_task[0].id,
      asset_id: eq.asset_id,
      site_name: eq.site_name,
      temp_min: eq.temp_min,
      temp_max: eq.temp_max,
      sort_order: eq.sort_order,
    }))

    if (equipment_to_insert.length > 0) {
      await supabase
        .from('compliance_task_equipment')
        .insert(equipment_to_insert)
    }

    // Generate today's instance for cloned task
    const today = new Date().toISOString().split('T')[0]
    await supabase
      .from('compliance_task_instances')
      .insert({
        site_compliance_task_id: cloned_task[0].id,
        site_id: original_task.site_id,
        due_date: today,
        due_daypart: new_daypart,
        status: 'pending',
      })

    return NextResponse.json({ 
      id: cloned_task[0].id, 
      cloned_from: site_compliance_task_id,
      daypart: new_daypart 
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
