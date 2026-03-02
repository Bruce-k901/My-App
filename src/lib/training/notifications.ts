import { oa, resolveAuthUUID } from '@/lib/oa';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

interface CourseAssignment {
  id: string;
  profile_id: string;
  course_id: string;
  company_id: string;
  deadline_date?: string | null;
  assigned_by?: string | null;
}

interface TrainingCourse {
  id: string;
  name: string;
  code?: string | null;
  duration_minutes?: number | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  auth_user_id?: string | null;
}

interface Site {
  id: string;
  name: string;
}

/**
 * Send course assignment notification via OA → Msgly DM.
 * OA sends the message as itself (not the assigning manager).
 * Returns the channel ID on success, null on failure.
 */
export async function sendCourseAssignmentNotification(
  assignment: CourseAssignment,
  course: TrainingCourse,
  employee: Profile,
  site?: Site | null
): Promise<string | null> {
  const tag = '[Training Msg]';
  try {
    const supabaseAdmin = getSupabaseAdmin();

    console.log(`${tag} Starting — assignment=${assignment.id}, company=${assignment.company_id}, employee=${employee.id}`);

    // Resolve employee profile ID (OA sends DM to profile_id, not auth UUID)
    // But we still need to verify the profile exists
    const employeeAuthId = await resolveAuthUUID(supabaseAdmin, employee.id, employee.auth_user_id);
    if (!employeeAuthId) {
      console.error(`${tag} Cannot resolve auth UUID for employee ${employee.id}`);
      return null;
    }

    // Build message content
    const messageContent = generateAssignmentMessage(assignment, course, employee, site);

    // Send DM from OA
    const channelId = await oa.sendDM({
      recipientProfileId: employee.id,
      content: messageContent,
      companyId: assignment.company_id,
      metadata: {
        messageType: 'course_assignment',
        assignmentId: assignment.id,
        courseId: course.id,
        assignedBy: assignment.assigned_by,
        actionButton: {
          label: 'Confirm & Start Course',
          href: `/training/confirm/${assignment.id}`,
          style: 'primary',
        },
      },
    });

    if (channelId) {
      console.log(`${tag} Complete — channel=${channelId}`);
    }
    return channelId;
  } catch (error: any) {
    console.error(`${tag} Unexpected error:`, error?.message, error?.stack);
    return null;
  }
}

/**
 * Generate assignment message template
 */
export function generateAssignmentMessage(
  assignment: CourseAssignment,
  course: TrainingCourse,
  employee: Profile,
  site?: Site | null
): string {
  const employeeFirstName = employee.full_name?.split(' ')[0] || 'there';
  const durationHours = course.duration_minutes
    ? Math.round(course.duration_minutes / 60 * 10) / 10
    : null;
  const deadlineText = assignment.deadline_date
    ? new Date(assignment.deadline_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'soon';

  return `Hi ${employeeFirstName},

You have been assigned to complete the following training course:

${course.name}
${durationHours ? `Estimated duration: ${durationHours} hours` : ''}
${assignment.deadline_date ? `Deadline: ${deadlineText}` : ''}

${site ? `This course is required for your role at ${site.name}.` : 'This course is required for your role.'}

Please click the button below to confirm your details and begin the course. Note: A charge will apply to your site upon successful completion.

If you have any questions, please speak to your manager.

Best regards,
Opsly Assistant`;
}
