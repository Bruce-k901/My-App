import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Create Supabase client lazily to avoid build-time issues
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const site_id = request.nextUrl.searchParams.get('site_id')
    const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!site_id) {
      return NextResponse.json({ error: 'site_id is required' }, { status: 400 })
    }

    const { data: instances, error } = await supabase
      .from('compliance_task_instances')
      .select(`
        *,
        site_compliance_tasks (
          id,
          template_id,
          daypart
        )
      `)
      .eq('site_id', site_id)
      .eq('due_date', date)
      .eq('status', 'pending')

    if (error) throw error

    // Enrich with equipment data
    const enriched = await Promise.all(
      instances.map(async (instance) => {
        const { data: equipment } = await supabase
          .from('compliance_task_equipment')
          .select(`
            *,
            assets (
              name,
              type,
              brand,
              temp_min,
              temp_max
            )
          `)
          .eq('site_compliance_task_id', instance.site_compliance_tasks.id)

        return {
          ...instance,
          equipment: equipment || [],
        }
      })
    )

    return NextResponse.json({ data: enriched })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
