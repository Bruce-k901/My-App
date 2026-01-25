import { supabase } from '@/lib/supabase';

/**
 * Get current assignment for a course (any status)
 * Returns assignment ID and status if found
 */
export async function getCurrentAssignment(
  profileId: string,
  courseId: string
): Promise<{ assignmentId?: string; status?: string; companyId?: string } | null> {
  try {
    const { data: assignment, error } = await supabase
      .from('course_assignments')
      .select('id, status, company_id')
      .eq('profile_id', profileId)
      .eq('course_id', courseId)
      .in('status', ['invited', 'confirmed', 'in_progress'])
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error getting current assignment:', error);
      return null;
    }

    if (!assignment) {
      return null;
    }

    return {
      assignmentId: assignment.id,
      status: assignment.status,
      companyId: assignment.company_id,
    };
  } catch (error: any) {
    console.error('Error in getCurrentAssignment:', error);
    return null;
  }
}

/**
 * Check if user can access final assessment for a course
 * Returns access status and assignment ID if allowed
 */
export async function canAccessFinalAssessment(
  profileId: string,
  courseId: string
): Promise<{ allowed: boolean; reason?: string; assignmentId?: string }> {
  try {
    // Check for confirmed or in-progress assignment
    const { data: assignment, error } = await supabase
      .from('course_assignments')
      .select('id, status')
      .eq('profile_id', profileId)
      .eq('course_id', courseId)
      .in('status', ['confirmed', 'in_progress'])
      .maybeSingle();

    if (error) {
      console.error('Error checking course access:', error);
      return {
        allowed: false,
        reason: 'Error checking course assignment. Please try again.',
      };
    }

    if (!assignment) {
      return {
        allowed: false,
        reason: 'You need to be assigned this course by your manager to complete the assessment. Please contact your manager to request access.',
      };
    }

    return {
      allowed: true,
      assignmentId: assignment.id,
    };
  } catch (error: any) {
    console.error('Error in canAccessFinalAssessment:', error);
    return {
      allowed: false,
      reason: 'An error occurred while checking course access. Please try again.',
    };
  }
}
