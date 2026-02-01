// Trial Shift Payment Logic
// Determines if trial shifts should be included in payroll based on hiring outcome

import { supabase } from '@/lib/supabase';

export interface TrialShiftCheck {
  attendanceId: string;
  employeeId: string;
  isTrialShift: boolean;
  onboardingStatus: 'pending' | 'in_progress' | 'hired' | 'not_hired' | null;
  shouldPay: boolean;
  reason: string;
}

/**
 * Check if a trial shift should be included in payroll
 */
export async function checkTrialShiftPayment(
  attendanceId: string,
  companyId: string
): Promise<TrialShiftCheck> {
  // Get attendance record with employee onboarding status
  const { data: attendance, error } = await supabase
    .from('staff_attendance')
    .select(`
      id,
      user_id,
      is_trial_shift,
      profiles!inner (
        id,
        full_name,
        onboarding_status
      )
    `)
    .eq('id', attendanceId)
    .eq('company_id', companyId)
    .single();
  
  if (error || !attendance) {
    return {
      attendanceId,
      employeeId: '',
      isTrialShift: false,
      onboardingStatus: null,
      shouldPay: false,
      reason: 'Attendance record not found',
    };
  }
  
  const profile = Array.isArray(attendance.profiles) 
    ? attendance.profiles[0] 
    : attendance.profiles;
  
  const isTrialShift = attendance.is_trial_shift || false;
  const onboardingStatus = profile?.onboarding_status || null;
  
  // Decision logic
  let shouldPay = true;
  let reason = 'Normal shift - include in payroll';
  
  if (isTrialShift) {
    if (onboardingStatus === 'hired') {
      shouldPay = true;
      reason = 'Trial shift - employee was hired, include in payroll';
    } else if (onboardingStatus === 'not_hired') {
      shouldPay = false;
      reason = 'Trial shift - employee was not hired, exclude from payroll';
    } else {
      // Pending decision - flag for manual review
      shouldPay = false;
      reason = 'Trial shift - hiring decision pending, requires manual review';
    }
  }
  
  return {
    attendanceId,
    employeeId: attendance.user_id,
    isTrialShift,
    onboardingStatus,
    shouldPay,
    reason,
  };
}

/**
 * Get all trial shifts pending payment decision
 */
export async function getTrialShiftsPendingDecision(
  companyId: string,
  startDate: string,
  endDate: string
) {
  try {
    // First, get all trial shifts in the period
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('staff_attendance')
      .select(`
        id,
        user_id,
        clock_in_time,
        clock_out_time,
        total_hours,
        is_trial_shift
      `)
      .eq('company_id', companyId)
      .eq('is_trial_shift', true)
      .gte('clock_in_time', startDate)
      .lte('clock_in_time', endDate + 'T23:59:59');
    
    if (attendanceError) {
      console.error('Error fetching trial shifts attendance:', attendanceError);
      return [];
    }
    
    if (!attendanceData || attendanceData.length === 0) {
      return [];
    }
    
    // Get profile IDs
    const profileIds = attendanceData
      .map(a => a.user_id)
      .filter((id, index, self) => id && self.indexOf(id) === index);
    
    if (profileIds.length === 0) {
      return [];
    }
    
    // Fetch profiles with onboarding status
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, onboarding_status')
      .in('id', profileIds);
    
    if (profilesError) {
      console.error('Error fetching profiles for trial shifts:', profilesError);
      // Continue without profile data - just return attendance data
      return attendanceData.map(a => ({
        ...a,
        profiles: { full_name: 'Unknown', onboarding_status: null }
      }));
    }
    
    // Create a map of profile data
    const profilesMap = new Map(
      (profilesData || []).map(p => [p.id, p])
    );
    
    // Combine attendance with profile data
    const result = attendanceData
      .map(attendance => {
        const profile = profilesMap.get(attendance.user_id);
        const onboardingStatus = profile?.onboarding_status || null;
        
        // Only include if status is pending/in_progress/null (not hired/not_hired)
        if (onboardingStatus && !['pending', 'in_progress'].includes(onboardingStatus)) {
          return null;
        }
        
        return {
          ...attendance,
          profiles: profile || { full_name: 'Unknown', onboarding_status: null }
        };
      })
      .filter(Boolean);
    
    return result;
  } catch (err: any) {
    console.error('Error in getTrialShiftsPendingDecision:', err);
    return [];
  }
}

/**
 * Batch check multiple trial shifts
 */
export async function batchCheckTrialShifts(
  attendanceIds: string[],
  companyId: string
): Promise<TrialShiftCheck[]> {
  const checks = await Promise.all(
    attendanceIds.map(id => checkTrialShiftPayment(id, companyId))
  );
  
  return checks;
}

