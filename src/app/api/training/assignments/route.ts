import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST /api/training/assignments
 * Create a new course assignment
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { profileId, courseId, deadline } = body;

    if (!profileId || !courseId) {
      return NextResponse.json(
        { error: 'Missing required fields: profileId and courseId' },
        { status: 400 }
      );
    }

    // Get user's profile to check permissions and get company_id
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, app_role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profileError || !currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has permission (manager/owner/admin)
    const isManager = ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager']
      .includes((currentProfile.app_role || '').toLowerCase());

    if (!isManager) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get target profile and course to verify they exist and are in same company
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id, full_name, email, home_site, site_id')
      .eq('id', profileId)
      .maybeSingle();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'Target employee not found' }, { status: 404 });
    }

    if (targetProfile.company_id !== currentProfile.company_id) {
      return NextResponse.json({ error: 'Employee not in same company' }, { status: 403 });
    }

    const { data: course, error: courseError } = await supabaseAdmin
      .from('training_courses')
      .select('id, company_id, name, code, duration_minutes')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (course.company_id !== currentProfile.company_id) {
      return NextResponse.json({ error: 'Course not in same company' }, { status: 403 });
    }

    // Check if active assignment already exists
    const { data: existingAssignment } = await supabaseAdmin
      .from('course_assignments')
      .select('id')
      .eq('profile_id', profileId)
      .eq('course_id', courseId)
      .in('status', ['invited', 'confirmed', 'in_progress'])
      .maybeSingle();

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Active assignment already exists for this employee and course' },
        { status: 400 }
      );
    }

    // Create assignment
    const deadlineDate = deadline ? new Date(deadline).toISOString().split('T')[0] : null;
    
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('course_assignments')
      .insert({
        company_id: currentProfile.company_id,
        profile_id: profileId,
        course_id: courseId,
        status: 'invited',
        assigned_by: currentProfile.id,
        deadline_date: deadlineDate,
      })
      .select('*')
      .single();

    if (assignmentError) {
      console.error('Error creating assignment:', assignmentError);
      return NextResponse.json(
        { error: 'Failed to create assignment', details: assignmentError.message },
        { status: 500 }
      );
    }

    // Create messaging conversation
    try {
      const { sendCourseAssignmentNotification } = await import('@/lib/training/notifications');
      
      // Get course details
      const { data: courseData } = await supabaseAdmin
        .from('training_courses')
        .select('id, name, code, duration_minutes')
        .eq('id', courseId)
        .single();

      // Get site details if available
      const siteId = targetProfile.home_site || targetProfile.site_id;
      let siteData = null;
      if (siteId) {
        const { data: site } = await supabaseAdmin
          .from('sites')
          .select('id, name')
          .eq('id', siteId)
          .maybeSingle();
        siteData = site;
      }

      if (courseData) {
        const channelId = await sendCourseAssignmentNotification(
          assignment,
          courseData,
          targetProfile,
          siteData
        );

        // Update assignment with conversation reference
        if (channelId) {
          await supabaseAdmin
            .from('course_assignments')
            .update({ msgly_conversation_id: channelId })
            .eq('id', assignment.id);
        }
      }
    } catch (msgError) {
      // Log but don't fail - assignment is created even if messaging fails
      console.error('Error creating messaging notification:', msgError);
    }

    return NextResponse.json({
      success: true,
      data: assignment,
    });
  } catch (error: any) {
    console.error('Error in POST /api/training/assignments:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/training/assignments
 * Get assignments (filter by profileId or companyId)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, app_role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profileError || !currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    const companyId = searchParams.get('companyId');

    // Build query
    let query = supabase
      .from('course_assignments')
      .select(`
        *,
        course:training_courses(id, name, code, category, duration_minutes),
        profile:profiles(id, full_name, email)
      `);

    // Apply filters based on user role
    const isManager = ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager']
      .includes((currentProfile.app_role || '').toLowerCase());

    if (profileId) {
      // If requesting specific profile, check permissions
      if (profileId === currentProfile.id || isManager) {
        query = query.eq('profile_id', profileId);
      } else {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    } else if (companyId) {
      // If requesting company-wide, must be manager
      if (!isManager) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      if (companyId !== currentProfile.company_id) {
        return NextResponse.json({ error: 'Company mismatch' }, { status: 403 });
      }
      query = query.eq('company_id', companyId);
    } else {
      // Default: return user's own assignments
      query = query.eq('profile_id', currentProfile.id);
    }

    const { data: assignments, error: assignmentsError } = await query.order('assigned_at', { ascending: false });

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch assignments', details: assignmentsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: assignments || [],
    });
  } catch (error: any) {
    console.error('Error in GET /api/training/assignments:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
