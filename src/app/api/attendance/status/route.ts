import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/attendance/status
 * Get current shift status for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get active shift using the helper function
    const { data: activeShift, error: shiftError } = await supabase
      .rpc('get_active_shift', { p_profile_id: profile.id });

    if (shiftError) {
      console.error('Error fetching active shift:', shiftError);
      // If function doesn't exist yet, fall back to direct query
      const { data: fallbackShift } = await supabase
        .from('staff_attendance')
        .select('*, site:sites(name)')
        .eq('profile_id', profile.id)
        .eq('shift_status', 'on_shift')
        .is('clock_out_time', null)
        .order('clock_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackShift) {
        const clockInTime = new Date(fallbackShift.clock_in_time);
        const hoursOnShift = (Date.now() - clockInTime.getTime()) / (1000 * 60 * 60);

        return NextResponse.json({
          onShift: true,
          shift: {
            ...fallbackShift,
            hours_on_shift: hoursOnShift,
          },
        });
      }

      return NextResponse.json({
        onShift: false,
        shift: null,
      });
    }

    if (activeShift && activeShift.length > 0) {
      return NextResponse.json({
        onShift: true,
        shift: activeShift[0],
      });
    }

    return NextResponse.json({
      onShift: false,
      shift: null,
    });
  } catch (error: any) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

