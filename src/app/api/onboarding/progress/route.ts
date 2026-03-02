import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    // Verify authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Check if caller is platform admin or belongs to this company
    const { data: profile } = await admin
      .from('profiles')
      .select('company_id, is_platform_admin')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile) {
      // Fallback: try matching by id (both patterns exist in the codebase)
      const { data: profileById } = await admin
        .from('profiles')
        .select('company_id, is_platform_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (!profileById) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      const isPlatformAdmin = profileById.is_platform_admin === true;
      if (!isPlatformAdmin && profileById.company_id !== companyId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else {
      const isPlatformAdmin = profile.is_platform_admin === true;
      if (!isPlatformAdmin && profile.company_id !== companyId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Fetch progress using admin client (bypasses RLS for platform admins)
    const { data: progress, error: progressError } = await admin
      .from('onboarding_progress')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    if (progressError) {
      // Table may not exist yet if migration hasn't run
      if (progressError.code === '42P01') {
        return NextResponse.json({ progress: [] });
      }
      throw progressError;
    }

    return NextResponse.json({ progress: progress || [] });
  } catch (error) {
    console.error('Error fetching onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding progress' },
      { status: 500 }
    );
  }
}
