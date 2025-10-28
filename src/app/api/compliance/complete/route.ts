import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { instance_id, readings } = await request.json()
    
    // Get user from auth header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user_id = '00000000-0000-0000-0000-000000000000' // Replace with actual auth

    // Check for out-of-range temps
    const out_of_range = readings.filter((r: any) => {
      return r.recorded_temp < r.temp_min || r.recorded_temp > r.temp_max
    })

    // If out of range, return error - user must handle via out-of-range endpoint
    if (out_of_range.length > 0) {
      return NextResponse.json({
        error: 'Temperature out of range',
        out_of_range_equipment: out_of_range,
        action_required: true,
      }, { status: 400 })
    }

    // All in range - mark complete
    const { error: update_error } = await supabase
      .from('compliance_task_instances')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user_id,
        completed_data: { readings },
      })
      .eq('id', instance_id)

    if (update_error) throw update_error

    // Record in audit trail
    const { data: instance } = await supabase
      .from('compliance_task_instances')
      .select('site_id')
      .eq('id', instance_id)
      .single()

    await supabase
      .from('compliance_records')
      .insert({
        instance_id,
        site_id: instance.site_id,
        user_id,
        action: 'completed',
        data: { readings },
      })

    return NextResponse.json({ success: true, instance_id, completed_at: new Date().toISOString() })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
