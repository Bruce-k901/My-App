import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Create Supabase client lazily to avoid build-time issues
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { template_id, site_ids, daypart } = await request.json()
    
    // Get user from auth header (you'll need to implement this middleware)
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // For now, we'll use a placeholder user_id - you'll need to implement proper auth
    const user_id = '00000000-0000-0000-0000-000000000000' // Replace with actual auth

    const deployed_tasks = []

    for (const site_id of site_ids) {
      const { data, error } = await supabase
        .from('site_compliance_tasks')
        .insert({
          template_id,
          site_id,
          daypart,
          deployed_by: user_id,
        })
        .select()

      if (error) throw error

      deployed_tasks.push(data[0])

      // Generate today's instance
      const today = new Date().toISOString().split('T')[0]
      await supabase
        .from('compliance_task_instances')
        .insert({
          site_compliance_task_id: data[0].id,
          site_id,
          due_date: today,
          due_daypart: daypart,
          status: 'pending',
        })
    }

    return NextResponse.json({ success: true, deployed: deployed_tasks })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
