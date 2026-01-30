import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/production/timeline
 * Get production timeline for a specific date
 * Query params: date (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to get company_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: 'User profile or company not found' },
        { status: 404 }
      );
    }

    // Get supplier_id for this company
    const { data: supplier, error: supplierError } = await supabase
      .from('order_book_suppliers')
      .select('id')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .maybeSingle();

    if (supplierError) {
      console.error('Error fetching supplier:', supplierError);
      return NextResponse.json(
        { error: 'Failed to fetch supplier' },
        { status: 500 }
      );
    }

    if (!supplier) {
      return NextResponse.json(
        { error: 'No active supplier found for this company' },
        { status: 404 }
      );
    }

    // Get date from query params
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'date query parameter is required' },
        { status: 400 }
      );
    }

    // Query production_schedule table
    const { data: schedule, error: scheduleError } = await supabase
      .from('order_book_production_schedule')
      .select('*')
      .eq('supplier_id', supplier.id)
      .eq('delivery_date', date)
      .maybeSingle();

    if (scheduleError) {
      console.error('Error fetching production schedule:', scheduleError);
      return NextResponse.json(
        { error: scheduleError.message || 'Failed to fetch production schedule' },
        { status: 500 }
      );
    }

    // If no schedule exists, return empty timeline
    if (!schedule || !schedule.timeline || !Array.isArray(schedule.timeline)) {
      return NextResponse.json({
        success: true,
        data: {
          date,
          schedule: [],
          hasConflicts: false
        }
      });
    }

    // Format timeline data
    const formattedSchedule = (schedule.timeline as any[]).map((step: any, index: number) => {
      // Map stage to activity type
      const activityMap: Record<string, string> = {
        'prep': 'prep',
        'mix': 'mix',
        'proof': 'proof',
        'bake': 'bake',
        'cool': 'cool',
        'pack': 'pack',
        'deliver': 'deliver'
      };

      const activity = activityMap[step.stage] || step.stage || 'prep';
      
      // Parse date and time
      const stepDate = step.date || date;
      const stepTime = step.time || '00:00';
      const startTime = new Date(`${stepDate}T${stepTime}:00`);
      const endTime = new Date(startTime);
      
      // Calculate duration (default to 2 hours if not specified)
      const durationMinutes = step.duration_minutes || 120;
      endTime.setMinutes(endTime.getMinutes() + durationMinutes);
      
      // Format duration string
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      const duration = hours > 0 
        ? `${hours}h ${minutes > 0 ? `${minutes}min` : ''}`.trim()
        : `${minutes}min`;

      // Get equipment info if available
      let equipmentId: string | undefined;
      let equipmentName: string | undefined;
      let capacityPercent: number | undefined;
      let capacityStatus: 'ok' | 'tight' | 'overloaded' | undefined;

      if (step.equipment_id) {
        equipmentId = step.equipment_id;
        // Try to find equipment in the joined data (if available)
        // Otherwise, we'd need to query it separately
        equipmentName = step.equipment_name;
        
        if (step.utilization_percent !== undefined) {
          capacityPercent = step.utilization_percent;
          capacityStatus = capacityPercent > 100 ? 'overloaded' :
                          capacityPercent > 80 ? 'tight' : 'ok';
        }
      }

      // Parse tasks
      const tasks = Array.isArray(step.tasks) ? step.tasks.map((task: any, taskIndex: number) => ({
        id: task.id || `task-${index}-${taskIndex}`,
        icon: task.icon || '📋',
        description: task.description || task.name || 'Task',
        ingredients: Array.isArray(task.ingredients) ? task.ingredients.map((ing: any) => ({
          id: ing.id || `ing-${index}-${taskIndex}-${ing.name}`,
          name: ing.name || ing.ingredient_name || 'Ingredient',
          quantity: `${ing.quantity || 0} ${ing.unit || ''}`.trim()
        })) : undefined
      })) : [];

      return {
        id: step.id || `step-${index}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        activity,
        duration,
        equipmentId,
        equipmentName,
        capacityPercent,
        capacityStatus,
        status: step.status || 'pending' as 'pending' | 'in_progress' | 'complete',
        tasks,
        notes: step.notes || step.description
      };
    }).sort((a, b) => {
      // Sort by start time
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    // Check for conflicts
    const hasConflicts = schedule.capacity_warnings && 
                         Array.isArray(schedule.capacity_warnings) && 
                         schedule.capacity_warnings.length > 0;

    return NextResponse.json({
      success: true,
      data: {
        date,
        schedule: formattedSchedule,
        hasConflicts
      }
    });
  } catch (error) {
    console.error('Error in production timeline API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

