import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Debug endpoint to check if a calendar task exists for a stock count
 * GET /api/stock-counts/debug-calendar-task/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const countId = params.id;
    const supabaseAdmin = getSupabaseAdmin();

    // Get the stock count
    const { data: count, error: countError } = await supabaseAdmin
      .from('stock_counts')
      .select('id, company_id, status, ready_for_approval_at')
      .eq('id', countId)
      .single();

    if (countError || !count) {
      return NextResponse.json(
        { error: 'Stock count not found', details: countError },
        { status: 404 }
      );
    }

    // Check all handover entries for the company in the last 7 days
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dates: string[] = [];
    for (let d = new Date(sevenDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      dates.push(`handover:${d.toISOString().split('T')[0]}`);
    }

    const results = await Promise.all(
      dates.map((key) =>
        supabaseAdmin
          .from('profile_settings')
          .select('key, value')
          .eq('company_id', count.company_id)
          .eq('key', key)
          .maybeSingle()
      )
    );

    const foundTasks: any[] = [];
    results.forEach((result, index) => {
      if (result.data) {
        const value = typeof result.data.value === 'string' 
          ? JSON.parse(result.data.value) 
          : result.data.value;
        
        if (value?.tasks && Array.isArray(value.tasks)) {
          value.tasks.forEach((task: any) => {
            if (
              task.metadata?.stock_count_id === countId ||
              task.metadata?.type === 'stock_count_approval'
            ) {
              foundTasks.push({
                date: dates[index],
                task: {
                  id: task.id,
                  title: task.title,
                  assignedTo: task.assignedTo,
                  dueDate: task.dueDate,
                  metadata: task.metadata,
                },
              });
            }
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      stockCount: {
        id: count.id,
        company_id: count.company_id,
        status: count.status,
        ready_for_approval_at: count.ready_for_approval_at,
      },
      datesChecked: dates,
      tasksFound: foundTasks.length,
      tasks: foundTasks,
    });
  } catch (error: any) {
    console.error('Error in debug-calendar-task:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
