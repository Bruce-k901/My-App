import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendCourseAssignmentNotification } from '@/lib/training/notifications';
import { createCourseReminderTask } from '@/lib/training/calendar';
import { createCourseFollowUpTask } from '@/lib/training/createCourseFollowUpTask';

/**
 * POST /api/training/book-course-from-task
 * Book a course from a certificate expiry task
 */
export async function POST(request: NextRequest) {
  console.log('🚀 [BOOK COURSE API] Route hit');
  try {
    const supabase = await createServerSupabaseClient();
    console.log('✅ [BOOK COURSE API] Supabase client created');

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth error in book-course-from-task:', {
        error: authError,
        message: authError.message,
        status: authError.status
      });
      return NextResponse.json({ error: 'Unauthorized', details: authError.message }, { status: 401 });
    }

    if (!user) {
      console.error('No user found in book-course-from-task');
      return NextResponse.json({ error: 'Unauthorized', details: 'No user found' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, app_role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check permissions (manager/admin only)
    const isManager = ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager']
      .includes((profile.app_role || '').toLowerCase());

    if (!isManager) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { taskId, profileId, courseId, deadline, companyId, siteId } = body;

    console.log('📥 [BOOK COURSE API] Request received:', {
      taskId,
      profileId,
      courseId,
      deadline,
      companyId,
      siteId,
      userCompanyId: profile.company_id
    });

    if (!profileId || !courseId || !deadline || !companyId) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        received: { profileId: !!profileId, courseId: !!courseId, deadline: !!deadline, companyId: !!companyId }
      }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Get course details
    console.log('🔍 [BOOK COURSE API] Looking up course:', { 
      courseId, 
      userCompanyId: profile.company_id, 
      requestCompanyId: companyId 
    });
    
    // Try lookup by ID - use admin client which bypasses RLS
    const { data: course, error: courseError } = await supabaseAdmin
      .from('training_courses')
      .select('id, name, code, duration_minutes, company_id, is_active')
      .eq('id', courseId)
      .maybeSingle(); // Use maybeSingle to avoid error if not found

    if (courseError) {
      console.error('❌ [BOOK COURSE API] Course query error:', {
        error: courseError,
        code: courseError.code,
        message: courseError.message,
        details: courseError.details,
        hint: courseError.hint,
        courseId
      });
      return NextResponse.json({ 
        error: 'Course lookup failed', 
        details: courseError.message || 'Database error',
        courseId 
      }, { status: 500 });
    }

    if (!course) {
      console.error('❌ [BOOK COURSE API] Course not found:', { 
        courseId,
        userCompanyId: profile.company_id,
        requestCompanyId: companyId
      });
      
      // Try to find any course with this ID to see if it exists at all
      const { data: anyCourse, error: anyError } = await supabaseAdmin
        .from('training_courses')
        .select('id, name, company_id')
        .eq('id', courseId)
        .maybeSingle();
      
      if (anyCourse) {
        console.error('⚠️ [BOOK COURSE API] Course exists but company mismatch:', {
          courseCompanyId: anyCourse.company_id,
          userCompanyId: profile.company_id,
          requestCompanyId: companyId
        });
        return NextResponse.json({ 
          error: 'Course not available for your company',
          details: 'Course belongs to a different company'
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        error: 'Course not found', 
        details: 'Course does not exist in the database',
        courseId 
      }, { status: 404 });
    }
    
    console.log('✅ [BOOK COURSE API] Course found:', {
      courseId: course.id,
      courseName: course.name,
      courseCompanyId: course.company_id,
      isActive: course.is_active
    });

    // Verify course belongs to company (allow NULL company_id for system-wide courses)
    // Also allow if requestCompanyId matches (in case of cross-company scenarios)
    const companyMatches = course.company_id === null || 
                          course.company_id === profile.company_id || 
                          course.company_id === companyId;
    
    if (!companyMatches) {
      console.error('❌ [BOOK COURSE API] Course company mismatch:', {
        courseCompanyId: course.company_id,
        userCompanyId: profile.company_id,
        requestCompanyId: companyId,
        courseId,
        courseName: course.name
      });
      return NextResponse.json({ 
        error: 'Course not available for your company',
        details: 'Course belongs to a different company'
      }, { status: 403 });
    }
    
    console.log('✅ [BOOK COURSE API] Course company verified:', {
      courseCompanyId: course.company_id,
      userCompanyId: profile.company_id,
      matches: companyMatches
    });

    // Verify course is active
    if (course.is_active === false) {
      console.error('❌ [BOOK COURSE API] Course is not active:', { 
        courseId, 
        is_active: course.is_active,
        courseName: course.name
      });
      return NextResponse.json({ 
        error: 'Course is not active',
        details: 'This course has been deactivated'
      }, { status: 400 });
    }

    console.log('✅ [BOOK COURSE API] Course found:', { courseId: course.id, courseName: course.name });

    // 2. Get employee profile
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, auth_user_id')
      .eq('id', profileId)
      .single();

    if (employeeError || !employee) {
      console.error('Employee not found:', employeeError);
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // 3. Get site if provided
    let site: { id: string; name: string } | null = null;
    if (siteId) {
      const { data: siteData } = await supabaseAdmin
        .from('sites')
        .select('id, name')
        .eq('id', siteId)
        .single();
      site = siteData;
    }

    // 4. Check if active assignment already exists
    const { data: existingAssignment } = await supabaseAdmin
      .from('course_assignments')
      .select('id')
      .eq('profile_id', profileId)
      .eq('course_id', courseId)
      .in('status', ['invited', 'confirmed', 'in_progress'])
      .maybeSingle();

    if (existingAssignment) {
      console.warn('Active assignment already exists');
      return NextResponse.json({
        success: true,
        assignmentId: existingAssignment.id,
        message: 'Active assignment already exists',
      });
    }

    // 5. Create course assignment
    const deadlineDate = new Date(deadline).toISOString().split('T')[0];
    
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('course_assignments')
      .insert({
        company_id: companyId,
        profile_id: profileId,
        course_id: courseId,
        status: 'invited',
        assigned_by: profile.id,
        deadline_date: deadlineDate,
      })
      .select('id')
      .single();

    if (assignmentError || !assignment) {
      console.error('❌ [BOOK COURSE API] Error creating assignment:', {
        error: assignmentError,
        code: assignmentError?.code,
        message: assignmentError?.message,
        details: assignmentError?.details,
        hint: assignmentError?.hint,
        insertData: {
          company_id: companyId,
          profile_id: profileId,
          course_id: courseId,
          status: 'invited',
          assigned_by: profile.id,
          deadline_date: deadlineDate,
        }
      });
      return NextResponse.json({ 
        error: 'Failed to create course assignment',
        details: assignmentError?.message || 'Unknown error',
        hint: assignmentError?.hint || undefined
      }, { status: 500 });
    }

    // 6. Send msgly notification
    let channelId: string | null = null;
    try {
      channelId = await sendCourseAssignmentNotification(
        assignment as any,
        course as any,
        employee as any,
        site
      );
      
      // Update assignment with channel ID
      if (channelId) {
        await supabaseAdmin
          .from('course_assignments')
          .update({ msgly_conversation_id: channelId })
          .eq('id', assignment.id);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      // Continue even if notification fails
    }

    // 7. Create calendar reminder
    try {
      const notificationId = await createCourseReminderTask(
        assignment as any,
        course as any,
        { id: profileId, company_id: companyId }
      );
      
      // Update assignment with notification ID
      if (notificationId) {
        await supabaseAdmin
          .from('course_assignments')
          .update({ calendar_task_id: notificationId })
          .eq('id', assignment.id);
      }
    } catch (error) {
      console.error('Error creating calendar reminder:', error);
      // Continue even if reminder fails
    }

    // 8. Create follow-up task for manager
    try {
      await createCourseFollowUpTask({
        assignmentId: assignment.id,
        profileId: profileId,
        courseId: courseId,
        companyId: companyId,
        siteId: siteId,
        managerId: profile.id,
        employeeName: employee.full_name || 'Employee',
        courseName: course.name,
        deadlineDate: deadlineDate,
      });
    } catch (error) {
      console.error('Error creating follow-up task:', error);
      // Continue even if follow-up task fails
    }

    // 9. Complete the originating task (certificate expiry task)
    if (taskId) {
      try {
        const { error: taskUpdateError } = await supabaseAdmin
          .from('checklist_tasks')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: profile.id,
            completion_notes: `Course booked: ${course.name} (deadline: ${deadlineDate})`,
          })
          .eq('id', taskId);

        if (taskUpdateError) {
          console.error('Error completing originating task:', taskUpdateError);
        }
      } catch (error) {
        console.error('Error completing originating task:', error);
      }
    }

    return NextResponse.json({
      success: true,
      assignmentId: assignment.id,
    });
  } catch (error: any) {
    console.error('❌ [BOOK COURSE API] Unexpected error:', {
      error,
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error?.message || 'An unexpected error occurred',
      type: error?.name || 'UnknownError'
    }, { status: 500 });
  }
}
