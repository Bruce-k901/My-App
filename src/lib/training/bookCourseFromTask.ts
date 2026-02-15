/**
 * Book Course from Certificate Task
 * 
 * Orchestrates the complete flow for booking a course from a certificate expiry task:
 * - Creates course_assignment
 * - Sends msgly notification
 * - Creates calendar reminder
 * - Creates follow-up task for manager
 */

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendCourseAssignmentNotification } from './notifications';
import { createCourseReminderTask } from './calendar';
import { createCourseFollowUpTask } from './createCourseFollowUpTask';

interface BookCourseParams {
  taskId: string;
  profileId: string;
  courseId: string;
  deadline: Date;
  managerId: string;
  companyId: string;
  siteId: string | null;
}

interface CourseAssignment {
  id: string;
  profile_id: string;
  course_id: string;
  company_id: string;
  deadline_date: string | null;
  assigned_by: string | null;
}

interface TrainingCourse {
  id: string;
  name: string;
  code: string | null;
  duration_minutes: number | null;
  content_path: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  auth_user_id: string | null;
}

interface Site {
  id: string;
  name: string;
}

/**
 * Book a course from a certificate expiry task
 * 
 * @param params - Booking parameters
 * @returns Assignment ID or null if booking failed
 */
export async function bookCourseFromCertificateTask(
  params: BookCourseParams
): Promise<string | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Get course details
    const { data: course, error: courseError } = await supabaseAdmin
      .from('training_courses')
      .select('id, name, code, duration_minutes, content_path')
      .eq('id', params.courseId)
      .single();

    if (courseError || !course) {
      console.error('Course not found:', courseError);
      return null;
    }

    // 2. Get employee profile
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, auth_user_id')
      .eq('id', params.profileId)
      .single();

    if (employeeError || !employee) {
      console.error('Employee not found:', employeeError);
      return null;
    }

    // 3. Get site if provided
    let site: Site | null = null;
    if (params.siteId) {
      const { data: siteData } = await supabaseAdmin
        .from('sites')
        .select('id, name')
        .eq('id', params.siteId)
        .single();
      site = siteData;
    }

    // 4. Check if active assignment already exists
    const { data: existingAssignment } = await supabaseAdmin
      .from('course_assignments')
      .select('id')
      .eq('profile_id', params.profileId)
      .eq('course_id', params.courseId)
      .in('status', ['invited', 'confirmed', 'in_progress'])
      .maybeSingle();

    if (existingAssignment) {
      console.warn('Active assignment already exists');
      return existingAssignment.id;
    }

    // 5. Create course assignment
    const deadlineDate = params.deadline.toISOString().split('T')[0];
    
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('course_assignments')
      .insert({
        company_id: params.companyId,
        profile_id: params.profileId,
        course_id: params.courseId,
        status: 'invited',
        assigned_by: params.managerId,
        deadline_date: deadlineDate,
      })
      .select('id')
      .single();

    if (assignmentError || !assignment) {
      console.error('Error creating assignment:', assignmentError);
      return null;
    }

    // 6. Send msgly notification
    let channelId: string | null = null;
    try {
      channelId = await sendCourseAssignmentNotification(
        assignment as CourseAssignment,
        course as TrainingCourse,
        employee as Profile,
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
        assignment as CourseAssignment,
        course as TrainingCourse,
        { id: params.profileId, company_id: params.companyId }
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
        profileId: params.profileId,
        courseId: params.courseId,
        companyId: params.companyId,
        siteId: params.siteId,
        managerId: params.managerId,
        employeeName: employee.full_name || 'Employee',
        courseName: course.name,
        deadlineDate: deadlineDate,
      });
    } catch (error) {
      console.error('Error creating follow-up task:', error);
      // Continue even if follow-up task fails
    }

    return assignment.id;
  } catch (error: any) {
    console.error('Error in bookCourseFromCertificateTask:', error);
    return null;
  }
}
