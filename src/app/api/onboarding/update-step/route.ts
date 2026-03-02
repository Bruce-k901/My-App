import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { ONBOARDING_STEPS } from '@/types/onboarding';

export async function POST(request: Request) {
  try {
    // Verify authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, stepId, status, notes } = body;

    if (!companyId || !stepId || !status) {
      return NextResponse.json(
        { error: 'companyId, stepId, and status are required' },
        { status: 400 }
      );
    }

    // Validate stepId exists in registry
    const stepDef = ONBOARDING_STEPS.find((s) => s.stepId === stepId);
    if (!stepDef) {
      return NextResponse.json({ error: 'Invalid stepId' }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['not_started', 'in_progress', 'complete', 'skipped'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Check if caller is platform admin or Admin/Owner of this company
    const { data: profile } = await admin
      .from('profiles')
      .select('id, company_id, app_role, is_platform_admin')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    // Fallback to id match
    const resolvedProfile = profile || (await admin
      .from('profiles')
      .select('id, company_id, app_role, is_platform_admin')
      .eq('id', user.id)
      .maybeSingle()).data;

    if (!resolvedProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const isPlatformAdmin = resolvedProfile.is_platform_admin === true;
    const isCompanyAdmin = resolvedProfile.company_id === companyId &&
      ['Admin', 'Owner', 'General Manager', 'Manager'].includes(resolvedProfile.app_role || '');

    if (!isPlatformAdmin && !isCompanyAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Upsert the step progress
    const upsertData: Record<string, unknown> = {
      company_id: companyId,
      step_id: stepId,
      section: stepDef.section,
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'complete' || status === 'skipped') {
      upsertData.completed_at = new Date().toISOString();
      upsertData.completed_by = resolvedProfile.id;
    } else {
      upsertData.completed_at = null;
      upsertData.completed_by = null;
    }

    if (notes !== undefined) {
      upsertData.notes = notes;
    }

    const { error: upsertError } = await admin
      .from('onboarding_progress')
      .upsert(upsertData, { onConflict: 'company_id,step_id' });

    if (upsertError) {
      throw upsertError;
    }

    // ── Bidirectional auto-complete: check if all steps are done ──
    const { data: allProgress } = await admin
      .from('onboarding_progress')
      .select('step_id, status')
      .eq('company_id', companyId);

    const totalSteps = ONBOARDING_STEPS.length;
    const completedOrSkipped = (allProgress || []).filter(
      (p) => p.status === 'complete' || p.status === 'skipped'
    ).length;

    // All steps must have a row AND be complete/skipped
    const allDone = completedOrSkipped >= totalSteps;

    await admin
      .from('companies')
      .update({ setup_complete: allDone })
      .eq('id', companyId);

    return NextResponse.json({ success: true, setup_complete: allDone });
  } catch (error) {
    console.error('Error updating onboarding step:', error);
    return NextResponse.json(
      { error: 'Failed to update onboarding step' },
      { status: 500 }
    );
  }
}
