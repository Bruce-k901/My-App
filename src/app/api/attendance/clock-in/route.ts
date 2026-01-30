import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/attendance/clock-in
 * Clock in a user at a specific site
 * 
 * Body: { siteId: string }
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

    // Get user profile to verify company_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, app_role')
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!profile.company_id) {
      return NextResponse.json(
        { error: 'User is not associated with a company' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { siteId } = body;

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId is required' },
        { status: 400 }
      );
    }

    // Verify site exists and belongs to user's company
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, company_id')
      .eq('id', siteId)
      .eq('company_id', profile.company_id)
      .maybeSingle();

    if (siteError || !site) {
      return NextResponse.json(
        { error: 'Site not found or access denied' },
        { status: 403 }
      );
    }

    // Check if user already has an active shift
    const { data: activeShift } = await supabase
      .from('staff_attendance')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('shift_status', 'on_shift')
      .is('clock_out_time', null)
      .maybeSingle();

    if (activeShift) {
      return NextResponse.json(
        { error: 'You already have an active shift. Please clock out first.' },
        { status: 400 }
      );
    }

    // Create new attendance record
    const { data: attendance, error: insertError } = await supabase
      .from('staff_attendance')
      .insert({
        profile_id: profile.id,
        company_id: profile.company_id,
        site_id: siteId,
        clock_in_time: new Date().toISOString(),
        shift_status: 'on_shift',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating attendance record:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to clock in' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attendance,
    });
  } catch (error: any) {
    console.error('Clock-in API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

