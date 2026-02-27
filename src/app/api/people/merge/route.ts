import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

async function repoint(
  admin: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  column: string,
  oldId: string,
  newId: string
): Promise<number> {
  const { count, error } = await admin
    .from(table)
    .update({ [column]: newId })
    .eq(column, oldId)
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.log(`[merge] ${table}.${column}: ${error.code} ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

export async function POST(req: NextRequest) {
  try {
    const { canonicalProfileId, mergeProfileIds, companyId } = await req.json();

    if (!canonicalProfileId || !mergeProfileIds?.length || !companyId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    let updatedRecords = 0;

    // 1. Validate canonical profile
    const { data: canonical, error: fetchError } = await admin
      .from('profiles')
      .select('id, full_name')
      .eq('id', canonicalProfileId)
      .eq('company_id', companyId)
      .single();

    if (fetchError || !canonical) {
      return NextResponse.json({ success: false, error: 'Canonical employee not found' }, { status: 404 });
    }

    // 2. Validate merge profiles
    const { data: mergeRecords, error: mergeError } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', mergeProfileIds)
      .eq('company_id', companyId);

    if (mergeError || !mergeRecords?.length) {
      return NextResponse.json({ success: false, error: 'Merge employees not found' }, { status: 404 });
    }

    // 3. Repoint all FK tables
    for (const oldId of mergeProfileIds) {
      // Tables with profile_id column
      for (const table of [
        'staff_attendance',
        'time_entries',
        'training_records',
        'leave_requests',
        'leave_balances',
        'course_assignments',
        'scheduled_shifts',
        'performance_reviews',
        'employee_onboarding_assignments',
        'staff_availability',
        'timesheets',
      ]) {
        updatedRecords += await repoint(admin, table, 'profile_id', oldId, canonicalProfileId);
      }

      // Tables with employee_id column
      for (const table of [
        'employee_review_schedules',
        'reviews',
      ]) {
        updatedRecords += await repoint(admin, table, 'employee_id', oldId, canonicalProfileId);
      }

      // Tables with manager_id referencing profiles
      for (const table of [
        'employee_review_schedules',
        'reviews',
      ]) {
        updatedRecords += await repoint(admin, table, 'manager_id', oldId, canonicalProfileId);
      }

      // reviews.conducted_by
      updatedRecords += await repoint(admin, 'reviews', 'conducted_by', oldId, canonicalProfileId);

      // Tables with user_id column
      updatedRecords += await repoint(admin, 'training_bookings', 'user_id', oldId, canonicalProfileId);

      // notifications.recipient_user_id
      updatedRecords += await repoint(admin, 'notifications', 'recipient_user_id', oldId, canonicalProfileId);

      // user_site_access.profile_id
      updatedRecords += await repoint(admin, 'user_site_access', 'profile_id', oldId, canonicalProfileId);

      // shift_swap_requests — two FK columns
      updatedRecords += await repoint(admin, 'shift_swap_requests', 'requesting_profile_id', oldId, canonicalProfileId);
      updatedRecords += await repoint(admin, 'shift_swap_requests', 'target_profile_id', oldId, canonicalProfileId);

      // profiles.reports_to self-reference
      updatedRecords += await repoint(admin, 'profiles', 'reports_to', oldId, canonicalProfileId);
    }

    // 4. Deactivate merged profiles
    for (const oldId of mergeProfileIds) {
      const { error } = await admin
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('id', oldId);

      if (error) {
        console.error(`[merge] deactivate ${oldId}:`, error);
        return NextResponse.json({
          success: false,
          updatedRecords,
          error: `Failed to deactivate ${oldId}: ${error.message}`,
        });
      }
    }

    console.log(`[merge] Done: kept ${canonical.full_name}, deactivated ${mergeRecords.map(r => r.full_name).join(', ')}. ${updatedRecords} records repointed.`);
    return NextResponse.json({ success: true, updatedRecords });
  } catch (error) {
    console.error('[merge]', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
