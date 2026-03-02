import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get company_id from query params
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');
    const startDate = searchParams.get('start_date'); // YYYY-MM-DD
    const endDate = searchParams.get('end_date'); // YYYY-MM-DD

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required (YYYY-MM-DD format)' },
        { status: 400 }
      );
    }

    // Verify user belongs to the company (security check) - use admin to avoid RLS
    const supabaseAdmin = getSupabaseAdmin();
    const { data: userProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('company_id, id, is_platform_admin')
      .eq('id', user.id)
      .single();

    if (profileErr || !userProfile || (!userProfile.is_platform_admin && userProfile.company_id !== companyId)) {
      return NextResponse.json(
        { error: 'Unauthorized - user does not belong to this company' },
        { status: 403 }
      );
    }

    // Generate date keys for the date range (per-approver format: handover:YYYY-MM-DD:profileId)
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const profileId = userProfile.id;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dates.push(`handover:${dateStr}:${profileId}`);
    }

    console.log('📅 API: Fetching handover tasks for dates:', dates);

    // Query all dates in parallel (supabaseAdmin already obtained above)
    const queries = dates.map((dateKey) =>
      supabaseAdmin
        .from('profile_settings')
        .select('key, value')
        .eq('company_id', companyId)
        .eq('key', dateKey)
        .maybeSingle()
    );

    const results = await Promise.all(queries);

    // Collect all non-null results
    const handoverData: Array<{ key: string; value: any }> = [];
    results.forEach((result, index) => {
      if (result.error) {
        console.warn(`⚠️ Error loading handover for ${dates[index]}:`, result.error);
      } else if (result.data) {
        handoverData.push(result.data);
      }
    });

    console.log(`📅 API: Found ${handoverData.length} handover entries for ${dates.length} dates`);

    return NextResponse.json({
      success: true,
      data: handoverData,
      datesQueried: dates.length,
      entriesFound: handoverData.length,
    });
  } catch (error: any) {
    console.error('❌ Error fetching handover tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
