import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST /api/training/records/[id]/update-expiry
 * Update the expiry date of a training record.
 * The DB trigger (sync_training_record_to_profile) automatically
 * syncs changes back to profile cert fields.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const recordId = resolvedParams.id;

    if (!recordId) {
      return NextResponse.json({ error: 'Missing record ID' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const supabaseAdmin = getSupabaseAdmin();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, app_role, is_platform_admin')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check permissions (manager/admin only, or platform admin)
    const isManager = profile.is_platform_admin || ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager']
      .includes((profile.app_role || '').toLowerCase());

    if (!isManager) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { expiry_date } = body;

    if (!expiry_date) {
      return NextResponse.json({ error: 'Missing required field: expiry_date' }, { status: 400 });
    }

    // Validate date format
    const expiryDate = new Date(expiry_date);
    if (isNaN(expiryDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Get the training record to verify it exists and belongs to the company
    const { data: record, error: recordError } = await supabaseAdmin
      .from('training_records')
      .select('id, company_id, profile_id, course_id, expiry_date')
      .eq('id', recordId)
      .single();

    if (recordError || !record) {
      return NextResponse.json({ error: 'Training record not found' }, { status: 404 });
    }

    // Verify company access (platform admins bypass)
    if (!profile.is_platform_admin && record.company_id !== profile.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the expiry date - DB trigger syncs to profile fields automatically
    const { error: updateError } = await supabaseAdmin
      .from('training_records')
      .update({
        expiry_date: expiryDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId);

    if (updateError) {
      console.error('Error updating training record expiry:', updateError);
      return NextResponse.json({ error: 'Failed to update expiry date' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      recordId: record.id,
      newExpiryDate: expiryDate.toISOString().split('T')[0],
    });
  } catch (error: any) {
    console.error('Error in update-expiry:', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
