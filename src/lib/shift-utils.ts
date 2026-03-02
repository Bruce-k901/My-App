/**
 * Shift-based filtering utilities
 * Functions to filter tasks and notifications based on user's current shift status
 */

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type ChecklistTask = Database['public']['Tables']['checklist_tasks']['Row'];

export interface ShiftStatus {
  onShift: boolean;
  siteId: string | null;
  clockInTime: string | null;
  hoursOnShift: number | null;
}

export interface TaskFilterParams {
  siteId?: string | null;
  userId?: string | null;
  showAll?: boolean; // For managers/admins
  onShift?: boolean; // Whether staff is currently on shift (for timing filters)
}

/**
 * Get current shift status for the authenticated user
 */
export async function getCurrentShiftStatus(): Promise<ShiftStatus> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        onShift: false,
        siteId: null,
        clockInTime: null,
        hoursOnShift: null,
      };
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .maybeSingle();

    if (!profile) {
      return {
        onShift: false,
        siteId: null,
        clockInTime: null,
        hoursOnShift: null,
      };
    }

    // Get active shift
    const { data: activeShift } = await supabase
      .from('staff_attendance')
      .select('site_id, clock_in_time')
      .eq('profile_id', profile.id)
      .eq('shift_status', 'on_shift')
      .is('clock_out_time', null)
      .order('clock_in_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeShift) {
      return {
        onShift: false,
        siteId: null,
        clockInTime: null,
        hoursOnShift: null,
      };
    }

    const clockInTime = new Date(activeShift.clock_in_time);
    const hoursOnShift = (Date.now() - clockInTime.getTime()) / (1000 * 60 * 60);

    return {
      onShift: true,
      siteId: activeShift.site_id,
      clockInTime: activeShift.clock_in_time,
      hoursOnShift,
    };
  } catch (error) {
    console.error('Error getting shift status:', error);
    return {
      onShift: false,
      siteId: null,
      clockInTime: null,
      hoursOnShift: null,
    };
  }
}

/**
 * Check if a user should receive notifications
 * Staff: only when on shift at the relevant site
 * Managers/Admins: always
 */
export async function shouldReceiveNotification(
  userId: string,
  siteId: string
): Promise<boolean> {
  try {
    // Get user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) return false;

    // Managers and admins always receive notifications
    const managerRoles = ['manager', 'general_manager', 'admin', 'owner'];
    if (profile.app_role && managerRoles.includes(profile.app_role.toLowerCase())) {
      return true;
    }

    // Staff only receive notifications when on shift at the site
    const { data: activeShift } = await supabase
      .from('staff_attendance')
      .select('site_id')
      .eq('profile_id', userId)
      .eq('shift_status', 'on_shift')
      .eq('site_id', siteId)
      .is('clock_out_time', null)
      .maybeSingle();

    return !!activeShift;
  } catch (error) {
    console.error('Error checking notification eligibility:', error);
    return false;
  }
}

/**
 * Get all users who should receive notifications for a site
 * Returns staff on shift + all managers/admins for the company
 */
export async function getUsersToNotify(siteId: string): Promise<string[]> {
  try {
    // Get site's company_id
    const { data: site } = await supabase
      .from('sites')
      .select('company_id')
      .eq('id', siteId)
      .maybeSingle();

    if (!site) return [];

    const userIds: string[] = [];

    // Get all staff currently on shift at this site
    const { data: staffOnShift } = await supabase
      .from('staff_attendance')
      .select('profile_id')
      .eq('site_id', siteId)
      .eq('shift_status', 'on_shift')
      .is('clock_out_time', null);

    if (staffOnShift) {
      userIds.push(...staffOnShift.map(s => s.profile_id));
    }

    // Get all managers/admins for the company (they always receive notifications)
    const { data: managers } = await supabase
      .from('profiles')
      .select('id')
      .eq('company_id', site.company_id)
      .in('app_role', ['Manager', 'General Manager', 'Admin', 'Owner']);

    if (managers) {
      managers.forEach(m => {
        if (!userIds.includes(m.id)) {
          userIds.push(m.id);
        }
      });
    }

    return userIds;
  } catch (error) {
    console.error('Error getting users to notify:', error);
    return [];
  }
}

/**
 * Build task query filter based on shift status
 * Staff: tasks for their home site (always) or current shift site (when on shift)
 * Managers/Admins: all tasks (no filtering)
 */
export async function buildTaskQueryFilter(): Promise<TaskFilterParams> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { showAll: false };
    }

    // Get user profile with home_site
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, app_role, home_site')
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .maybeSingle();

    if (!profile) {
      return { showAll: false };
    }

    // Managers and admins see all tasks
    const managerRoles = ['manager', 'general_manager', 'admin', 'owner'];
    if (profile.app_role && managerRoles.includes(profile.app_role.toLowerCase())) {
      return { showAll: true };
    }

    // Staff: check if on shift
    const shiftStatus = await getCurrentShiftStatus();
    
    // If staff is on shift, use their current shift site
    if (shiftStatus.onShift && shiftStatus.siteId) {
      return {
        showAll: false,
        siteId: shiftStatus.siteId,
        userId: profile.id,
        onShift: true,
      };
    }

    // Staff not on shift - use their home site instead of showing no tasks
    if (profile.home_site) {
      console.log('📋 Staff not on shift - using home site for task filtering:', profile.home_site);
      return {
        showAll: false,
        siteId: profile.home_site,
        userId: profile.id,
        onShift: false,
      };
    }

    // Fallback: no home site assigned
    console.warn('⚠️ Staff member has no home site assigned');
    return { showAll: false, siteId: null, onShift: false };
  } catch (error) {
    console.error('Error building task filter:', error);
    return { showAll: false };
  }
}

/**
 * Check if a task is due now (within 2 hours of scheduled time)
 * Used for time-based task filtering
 */
export function isTaskDueNow(task: ChecklistTask): boolean {
  if (!task.due_time) return false;

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Check if task is due today
  if (task.due_date !== today) return false;

  // Parse due time
  const [hours, minutes] = task.due_time.split(':').map(Number);
  const dueDateTime = new Date();
  dueDateTime.setHours(hours, minutes, 0, 0);

  // Check if within 2 hours window (1 hour before to 1 hour after)
  const twoHoursInMs = 2 * 60 * 60 * 1000;
  const timeDiff = Math.abs(now.getTime() - dueDateTime.getTime());

  return timeDiff <= twoHoursInMs;
}

/**
 * Filter tasks based on shift status and timing
 * Returns filtered array of tasks
 */
export async function filterTasksByShift(
  tasks: ChecklistTask[]
): Promise<ChecklistTask[]> {
  const filterParams = await buildTaskQueryFilter();

  // Managers/admins see all tasks
  if (filterParams.showAll) {
    return tasks;
  }

  // Staff not on shift see no tasks
  if (!filterParams.siteId) {
    return [];
  }

  // Staff on shift: filter by site and timing
  return tasks.filter(task => {
    // Must be for current site
    if (task.site_id !== filterParams.siteId) {
      return false;
    }

    // Must be due now (within 2 hours window)
    return isTaskDueNow(task);
  });
}

