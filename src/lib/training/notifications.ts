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
 * Send course assignment notification via messaging system
 * Creates a direct message from "System" to the user
 */
export async function sendCourseAssignmentNotification(
  assignment: CourseAssignment,
  course: TrainingCourse,
  employee: Profile,
  site?: Site | null
): Promise<string | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get employee's auth user ID
    let employeeAuthId = employee.auth_user_id;
    if (!employeeAuthId && employee.id) {
      // Try to get auth_user_id from profiles table
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('auth_user_id')
        .eq('id', employee.id)
        .maybeSingle();
      
      employeeAuthId = profileData?.auth_user_id || null;
    }

    if (!employeeAuthId) {
      console.error('Cannot send notification: employee has no auth_user_id', employee.id);
      return null;
    }

    // Check if messaging_channels table exists
    const channelCheck = await supabaseAdmin
      .from('messaging_channels')
      .select('id')
      .limit(1);

    if (channelCheck.error) {
      console.warn('messaging_channels table may not exist, skipping notification:', channelCheck.error);
      return null;
    }

    // Check if a direct channel already exists between "System" and employee
    // For system messages, we'll create a channel with a special name pattern
    const channelName = `Training: ${course.name}`;
    
    // Try to find existing channel for this assignment
    const { data: existingChannel } = await supabaseAdmin
      .from('messaging_channels')
      .select('id')
      .eq('company_id', assignment.company_id)
      .eq('channel_type', 'direct')
      .eq('name', channelName)
      .maybeSingle();

    let channelId: string;

    if (existingChannel) {
      channelId = existingChannel.id;
    } else {
      // Create new direct channel
      // Get the assigner's profile (from assignment.assigned_by)
      let assignerProfileId: string | null = null;
      if (assignment.assigned_by) {
        const { data: assignerProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', assignment.assigned_by)
          .maybeSingle();
        assignerProfileId = assignerProfile?.id || null;
      }

      const createdBy = assignerProfileId || employee.id;

      const { data: newChannel, error: channelError } = await supabaseAdmin
        .from('messaging_channels')
        .insert({
          channel_type: 'direct',
          company_id: assignment.company_id,
          name: channelName,
          created_by: createdBy,
          is_auto_created: true,
          description: `Course assignment notification for ${course.name}`,
        })
        .select('id')
        .single();

      if (channelError || !newChannel) {
        console.error('Error creating messaging channel:', channelError);
        return null;
      }

      channelId = newChannel.id;

      // Add employee as participant
      const { error: membersError } = await supabaseAdmin
        .from('messaging_channel_members')
        .insert({
          channel_id: channelId,
          profile_id: employee.id,
        });

      if (membersError) {
        console.error('Error adding channel member:', membersError);
        // Continue anyway - channel is created
      }

      // Also add assigner if different from employee
      if (assignerProfileId && assignerProfileId !== employee.id) {
        await supabaseAdmin
          .from('messaging_channel_members')
          .insert({
            channel_id: channelId,
            profile_id: assignerProfileId,
          });
      }
    }

    // Generate message content
    const employeeFirstName = employee.full_name?.split(' ')[0] || 'there';
    const durationHours = course.duration_minutes 
      ? Math.round(course.duration_minutes / 60 * 10) / 10 
      : null;
    const deadlineText = assignment.deadline_date
      ? new Date(assignment.deadline_date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'soon';

    const messageContent = `Hi ${employeeFirstName},

You have been assigned to complete the following training course:

📚 ${course.name}
${durationHours ? `⏱️ Estimated duration: ${durationHours} hours` : ''}
${assignment.deadline_date ? `📅 Deadline: ${deadlineText}` : ''}

${site ? `This course is required for your role at ${site.name}.` : 'This course is required for your role.'}

Please click the button below to confirm your details and begin the course. Note: A £5 charge will apply to your site upon successful completion.

If you have any questions, please speak to your manager.

Best regards,
Opsly Training System`;

    // Get sender profile (assigner or employee)
    const senderId = assignment.assigned_by || employee.id;

    // Create message with action button metadata
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messaging_messages')
      .insert({
        channel_id: channelId,
        sender_id: senderId,
        content: messageContent,
        message_type: 'system',
        metadata: {
          type: 'course_assignment',
          assignmentId: assignment.id,
          courseId: course.id,
          actionButton: {
            label: 'Confirm & Start Course',
            url: `/training/confirm/${assignment.id}`,
          },
        },
      } as any)
      .select('id')
      .single();

    if (messageError || !message) {
      console.error('Error creating message:', messageError);
      return null;
    }

    // Update channel's last_message_at
    await supabaseAdmin
      .from('messaging_channels')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', channelId);

    return channelId;
  } catch (error: any) {
    console.error('Error in sendCourseAssignmentNotification:', error);
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
    ? new Date(assignment.deadline_date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'soon';

  return `Hi ${employeeFirstName},

You have been assigned to complete the following training course:

📚 ${course.name}
${durationHours ? `⏱️ Estimated duration: ${durationHours} hours` : ''}
${assignment.deadline_date ? `📅 Deadline: ${deadlineText}` : ''}

${site ? `This course is required for your role at ${site.name}.` : 'This course is required for your role.'}

Please click the button below to confirm your details and begin the course. Note: A £5 charge will apply to your site upon successful completion.

If you have any questions, please speak to your manager.

Best regards,
Opsly Training System`;
}
