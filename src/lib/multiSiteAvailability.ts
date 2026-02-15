/**
 * Multi-Site Employee Availability Checker
 * 
 * This utility checks if employees are available across multiple sites by:
 * 1. Fetching employee site assignments
 * 2. Checking for existing shifts at other sites
 * 3. Determining if time slots conflict
 */

import { supabase } from '@/lib/supabase';

export interface EmployeeSiteAssignment {
  borrowed_site_id: string;
  borrowed_site_name: string;
  start_date: string;
  end_date: string | null;
}

export interface CrossSiteShift {
  shift_id: string;
  site_id: string;
  site_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  profile_id: string;
  profile_name: string;
}

export interface EmployeeAvailability {
  profile_id: string;
  is_available: boolean;
  reason?: string;
  conflicting_shift?: CrossSiteShift;
}

/**
 * Get all sites an employee can work at (their home site + borrowed sites)
 */
export async function getEmployeeSites(
  employeeId: string,
  companyId: string,
  date: string
): Promise<{ home_site_id: string | null; borrowed_sites: EmployeeSiteAssignment[] }> {
  try {
    // Get employee's home site
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('home_site')
      .eq('id', employeeId)
      .single();

    if (profileError) throw profileError;

    // Get borrowed site assignments active on this date
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('employee_site_assignments')
      .select(`
        borrowed_site_id,
        start_date,
        end_date,
        sites:borrowed_site_id (name)
      `)
      .eq('profile_id', employeeId)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .lte('start_date', date)
      .or(`end_date.is.null,end_date.gte.${date}`);

    if (assignmentsError) throw assignmentsError;

    const borrowed_sites: EmployeeSiteAssignment[] = (assignmentsData || []).map((a: any) => ({
      borrowed_site_id: a.borrowed_site_id,
      borrowed_site_name: a.sites?.name || 'Unknown Site',
      start_date: a.start_date,
      end_date: a.end_date,
    }));

    return {
      home_site_id: profileData?.home_site || null,
      borrowed_sites,
    };
  } catch (error) {
    console.error('Error fetching employee sites:', error);
    return { home_site_id: null, borrowed_sites: [] };
  }
}

/**
 * Get all shifts for an employee across all their assigned sites on a specific date
 */
export async function getEmployeeShiftsAcrossSites(
  employeeId: string,
  date: string,
  excludeSiteId?: string
): Promise<CrossSiteShift[]> {
  try {
    let query = supabase
      .from('staff_schedule')
      .select(`
        id,
        site_id,
        shift_date,
        start_time,
        end_time,
        profile_id,
        profiles:profile_id (full_name),
        sites:site_id (name)
      `)
      .eq('profile_id', employeeId)
      .eq('shift_date', date)
      .neq('status', 'cancelled');

    // Exclude current site if specified (to avoid showing own site's shifts)
    if (excludeSiteId) {
      query = query.neq('site_id', excludeSiteId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((shift: any) => ({
      shift_id: shift.id,
      site_id: shift.site_id,
      site_name: shift.sites?.name || 'Unknown Site',
      shift_date: shift.shift_date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      profile_id: shift.profile_id,
      profile_name: shift.profiles?.full_name || 'Unknown',
    }));
  } catch (error) {
    console.error('Error fetching cross-site shifts:', error);
    return [];
  }
}

/**
 * Check if two time ranges overlap
 * Handles overnight shifts by assuming end time is next day if end < start
 */
export function doTimesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  let s1 = timeToMinutes(start1);
  let e1 = timeToMinutes(end1);
  let s2 = timeToMinutes(start2);
  let e2 = timeToMinutes(end2);

  // Handle overnight shifts
  if (e1 < s1) e1 += 24 * 60;
  if (e2 < s2) e2 += 24 * 60;

  // Check if ranges overlap
  return s1 < e2 && e1 > s2;
}

/**
 * Check if an employee is available for a specific time slot
 * Returns availability status and conflicting shift if unavailable
 */
export async function checkEmployeeAvailability(
  employeeId: string,
  currentSiteId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<EmployeeAvailability> {
  try {
    // Get all shifts for this employee at OTHER sites on this date
    const otherSiteShifts = await getEmployeeShiftsAcrossSites(
      employeeId,
      date,
      currentSiteId
    );

    // Check if any shifts conflict with the proposed time
    for (const shift of otherSiteShifts) {
      if (doTimesOverlap(startTime, endTime, shift.start_time, shift.end_time)) {
        return {
          profile_id: employeeId,
          is_available: false,
          reason: `Working at ${shift.site_name}`,
          conflicting_shift: shift,
        };
      }
    }

    // No conflicts found
    return {
      profile_id: employeeId,
      is_available: true,
    };
  } catch (error) {
    console.error('Error checking employee availability:', error);
    // On error, assume available to not block scheduling
    return {
      profile_id: employeeId,
      is_available: true,
    };
  }
}

/**
 * Batch check availability for multiple employees
 * Useful for checking all staff on a schedule page
 */
export async function checkMultipleEmployeesAvailability(
  employeeIds: string[],
  currentSiteId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<Map<string, EmployeeAvailability>> {
  const availabilityMap = new Map<string, EmployeeAvailability>();

  await Promise.all(
    employeeIds.map(async (employeeId) => {
      const availability = await checkEmployeeAvailability(
        employeeId,
        currentSiteId,
        date,
        startTime,
        endTime
      );
      availabilityMap.set(employeeId, availability);
    })
  );

  return availabilityMap;
}

/**
 * Get all cross-site shifts for a date range (for calendar view)
 */
export async function getCrossSiteShiftsForDateRange(
  employeeIds: string[],
  currentSiteId: string,
  startDate: string,
  endDate: string
): Promise<Map<string, CrossSiteShift[]>> {
  try {
    const { data, error } = await supabase
      .from('staff_schedule')
      .select(`
        id,
        site_id,
        shift_date,
        start_time,
        end_time,
        profile_id,
        profiles:profile_id (full_name),
        sites:site_id (name)
      `)
      .in('profile_id', employeeIds)
      .neq('site_id', currentSiteId)
      .gte('shift_date', startDate)
      .lte('shift_date', endDate)
      .neq('status', 'cancelled');

    if (error) throw error;

    // Group shifts by employee ID
    const shiftsMap = new Map<string, CrossSiteShift[]>();
    
    (data || []).forEach((shift: any) => {
      const crossSiteShift: CrossSiteShift = {
        shift_id: shift.id,
        site_id: shift.site_id,
        site_name: shift.sites?.name || 'Unknown Site',
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        profile_id: shift.profile_id,
        profile_name: shift.profiles?.full_name || 'Unknown',
      };

      const existing = shiftsMap.get(shift.profile_id) || [];
      existing.push(crossSiteShift);
      shiftsMap.set(shift.profile_id, existing);
    });

    return shiftsMap;
  } catch (error) {
    console.error('Error fetching cross-site shifts for date range:', error);
    return new Map();
  }
}

