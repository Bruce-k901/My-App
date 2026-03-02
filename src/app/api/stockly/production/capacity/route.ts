import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/production/capacity
 * Get equipment capacity status for a specific date
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

    // Get all equipment for this supplier
    const { data: equipment, error: equipmentError } = await supabase
      .from('order_book_equipment')
      .select('*')
      .eq('supplier_id', supplier.id)
      .eq('is_active', true);

    if (equipmentError) {
      console.error('Error fetching equipment:', equipmentError);
      return NextResponse.json(
        { error: equipmentError.message || 'Failed to fetch equipment' },
        { status: 500 }
      );
    }

    if (!equipment || equipment.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          date,
          equipment: [],
          hasOverload: false
        }
      });
    }

    // Get production schedule for this date
    const { data: schedule, error: scheduleError } = await supabase
      .from('order_book_production_schedule')
      .select('timeline, capacity_warnings')
      .eq('supplier_id', supplier.id)
      .eq('delivery_date', date)
      .maybeSingle();

    if (scheduleError) {
      console.error('Error fetching production schedule:', scheduleError);
    }

    // Calculate capacity for each equipment
    const capacityData = equipment.map((eq) => {
      // Get scheduled usage from timeline
      const timeline = schedule?.timeline as any[] || [];
      let scheduled = 0;
      const timeSlots: any[] = [];

      // Parse timeline to find equipment usage
      for (const step of timeline) {
        if (step.equipment_id === eq.id || step.equipment_name === eq.name) {
          const quantity = step.quantity || step.scheduled_quantity || 0;
          scheduled += quantity;
          
          timeSlots.push({
            id: step.id || `slot-${timeSlots.length}`,
            time: step.time || step.start_time || '00:00',
            product: step.product_name || step.description || 'Production',
            quantity: quantity,
            percent: eq.capacity_units ? Math.round((quantity / eq.capacity_units) * 100) : 0
          });
        }
      }

      // Calculate utilization
      const capacity = eq.capacity_units || 100;
      const utilizationPercent = capacity > 0 ? Math.round((scheduled / capacity) * 100) : 0;
      const available = Math.max(0, capacity - scheduled);
      
      // Determine status
      let status: 'ok' | 'tight' | 'overloaded' = 'ok';
      let overloadAmount = 0;
      
      if (utilizationPercent > 100) {
        status = 'overloaded';
        overloadAmount = scheduled - capacity;
      } else if (utilizationPercent > (eq.capacity_percent_max || 80)) {
        status = 'tight';
      }

      // Check capacity warnings from schedule
      const warnings = schedule?.capacity_warnings as any[] || [];
      const equipmentWarning = warnings.find((w: any) => 
        w.equipment_id === eq.id || w.equipment_name === eq.name
      );

      return {
        id: eq.id,
        name: eq.name,
        type: eq.equipment_type,
        capacity: capacity,
        unit: 'units', // Could be enhanced to use capacity_unit if added to table
        scheduled: scheduled,
        available: available,
        utilizationPercent: utilizationPercent,
        status: equipmentWarning ? 'overloaded' : status, // Use warning status if available
        overloadAmount: equipmentWarning ? equipmentWarning.overload_amount : overloadAmount,
        schedule: timeSlots.length > 0 ? timeSlots : undefined
      };
    });

    const hasOverload = capacityData.some(e => e.status === 'overloaded');

    return NextResponse.json({
      success: true,
      data: {
        date,
        equipment: capacityData,
        hasOverload
      }
    });
  } catch (error) {
    console.error('Error in production capacity API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

