import { oa, resolveAuthUUID } from '@/lib/oa';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

interface CourseAssignment {
  id: string;
  profile_id: string;
  course_id: string;
  company_id: string;
  deadline_date?: string | null;
}

interface TrainingCourse {
  id: string;
  name: string;
  content_path?: string | null;
}

interface Profile {
  id: string;
  company_id: string;
}

/**
 * Create calendar reminder for course assignment via OA service layer.
 * Creates a notification in the notifications table, due 7 days before deadline.
 */
export async function createCourseReminderTask(
  assignment: CourseAssignment,
  course: TrainingCourse,
  profile: Profile
): Promise<string | null> {
  const tag = '[Training Cal]';
  try {
    const supabaseAdmin = getSupabaseAdmin();

    console.log(`${tag} Starting — assignment=${assignment.id}, profile=${assignment.profile_id}`);

    // Resolve the employee's auth UUID
    const employeeAuthId = await resolveAuthUUID(supabaseAdmin, assignment.profile_id);
    if (!employeeAuthId) {
      console.error(`${tag} Cannot resolve auth UUID for profile ${assignment.profile_id}`);
      return null;
    }

    console.log(`${tag} Employee auth UUID: ${employeeAuthId}`);

    // Calculate reminder date: 7 days before deadline, or 7 days from now
    let reminderDate: Date;
    if (assignment.deadline_date) {
      const deadline = new Date(assignment.deadline_date);
      reminderDate = new Date(deadline);
      reminderDate.setDate(reminderDate.getDate() - 7);
    } else {
      reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 7);
    }

    // Don't create reminder if it's in the past
    if (reminderDate < new Date()) {
      console.warn(`${tag} Reminder date is in the past, skipping`);
      return null;
    }

    // Build course URL
    const courseUrl = course.content_path
      ? `/learn/${course.content_path}`
      : `/dashboard/courses`;

    const reminderMessage = `You have been assigned to complete ${course.name}. Click the link to continue your training.

Course: ${course.name}
${assignment.deadline_date ? `Deadline: ${new Date(assignment.deadline_date).toLocaleDateString('en-GB')}` : ''}`;

    // Create reminder via OA
    const notificationId = await oa.createReminder({
      companyId: profile.company_id,
      recipientUserId: employeeAuthId,
      title: `Complete Training: ${course.name}`,
      message: reminderMessage,
      link: courseUrl,
      dueDate: reminderDate.toISOString().split('T')[0],
      metadata: {
        kind: 'training_reminder',
        assignmentId: assignment.id,
        courseId: assignment.course_id,
        dueDate: reminderDate.toISOString().split('T')[0],
        priority: 'medium',
      },
    });

    if (notificationId) {
      // Update assignment with calendar reference
      await supabaseAdmin
        .from('course_assignments')
        .update({ calendar_task_id: notificationId })
        .eq('id', assignment.id);

      console.log(`${tag} Complete — notification=${notificationId}`);
    }

    return notificationId;
  } catch (error: any) {
    console.error(`${tag} Unexpected error:`, error?.message, error?.stack);
    return null;
  }
}
