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
 * Create calendar reminder for course assignment
 * Creates a notification in the notifications table (not separate calendar_tasks)
 */
export async function createCourseReminderTask(
  assignment: CourseAssignment,
  course: TrainingCourse,
  profile: Profile
): Promise<string | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Resolve the employee's auth UUID (frontend queries notifications by auth UUID)
    const { data: employeeProfile } = await supabaseAdmin
      .from('profiles')
      .select('auth_user_id')
      .eq('id', assignment.profile_id)
      .maybeSingle();

    const employeeAuthId = employeeProfile?.auth_user_id || assignment.profile_id;

    // Calculate reminder date: 7 days before deadline, or 7 days from now if no deadline
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
      console.warn('Reminder date is in the past, skipping reminder creation');
      return null;
    }

    // Build course URL
    const courseUrl = course.content_path 
      ? `/learn/${course.content_path}`
      : `/dashboard/courses`;

    const reminderMessage = `You have been assigned to complete ${course.name}. Click the link to continue your training.

Course: ${course.name}
${assignment.deadline_date ? `Deadline: ${new Date(assignment.deadline_date).toLocaleDateString('en-GB')}` : ''}

[Continue Training](${courseUrl})`;

    // Create notification (use user_id with auth UUID — frontend queries user_id column)
    const { data: notification, error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        company_id: profile.company_id,
        user_id: employeeAuthId,
        type: 'task',
        title: `Complete Training: ${course.name}`,
        message: reminderMessage,
        link: courseUrl,
        severity: 'info',
        status: 'active',
        due_date: reminderDate.toISOString().split('T')[0],
        priority: 'medium',
      } as any)
      .select('id')
      .single();

    if (notificationError || !notification) {
      console.error('Error creating calendar reminder:', notificationError);
      return null;
    }

    // Update assignment with calendar reference
    await supabaseAdmin
      .from('course_assignments')
      .update({ calendar_task_id: notification.id })
      .eq('id', assignment.id);

    return notification.id;
  } catch (error: any) {
    console.error('Error in createCourseReminderTask:', error);
    return null;
  }
}
