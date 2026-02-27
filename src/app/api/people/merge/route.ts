import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

interface RepointResult {
  table: string;
  column: string;
  count: number;
  error?: string;
}

async function repoint(
  admin: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  column: string,
  oldId: string,
  newId: string
): Promise<RepointResult> {
  // First check how many rows exist to repoint
  const { count: existing, error: countError } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, oldId);

  if (countError) {
    const msg = `${countError.code} ${countError.message}`;
    if (countError.code !== '42P01') {
      console.log(`[merge] ${table}.${column} count check: ${msg}`);
    }
    return { table, column, count: 0, error: msg };
  }

  if (!existing || existing === 0) {
    return { table, column, count: 0 };
  }

  // Now perform the actual update
  const { data, error } = await admin
    .from(table)
    .update({ [column]: newId })
    .eq(column, oldId)
    .select(column);

  if (error) {
    const msg = `${error.code} ${error.message}`;
    console.log(`[merge] ${table}.${column} update failed (${existing} rows matched): ${msg}`);
    return { table, column, count: 0, error: msg };
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    console.log(`[merge] ${table}.${column}: repointed ${count} rows`);
  }
  return { table, column, count };
}

export async function POST(req: NextRequest) {
  try {
    const { canonicalProfileId, mergeProfileIds, companyId } = await req.json();

    if (!canonicalProfileId || !mergeProfileIds?.length || !companyId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const results: RepointResult[] = [];

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

    console.log(`[merge] Merging ${mergeRecords.map(r => `${r.full_name} (${r.id})`).join(', ')} → ${canonical.full_name} (${canonical.id})`);

    // 3. Repoint all FK tables
    const profileIdTables = [
      'staff_attendance', 'time_entries', 'training_records', 'leave_requests',
      'leave_balances', 'course_assignments', 'scheduled_shifts', 'performance_reviews',
      'employee_onboarding_assignments', 'staff_availability', 'timesheets',
    ];
    const employeeIdTables = ['employee_review_schedules', 'reviews'];
    const managerIdTables = ['employee_review_schedules', 'reviews'];

    for (const oldId of mergeProfileIds) {
      for (const table of profileIdTables) {
        results.push(await repoint(admin, table, 'profile_id', oldId, canonicalProfileId));
      }
      for (const table of employeeIdTables) {
        results.push(await repoint(admin, table, 'employee_id', oldId, canonicalProfileId));
      }
      for (const table of managerIdTables) {
        results.push(await repoint(admin, table, 'manager_id', oldId, canonicalProfileId));
      }
      results.push(await repoint(admin, 'reviews', 'conducted_by', oldId, canonicalProfileId));
      results.push(await repoint(admin, 'training_bookings', 'user_id', oldId, canonicalProfileId));
      results.push(await repoint(admin, 'notifications', 'recipient_user_id', oldId, canonicalProfileId));
      results.push(await repoint(admin, 'user_site_access', 'profile_id', oldId, canonicalProfileId));
      results.push(await repoint(admin, 'shift_swap_requests', 'requesting_profile_id', oldId, canonicalProfileId));
      results.push(await repoint(admin, 'shift_swap_requests', 'target_profile_id', oldId, canonicalProfileId));
      results.push(await repoint(admin, 'profiles', 'reports_to', oldId, canonicalProfileId));
    }

    const updatedRecords = results.reduce((sum, r) => sum + r.count, 0);
    const errors = results.filter(r => r.error);
    const moved = results.filter(r => r.count > 0);

    console.log(`[merge] Repoint summary: ${updatedRecords} records moved across ${moved.length} tables. ${errors.length} tables errored.`);
    if (errors.length > 0) {
      console.log(`[merge] Errors:`, errors.map(e => `${e.table}.${e.column}: ${e.error}`));
    }

    // 4. Deactivate merged profiles and release their email (unique constraint)
    let deactivated = 0;
    for (const oldId of mergeProfileIds) {
      // Fetch current email so we can release it
      const { data: oldProfile } = await admin
        .from('profiles')
        .select('email')
        .eq('id', oldId)
        .single();

      const releasedEmail = oldProfile?.email
        ? `merged_${oldId.slice(0, 8)}_${oldProfile.email}`
        : null;

      const { data: deactivatedData, error } = await admin
        .from('profiles')
        .update({
          status: 'inactive',
          ...(releasedEmail ? { email: releasedEmail } : {}),
        })
        .eq('id', oldId)
        .select('id');

      if (error) {
        console.error(`[merge] deactivate ${oldId}:`, error);
        return NextResponse.json({
          success: false,
          updatedRecords,
          error: `Failed to deactivate ${oldId}: ${error.message}`,
        });
      }

      if (oldProfile?.email) {
        console.log(`[merge] Released email ${oldProfile.email} from ${oldId}`);
      }
      deactivated += deactivatedData?.length ?? 0;
    }

    console.log(`[merge] Done: kept ${canonical.full_name}, deactivated ${deactivated} profiles. ${updatedRecords} records repointed.`);
    return NextResponse.json({
      success: true,
      updatedRecords: updatedRecords + deactivated,
      details: {
        repointed: updatedRecords,
        deactivated,
        errors: errors.length,
      },
    });
  } catch (error) {
    console.error('[merge]', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
