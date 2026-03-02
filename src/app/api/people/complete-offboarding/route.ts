import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST /api/people/complete-offboarding
 *
 * Finalizes the offboarding process:
 * 1. Verifies all required checklist items are completed
 * 2. Sets profile status to 'inactive'
 * 3. Marks P45 as issued
 * 4. Releases the email address (prefixes with "terminated_")
 */
export async function POST(req: NextRequest) {
  try {
    const { employeeId, p45Issued, p45Date } = await req.json();

    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // 1. Check all required checklist items are completed
    const { data: incompleteRequired, error: checkError } = await admin
      .from('offboarding_checklist_items')
      .select('id, title')
      .eq('profile_id', employeeId)
      .eq('is_required', true)
      .eq('is_completed', false);

    if (checkError) {
      console.error('[complete-offboarding] Checklist check error:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (incompleteRequired && incompleteRequired.length > 0) {
      return NextResponse.json(
        {
          error: 'Not all required checklist items are completed',
          incomplete: incompleteRequired,
        },
        { status: 422 },
      );
    }

    // 2. Fetch current profile to get email
    const { data: currentProfile, error: fetchError } = await admin
      .from('profiles')
      .select('email, full_name, company_id')
      .eq('id', employeeId)
      .single();

    if (fetchError || !currentProfile) {
      console.error('[complete-offboarding] Profile fetch error:', fetchError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 3. Update profile to inactive
    const updateData: Record<string, any> = {
      status: 'inactive',
    };

    if (p45Issued) {
      updateData.p45_issued = true;
      updateData.p45_issued_date = p45Date || new Date().toISOString().split('T')[0];
    }

    // Release email (prefix with "terminated_" to free it for future use)
    if (currentProfile.email && !currentProfile.email.startsWith('terminated_')) {
      updateData.email = `terminated_${employeeId.slice(0, 8)}_${currentProfile.email}`;
    }

    const { data: profile, error: updateError } = await admin
      .from('profiles')
      .update(updateData)
      .eq('id', employeeId)
      .select()
      .single();

    if (updateError) {
      console.error('[complete-offboarding] Profile update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 4. Send OA notification (fire-and-forget)
    try {
      const { oa } = await import('@/lib/oa');
      // Notify admins that offboarding is complete
      if (currentProfile.company_id) {
        const { data: admins } = await admin
          .from('profiles')
          .select('id')
          .eq('company_id', currentProfile.company_id)
          .in('app_role', ['Owner', 'Admin'])
          .eq('status', 'active')
          .limit(5);

        if (admins) {
          for (const adm of admins) {
            await oa.sendNotification({
              recipientProfileId: adm.id,
              companyId: currentProfile.company_id,
              title: 'Offboarding completed',
              body: `The offboarding process for ${currentProfile.full_name} has been completed. Their profile has been archived.`,
              href: `/dashboard/archive`,
            });
          }
        }
      }
    } catch (err) {
      console.error('[complete-offboarding] OA notification error:', err);
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error('[complete-offboarding]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
