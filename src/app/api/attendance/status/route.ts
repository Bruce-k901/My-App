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

        // Self-heal: ensure time_entries record exists so TimeClock UI stays in sync
        const { data: existingEntry } = await supabase
          .from('time_entries')
          .select('id')
          .eq('profile_id', profile.id)
          .eq('status', 'active')
          .is('clock_out', null)
          .maybeSingle();

        if (!existingEntry) {
          await supabase.from('time_entries').insert({
            profile_id: profile.id,
            company_id: fallbackShift.company_id,
            site_id: fallbackShift.site_id,
            clock_in: fallbackShift.clock_in_time,
            status: 'active',
            entry_type: 'shift',
          });
        }

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
      // Self-heal: ensure time_entries record exists so TimeClock UI stays in sync
      const shift = activeShift[0];
      const { data: existingEntry } = await supabase
        .from('time_entries')
        .select('id')
        .eq('profile_id', profile.id)
        .eq('status', 'active')
        .is('clock_out', null)
        .maybeSingle();

      if (!existingEntry && shift.company_id && shift.site_id) {
        await supabase.from('time_entries').insert({
          profile_id: profile.id,
          company_id: shift.company_id,
          site_id: shift.site_id,
          clock_in: shift.clock_in_time,
          status: 'active',
          entry_type: 'shift',
        });
      }

      return NextResponse.json({
        onShift: true,
        shift,
      });
    }

    // User is NOT on shift — clean up any orphaned records
    const now = new Date().toISOString();

    // Clean up orphaned time_entries that are still 'active'
    // This prevents the TimeClock from showing stale "124h" elapsed times
    const { error: cleanupError } = await supabase
      .from('time_entries')
      .update({
        status: 'completed',
        clock_out: now,
        notes: 'Auto-closed: no matching active shift in staff_attendance',
      })
      .eq('profile_id', profile.id)
      .eq('status', 'active')
      .is('clock_out', null);

    if (cleanupError) {
      console.error('Error cleaning up orphaned time_entries (non-fatal):', cleanupError);
    }

    // Also clean up orphaned staff_attendance records that are still 'on_shift'
    // This prevents clock-in from being blocked by a ghost shift
    const { error: attendanceCleanupError } = await supabase
      .from('staff_attendance')
      .update({
        clock_out_time: now,
        shift_status: 'off_shift',
        shift_notes: 'Auto-closed: orphaned shift detected during status check',
      })
      .eq('profile_id', profile.id)
      .eq('shift_status', 'on_shift')
      .is('clock_out_time', null);

    if (attendanceCleanupError) {
      console.error('Error cleaning up orphaned staff_attendance (non-fatal):', attendanceCleanupError);
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

