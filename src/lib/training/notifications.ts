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
 * Resolve a profile's auth UUID for messaging/notification purposes.
 * Strategies: auth_user_id field → DB lookup → getUserById check → email match.
 */
async function resolveAuthUUID(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  profileId: string,
  knownAuthId?: string | null
): Promise<string | null> {
  if (knownAuthId) return knownAuthId;

  const { data: profileData } = await supabaseAdmin
    .from('profiles')
    .select('auth_user_id, email, employee_number')
    .eq('id', profileId)
    .maybeSingle();

  if (profileData?.auth_user_id) {
    console.log(`[Training] Resolved auth UUID from auth_user_id for ${profileData.employee_number || profileId}`);
    return profileData.auth_user_id;
  }

  // profile.id might BE the auth UUID (old-style profiles)
  const { data: authCheck } = await supabaseAdmin.auth.admin.getUserById(profileId);
  if (authCheck?.user) {
    console.log(`[Training] profile.id IS auth UUID for ${profileData?.employee_number || profileId}`);
    return profileId;
  }

  // Last resort: match by email
  if (profileData?.email) {
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const match = usersList?.users?.find(
      (u) => u.email?.toLowerCase() === profileData.email!.toLowerCase()
    );
    if (match) {
      console.log(`[Training] Resolved auth UUID via email for ${profileData.employee_number || profileData.email}`);
      return match.id;
    }
  }

  console.error('[Training] Cannot resolve auth UUID:', {
    profileId,
    employeeNumber: profileData?.employee_number,
    email: profileData?.email,
  });
  return null;
}

/**
 * Send course assignment notification via messaging system.
 * Pattern modelled on the working notify-open-shifts route.
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

    // 1. Resolve employee auth UUID
    const employeeAuthId = await resolveAuthUUID(supabaseAdmin, employee.id, employee.auth_user_id);
    if (!employeeAuthId) return null;
    console.log(`${tag} Employee auth UUID: ${employeeAuthId}`);

    // 2. Resolve assigner auth UUID
    let assignerAuthId: string | null = null;
    if (assignment.assigned_by) {
      assignerAuthId = await resolveAuthUUID(supabaseAdmin, assignment.assigned_by);
      console.log(`${tag} Assigner auth UUID: ${assignerAuthId}`);
    }

    // 3. Find or create channel (match notify-open-shifts pattern)
    const channelName = `Training: ${course.name}`;
    let channelId: string | null = null;

    const { data: existingChannel, error: findErr } = await supabaseAdmin
      .from('messaging_channels')
      .select('id')
      .eq('company_id', assignment.company_id)
      .eq('channel_type', 'direct')
      .eq('name', channelName)
      .maybeSingle();

    if (findErr) {
      console.error(`${tag} Error finding channel:`, JSON.stringify(findErr));
      return null;
    }

    if (existingChannel?.id) {
      channelId = existingChannel.id;
      console.log(`${tag} Found existing channel: ${channelId}`);
    } else {
      const createdBy = assignment.assigned_by || employee.id;
      const { data: newChannel, error: chErr } = await supabaseAdmin
        .from('messaging_channels')
        .insert({
          company_id: assignment.company_id,
          channel_type: 'direct',
          name: channelName,
          description: `Course assignment notification for ${course.name}`,
          created_by: createdBy,
          is_auto_created: true,
        } as any)
        .select('id')
        .single();

      if (chErr || !newChannel) {
        console.error(`${tag} Error creating channel:`, JSON.stringify(chErr), { company_id: assignment.company_id, createdBy });
        return null;
      }
      channelId = newChannel.id;
      console.log(`${tag} Created channel: ${channelId}`);
    }

    // 4. Ensure members (best-effort, match notify-open-shifts pattern)
    const memberIds = Array.from(new Set([employeeAuthId, ...(assignerAuthId ? [assignerAuthId] : [])]));

    const { data: existingMembers } = await supabaseAdmin
      .from('messaging_channel_members')
      .select('profile_id,left_at')
      .eq('channel_id', channelId)
      .in('profile_id', memberIds);

    const existingMap = new Map((existingMembers || []).map((m: any) => [m.profile_id || m.user_id, m]));
    const toInsert = memberIds
      .filter((uid) => !existingMap.has(uid))
      .map((uid) => ({
        channel_id: channelId!,
        profile_id: uid,
        member_role: uid === assignerAuthId ? 'admin' : 'member',
      }));

    if (toInsert.length) {
      const { error: memErr } = await supabaseAdmin
        .from('messaging_channel_members')
        .insert(toInsert as any);

      if (memErr) {
        console.error(`${tag} Error adding members:`, JSON.stringify(memErr), { toInsert });
      } else {
        console.log(`${tag} Added ${toInsert.length} member(s)`);
      }
    }

    // Re-activate any members who previously left
    const leftIds = (existingMembers || []).filter((m: any) => m.left_at).map((m: any) => m.profile_id || m.user_id);
    if (leftIds.length) {
      await supabaseAdmin
        .from('messaging_channel_members')
        .update({ left_at: null } as any)
        .eq('channel_id', channelId)
        .in('profile_id', leftIds);
    }

    // 5. Build message content
    const employeeFirstName = employee.full_name?.split(' ')[0] || 'there';
    const durationHours = course.duration_minutes
      ? Math.round(course.duration_minutes / 60 * 10) / 10
      : null;
    const deadlineText = assignment.deadline_date
      ? new Date(assignment.deadline_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'soon';

    const messageContent = `Hi ${employeeFirstName},

You have been assigned to complete the following training course:

${course.name}
${durationHours ? `Estimated duration: ${durationHours} hours` : ''}
${assignment.deadline_date ? `Deadline: ${deadlineText}` : ''}

${site ? `This course is required for your role at ${site.name}.` : 'This course is required for your role.'}

Please click the button below to confirm your details and begin the course. Note: A charge will apply to your site upon successful completion.

If you have any questions, please speak to your manager.

Best regards,
Opsly Training System`;

    // 6. Post message (match notify-open-shifts: plain insert, no .select().single())
    const senderId = assignment.assigned_by || employee.id;
    console.log(`${tag} Inserting message — channel=${channelId}, sender=${senderId}`);

    const { error: msgErr } = await supabaseAdmin
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
      } as any);

    if (msgErr) {
      console.error(`${tag} Error creating message:`, JSON.stringify(msgErr));
      return null;
    }
    console.log(`${tag} Message inserted OK`);

    // 7. Update channel's last_message_at
    await supabaseAdmin
      .from('messaging_channels')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', channelId);

    console.log(`${tag} Complete — channel=${channelId}`);
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
Opsly Training System`;
}
