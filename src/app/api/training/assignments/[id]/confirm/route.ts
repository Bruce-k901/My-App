import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST /api/training/assignments/[id]/confirm
 * User confirms assignment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assignmentId = params.id;

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, full_name, home_site, site_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profileError || !currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { confirmationName, confirmationSiteId } = body;

    if (!confirmationName) {
      return NextResponse.json(
        { error: 'Confirmation name is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get assignment and verify it belongs to the user
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('course_assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    if (assignment.profile_id !== currentProfile.id) {
      return NextResponse.json({ error: 'This assignment does not belong to you' }, { status: 403 });
    }

    if (assignment.status !== 'invited') {
      return NextResponse.json(
        { error: `Assignment is already ${assignment.status}. Cannot confirm.` },
        { status: 400 }
      );
    }

    // Update assignment status to confirmed
    const { data: updatedAssignment, error: updateError } = await supabaseAdmin
      .from('course_assignments')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmation_name: confirmationName,
        confirmation_site_id: confirmationSiteId || currentProfile.home_site || currentProfile.site_id || null,
      })
      .eq('id', assignmentId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating assignment:', updateError);
      return NextResponse.json(
        { error: 'Failed to confirm assignment', details: updateError.message },
        { status: 500 }
      );
    }

    // Create calendar reminder
    try {
      const { createCourseReminderTask } = await import('@/lib/training/calendar');
      
      // Get course details
      const { data: courseData } = await supabaseAdmin
        .from('training_courses')
        .select('id, name, content_path')
        .eq('id', assignment.course_id)
        .single();

      if (courseData) {
        await createCourseReminderTask(
          updatedAssignment,
          courseData,
          currentProfile
        );
      }
    } catch (reminderError) {
      // Log but don't fail - assignment is confirmed even if reminder fails
      console.error('Error creating calendar reminder:', reminderError);
    }

    return NextResponse.json({
      success: true,
      data: updatedAssignment,
    });
  } catch (error: any) {
    console.error('Error in POST /api/training/assignments/[id]/confirm:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
