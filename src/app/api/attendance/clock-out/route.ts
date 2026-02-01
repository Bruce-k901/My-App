import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/attendance/clock-out
 * Clock out a user from their active shift
 * 
 * Body: { shiftNotes?: string }
 */
export async function POST(request: NextRequest) {
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

    // Parse request body (optional shift notes)
    const body = await request.json().catch(() => ({}));
    const { shiftNotes } = body;

    // Find active shift
    const { data: activeShift, error: shiftError } = await supabase
      .from('staff_attendance')
      .select('id, clock_in_time')
      .eq('profile_id', profile.id)
      .eq('shift_status', 'on_shift')
      .is('clock_out_time', null)
      .order('clock_in_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (shiftError) {
      console.error('Error finding active shift:', shiftError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (!activeShift) {
      return NextResponse.json(
        { error: 'No active shift found. Please clock in first.' },
        { status: 400 }
      );
    }

    // Update shift with clock-out time
    const clockOutTime = new Date().toISOString();
    const { data: updatedAttendance, error: updateError } = await supabase
      .from('staff_attendance')
      .update({
        clock_out_time: clockOutTime,
        shift_status: 'off_shift',
        shift_notes: shiftNotes || null,
        // total_hours will be auto-calculated by trigger
      })
      .eq('id', activeShift.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating attendance record:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to clock out' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attendance: updatedAttendance,
    });
  } catch (error: any) {
    console.error('Clock-out API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

