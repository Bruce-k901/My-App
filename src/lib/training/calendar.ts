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
 * Create calendar reminder for course assignment.
 * Creates a notification in the notifications table.
 * Uses ONLY columns that exist in the notifications table:
 *   company_id, user_id, type, title, message, link, metadata, read
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
    const { data: employeeProfile } = await supabaseAdmin
      .from('profiles')
      .select('auth_user_id, email, employee_number')
      .eq('id', assignment.profile_id)
      .maybeSingle();

    let employeeAuthId = employeeProfile?.auth_user_id || null;

    if (!employeeAuthId) {
      // profile.id might BE the auth UUID (old-style profiles)
      const { data: authCheck } = await supabaseAdmin.auth.admin.getUserById(assignment.profile_id);
      if (authCheck?.user) {
        employeeAuthId = assignment.profile_id;
        console.log(`${tag} profile.id IS auth UUID for ${employeeProfile?.employee_number || assignment.profile_id}`);
      } else if (employeeProfile?.email) {
        const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const match = usersList?.users?.find(
          (u) => u.email?.toLowerCase() === employeeProfile.email!.toLowerCase()
        );
        if (match) {
          employeeAuthId = match.id;
          console.log(`${tag} Resolved auth UUID via email for ${employeeProfile.employee_number || employeeProfile.email}`);
        }
      }
    }

    if (!employeeAuthId) {
      console.error(`${tag} Cannot resolve auth UUID:`, {
        profileId: assignment.profile_id,
        employeeNumber: employeeProfile?.employee_number,
        email: employeeProfile?.email,
      });
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

    // Insert notification using ONLY valid columns (no severity/status/due_date/priority)
    // Extra info goes in metadata
    console.log(`${tag} Inserting notification — user_id=${employeeAuthId}, company_id=${profile.company_id}`);

    const { data: notification, error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        company_id: profile.company_id,
        user_id: employeeAuthId,
        type: 'task',
        title: `Complete Training: ${course.name}`,
        message: reminderMessage,
        link: courseUrl,
        read: false,
        metadata: {
          kind: 'training_reminder',
          assignmentId: assignment.id,
          courseId: assignment.course_id,
          dueDate: reminderDate.toISOString().split('T')[0],
          priority: 'medium',
        },
      } as any)
      .select('id')
      .single();

    if (notificationError || !notification) {
      console.error(`${tag} Error creating notification:`, JSON.stringify(notificationError));
      return null;
    }

    console.log(`${tag} Notification created: ${notification.id}`);

    // Update assignment with calendar reference
    await supabaseAdmin
      .from('course_assignments')
      .update({ calendar_task_id: notification.id })
      .eq('id', assignment.id);

    console.log(`${tag} Complete — notification=${notification.id}`);
    return notification.id;
  } catch (error: any) {
    console.error(`${tag} Unexpected error:`, error?.message, error?.stack);
    return null;
  }
}
