/**
 * Create Follow-up Task for Course Completion
 *
 * Creates a task for managers to follow up on course assignments,
 * ensuring candidates complete their courses. Uses OA service layer.
 */

import { oa } from '@/lib/oa';

interface CreateFollowUpTaskParams {
  assignmentId: string;
  profileId: string;
  courseId: string;
  companyId: string;
  siteId: string | null;
  managerId: string;
  employeeName: string;
  courseName: string;
  deadlineDate: string | null;
}

/**
 * Create a follow-up task for a manager to ensure course completion
 *
 * @param params - Follow-up task parameters
 * @returns Task ID or null if creation failed
 */
export async function createCourseFollowUpTask(
  params: CreateFollowUpTaskParams
): Promise<string | null> {
  try {
    // Calculate due date: 7 days after course deadline, or 7 days from now if no deadline
    let dueDate: Date;
    if (params.deadlineDate) {
      const deadline = new Date(params.deadlineDate);
      dueDate = new Date(deadline);
      dueDate.setDate(dueDate.getDate() + 7);
    } else {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
    }

    // Don't create if due date is in the past
    if (dueDate < new Date()) {
      console.warn('Follow-up task due date is in the past, skipping');
      return null;
    }

    const taskName = `Follow-up: ${params.employeeName} - ${params.courseName}`;
    const taskInstructions = `Ensure ${params.employeeName} completes ${params.courseName}. Check their progress and provide support if needed. The course deadline is ${params.deadlineDate ? new Date(params.deadlineDate).toLocaleDateString('en-GB') : 'not set'}.`;

    return await oa.createTask({
      companyId: params.companyId,
      siteId: params.siteId,
      assignedToUserId: params.managerId,
      assignedToRole: 'manager',
      taskName,
      instructions: taskInstructions,
      dueDate: dueDate.toISOString().split('T')[0],
      dueTime: '09:00',
      priority: 'high',
      taskData: {
        source_type: 'course_followup',
        assignment_id: params.assignmentId,
        profile_id: params.profileId,
        course_id: params.courseId,
        employee_name: params.employeeName,
        course_name: params.courseName,
        deadline_date: params.deadlineDate,
      },
      expiresAt: params.deadlineDate || null,
    });
  } catch (error: any) {
    console.error('Error in createCourseFollowUpTask:', error);
    return null;
  }
}
