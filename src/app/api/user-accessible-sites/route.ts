import { NextRequest, NextResponse } from 'next/server';
import { getUserAccessibleSiteIds } from '@/lib/services/site-access';
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

    // Get accessible site IDs
    const accessibleSiteIds = await getUserAccessibleSiteIds(user.id);

    return NextResponse.json({
      success: true,
      accessibleSiteIds,
    });
  } catch (error: any) {
    console.error('Error fetching accessible sites:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}