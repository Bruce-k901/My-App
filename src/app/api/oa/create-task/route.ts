import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { oa } from '@/lib/oa';
import { resolveAuthUUID } from '@/lib/oa/auth-resolver';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get sender's profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, company_id, full_name')
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .maybeSingle();

    if (!senderProfile?.company_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 3. Parse and validate
    const body = await request.json();
    const { assigneeProfileId, taskName, instructions, dueDate, priority } = body;

    if (!assigneeProfileId || !taskName?.trim() || !dueDate) {
      return NextResponse.json(
        { error: 'Missing required fields: assigneeProfileId, taskName, and dueDate' },
        { status: 400 },
      );
    }

    // 4. Verify assignee exists and is in same company
    const supabaseAdmin = getSupabaseAdmin();
    const { data: assignee } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id, full_name, auth_user_id, site_id')
      .eq('id', assigneeProfileId)
      .maybeSingle();

    if (!assignee) {
      return NextResponse.json({ error: 'Assignee not found' }, { status: 404 });
    }

    if (assignee.company_id !== senderProfile.company_id) {
      return NextResponse.json({ error: 'Assignee not in your company' }, { status: 403 });
    }

    // 5. Resolve auth UUID for the assignee
    const assigneeAuthId = await resolveAuthUUID(
      supabaseAdmin,
      assignee.id,
      assignee.auth_user_id,
    );

    if (!assigneeAuthId) {
      return NextResponse.json(
        { error: 'Could not resolve assignee identity' },
        { status: 500 },
      );
    }

    // 6. Create task via OA
    const taskId = await oa.createTask({
      companyId: senderProfile.company_id,
      siteId: assignee.site_id || null,
      assignedToUserId: assigneeAuthId,
      taskName: taskName.trim(),
      instructions: instructions?.trim() || undefined,
      dueDate,
      priority: priority || 'medium',
      taskData: {
        source_type: 'ai_widget',
        created_by_profile_id: senderProfile.id,
        created_by_name: senderProfile.full_name,
      },
    });

    if (!taskId) {
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      taskId,
      assigneeName: assignee.full_name,
    });
  } catch (error: any) {
    console.error('Error in POST /api/oa/create-task:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
