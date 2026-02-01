'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Lock,
  Unlock,
  Check,
  Send,
  LayoutList,
  Users
} from 'lucide-react';
import WeeklyEmployeeView from './components/WeeklyEmployeeView';
import { toast } from 'sonner';
import TimePicker from '@/components/ui/TimePicker';

// Helper function to calculate hours between two time strings (HH:MM format)
// Returns hours as a number, or null if invalid
function calculateHoursBetween(startTime: string | null, endTime: string | null, breakMinutes: number = 0): number | null {
  if (!startTime || !endTime) return null;
  
  try {
    // Normalize time format
    const normalizeTime = (time: string): string => {
      if (time.includes(':')) {
        return time;
      }
      // If no colon, assume HHMM format
      if (time.length === 4) {
        return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
      }
      return time;
    };
    
    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = normalizeTime(endTime);
    
    const startParts = normalizedStart.split(':');
    const endParts = normalizedEnd.split(':');
    
    if (startParts.length !== 2 || endParts.length !== 2) {
      return null;
    }
    
    const startHours = parseInt(startParts[0], 10);
    const startMinutes = parseInt(startParts[1], 10);
    const endHours = parseInt(endParts[0], 10);
    const endMinutes = parseInt(endParts[1], 10);
    
    if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) {
      return null;
    }
    
    // Convert to total minutes
    let startTotalMinutes = startHours * 60 + startMinutes;
    let endTotalMinutes = endHours * 60 + endMinutes;
    
    // Handle overnight shifts (if end time is before start time, assume next day)
    if (endTotalMinutes < startTotalMinutes) {
      endTotalMinutes += 24 * 60; // Add 24 hours
    }
    
    // Calculate difference in hours
    const grossHours = (endTotalMinutes - startTotalMinutes) / 60;
    const breakHours = breakMinutes / 60;
    const netHours = grossHours - breakHours;
    
    // Debug logging for the specific case mentioned
    if ((startTime === '06:00' && endTime === '09:30') || (startTime === '06:00' && endTime === '09:30')) {
      console.log(`[CALC DEBUG] ${startTime} to ${endTime}:`, {
        startTotalMinutes,
        endTotalMinutes,
        grossHours,
        breakMinutes,
        breakHours,
        netHours,
        calculation: `${endTotalMinutes} - ${startTotalMinutes} = ${endTotalMinutes - startTotalMinutes} minutes = ${grossHours} hours - ${breakHours} hours = ${netHours} hours`
      });
    }
    
    // Validate result
    if (netHours < 0 || netHours > 48 || isNaN(netHours) || !isFinite(netHours)) {
      console.warn(`[CALC] Invalid result for ${startTime} to ${endTime}: ${netHours}`);
      return null;
    }
    
    return netHours;
  } catch (err) {
    return null;
  }
}

interface EmployeeRow {
  staffId: string;
  staffName: string;
  positionTitle: string | null;
  hourlyRate: number | null;
  employmentType: string | null; // 'hourly' | 'salaried' | null
  salary: number | null; // For salaried employees
  weeklyHours: number | null; // Weekly hours for salaried employees
  // Day data - indexed by date string
  days: {
    [date: string]: {
      scheduledStart: string | null;
      scheduledEnd: string | null;
      scheduledBreakMinutes: number | null;
      scheduledNetHours: number | null; // Net hours after breaks
      scheduledShiftId: string | null; // rota_shifts.id for trial shift checking
      clockIn: string | null;
      clockOut: string | null;
      actualHours: number | null; // Total hours from attendance (already has breaks subtracted)
      attendanceId: string | null;
      signedOff: boolean;
      isTrialShift: boolean; // Whether this is a trial shift
      shouldPayTrial: boolean; // Whether trial shift should be paid
      trialPaymentRate: number | null; // Trial shift payment rate if applicable
    };
  };
}

export default function AttendanceSignOffPage() {
  const { profile } = useAppContext();
  
  // Memoize profile values - use stable string values, not object references
  const companyId = useMemo(() => profile?.company_id || null, [profile?.company_id]);
  const userId = useMemo(() => profile?.id || null, [profile?.id]);
  
  // Loading guard
  const isLoadingRef = useRef(false);
  
  // Ref to track latest employees state (to avoid stale closures)
  const employeesRef = useRef<EmployeeRow[]>([]);
  
  // Ref to track last loaded state to prevent unnecessary reloads
  const lastLoadedRef = useRef<{ siteId: string; weekStart: string; companyId: string } | null>(null);
  
  // State
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [sites, setSites] = useState<Array<{id: string, name: string}>>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });
  
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  
  // Update ref whenever employees state changes (must be after employees declaration)
  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [payDate, setPayDate] = useState<Date | null>(null);
  const [locking, setLocking] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  // Get week dates (Monday to Sunday)
  const weekDates = useMemo(() => {
    const dates: { date: string; dayName: string }[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        dayName: dayNames[date.getDay()]
      });
    }
    return dates;
  }, [weekStart]);

  const weekStartStr = useMemo(() => weekStart.toISOString().split('T')[0], [weekStart]);

  // Load sites
  useEffect(() => {
    async function loadSites() {
      if (!companyId) return;
      
      const { data } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name');
      
      if (data && data.length > 0) {
        setSites(data);
        // Only set selectedSiteId if it's not already set or if the current one is not in the list
        setSelectedSiteId(prev => {
          if (!prev && data[0]?.id) {
            return data[0].id;
          }
          // If current selection is still valid, keep it
          if (prev && data.some(site => site.id === prev)) {
            return prev;
          }
          // Otherwise, select the first one
          return data[0]?.id || prev;
        });
      }
    }
    loadSites();
  }, [companyId]);

  // Load attendance data
  const loadWeekData = useCallback(async () => {
    // Early returns
    if (!selectedSiteId || !companyId) {
      return;
    }
    
    // Prevent concurrent loads
    if (isLoadingRef.current) {
      return;
    }
    
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const startStr = weekStartStr;
      const endStr = weekEnd.toISOString().split('T')[0];
      
      // Find the rota for this site and week
      const { data: rotaData } = await supabase
        .from('rotas')
        .select('id')
        .eq('site_id', selectedSiteId)
        .eq('week_starting', startStr)
        .maybeSingle();
      
      // Fetch scheduled shifts from rota
      let scheduledShifts: any[] = [];
      if (rotaData) {
        const { data: shiftsData } = await supabase
          .from('rota_shifts')
          .select('id, profile_id, shift_date, start_time, end_time, break_minutes, net_hours')
          .eq('rota_id', rotaData.id);
        
        scheduledShifts = shiftsData || [];
      }
      
      // Fetch trial shift applications linked to these rota_shifts
      // This helps us determine if trial shifts should be paid
      const trialShiftMap = new Map<string, {
        trialPaymentTerms: string | null;
        trialPaymentRate: number | null;
        isTrialShift: boolean;
        shouldPayTrial: boolean;
      }>();
      
      if (scheduledShifts.length > 0) {
        const rotaShiftIds = scheduledShifts.map(s => s.id).filter(Boolean);
        
        if (rotaShiftIds.length > 0) {
          // Find applications that reference these rota_shifts as trial shifts
          // Batch queries to avoid Supabase's array size limits (max ~100 items per .in())
          let trialApplications: any[] = [];
          try {
            const batchSize = 50; // Safe batch size for Supabase
            for (let i = 0; i < rotaShiftIds.length; i += batchSize) {
              const batch = rotaShiftIds.slice(i, i + batchSize);
              const { data, error } = await supabase
                .from('applications')
                .select('trial_rota_shift_id, trial_payment_terms, trial_payment_rate, status')
                .in('trial_rota_shift_id', batch);
              
              if (error) {
                console.warn(`Error fetching trial applications batch ${i / batchSize + 1} (this is optional):`, error);
                // Continue with other batches
              } else if (data) {
                trialApplications = [...trialApplications, ...data];
              }
            }
          } catch (err) {
            console.warn('Exception fetching trial applications (this is optional):', err);
            // Continue without trial shift data - not critical for attendance sign-off
          }
          
          if (trialApplications && trialApplications.length > 0) {
            // Get profile IDs from rota shifts (since applications table doesn't have profile_id)
            const profileIdsToCheck = trialApplications
              .filter(app => app.trial_payment_terms === 'paid_if_hired' && app.trial_rota_shift_id)
              .map(app => {
                const shift = scheduledShifts.find(s => s.id === app.trial_rota_shift_id);
                return shift?.profile_id;
              })
              .filter((id): id is string => !!id) // Remove nulls and undefined
              .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates
            
            // Batch fetch profiles for onboarding check
            const profilesMap = new Map<string, any>();
            if (profileIdsToCheck.length > 0) {
              try {
                const { data: profiles, error: profilesError } = await supabase
                  .from('profiles')
                  .select('id, start_date, onboarding_complete, onboarding_status')
                  .in('id', profileIdsToCheck);
                
                if (profilesError) {
                  // If columns don't exist, try without onboarding fields
                  if (profilesError.code === 'PGRST116' || profilesError.message?.includes('column') || profilesError.message?.includes('does not exist')) {
                    const { data: basicProfiles } = await supabase
                      .from('profiles')
                      .select('id, start_date')
                      .in('id', profileIdsToCheck);
                    
                    if (basicProfiles) {
                      basicProfiles.forEach(profile => {
                        profilesMap.set(profile.id, profile);
                      });
                    }
                  } else {
                    console.error('Error fetching profiles for trial shift check:', profilesError);
                  }
                } else if (profiles) {
                  profiles.forEach(profile => {
                    profilesMap.set(profile.id, profile);
                  });
                }
              } catch (err) {
                console.error('Error checking onboarding status for trial shifts:', err);
              }
            }
            
            // For each trial application, check if it should be paid
            for (const app of trialApplications) {
              if (!app.trial_rota_shift_id) continue;
              
              const isTrialShift = true;
              let shouldPayTrial = false;
              
              // Check payment terms
              if (app.trial_payment_terms === 'paid') {
                // Always paid
                shouldPayTrial = true;
              } else if (app.trial_payment_terms === 'paid_if_hired') {
                // Only paid if hired and onboarding complete
                // Match by trial_rota_shift_id since profile_id doesn't exist
                // Find the rota shift to get the profile_id
                const rotaShift = scheduledShifts.find(s => s.id === app.trial_rota_shift_id);
                if (rotaShift && rotaShift.profile_id) {
                  const profile = profilesMap.get(rotaShift.profile_id);
                  
                  // Consider onboarding complete if:
                  // 1. onboarding_complete = true, OR
                  // 2. onboarding_status = 'complete' or 'completed', OR
                  // 3. start_date exists (they've started)
                  const onboardingComplete = profile && (
                    profile.onboarding_complete === true ||
                    profile.onboarding_status === 'complete' ||
                    profile.onboarding_status === 'completed' ||
                    (profile.start_date !== null && profile.start_date !== undefined)
                  );
                  
                  if (onboardingComplete) {
                    shouldPayTrial = true;
                  }
                }
              }
              
              trialShiftMap.set(app.trial_rota_shift_id, {
                trialPaymentTerms: app.trial_payment_terms,
                trialPaymentRate: app.trial_payment_rate,
                isTrialShift,
                shouldPayTrial
              });
            }
          }
        }
      }
      
      // Fetch attendance data for this site
      const { data: attendanceData } = await supabase
        .from('weekly_attendance_review')
        .select('*')
        .eq('site_id', selectedSiteId)
        .gte('work_date', startStr)
        .lte('work_date', endStr);
      
      // Get all staff IDs who have connection to this site:
      // 1. Employees with scheduled shifts for this site
      // 2. Employees with attendance records for this site
      // 3. Employees whose home_site (site_id) matches this site
      const staffIds = new Set<string>();
      
      // Add employees with scheduled shifts
      scheduledShifts.forEach(shift => {
        if (shift.profile_id) staffIds.add(shift.profile_id);
      });
      
      // Add employees with attendance records
      (attendanceData || []).forEach(record => {
        if (record.staff_id) staffIds.add(record.staff_id);
      });
      
      // Fetch employees - filter by:
      // 1. Company ID
      // 2. Either: home_site (site_id) matches selected site, OR they have shifts/attendance for this site
      let staffData: any[] = [];
      
      // Build the query - include employees whose home_site matches OR who have shifts/attendance
      let query = supabase
        .from('profiles')
        .select('id, full_name, position_title, hourly_rate, salary, contracted_hours_per_week, site_id')
        .eq('company_id', companyId);
      
      // Filter: home_site matches selected site OR they have shifts/attendance for this site
      if (staffIds.size > 0) {
        // Use OR filter: site_id matches selected site OR id is in staffIds
        query = query.or(`site_id.eq.${selectedSiteId},id.in.(${Array.from(staffIds).join(',')})`);
      } else {
        // If no shifts/attendance, only show employees whose home_site matches
        query = query.eq('site_id', selectedSiteId);
      }
      
      const { data, error } = await query.order('full_name');
      
      if (error) {
        console.error('Error fetching profiles with salary fields:', error);
        // Fallback to basic query if salary columns don't exist (400 error)
        if (error.code === 'PGRST116' || error.message?.includes('column') || error.message?.includes('does not exist')) {
          let fallbackQuery = supabase
            .from('profiles')
            .select('id, full_name, position_title, hourly_rate, site_id')
            .eq('company_id', companyId);
          
          if (staffIds.size > 0) {
            fallbackQuery = fallbackQuery.or(`site_id.eq.${selectedSiteId},id.in.(${Array.from(staffIds).join(',')})`);
          } else {
            fallbackQuery = fallbackQuery.eq('site_id', selectedSiteId);
          }
          
          const { data: basicData, error: basicError } = await fallbackQuery.order('full_name');
          if (basicError) {
            console.error('Error fetching profiles:', basicError);
            throw basicError;
          }
          staffData = basicData || [];
        } else {
          throw error;
        }
      } else {
        staffData = data || [];
      }
      
      // Check if week is locked (check both payroll_runs and staff_attendance.payroll_locked)
      // endStr is already calculated above from weekEnd
      
      // Check payroll_runs table
      const { data: payrollRun } = await supabase
        .from('payroll_runs')
        .select('id, status, pay_date')
        .eq('company_id', companyId)
        .eq('period_start_date', startStr)
        .eq('period_end_date', endStr)
        .maybeSingle();
      
      // Also check if any attendance records are locked
      const { data: lockedAttendance } = await supabase
        .from('staff_attendance')
        .select('id')
        .eq('site_id', selectedSiteId)
        .eq('company_id', companyId)
        .gte('clock_in_time', startStr)
        .lte('clock_in_time', endStr + 'T23:59:59')
        .eq('payroll_locked', true)
        .limit(1)
        .maybeSingle();
      
      // Week is locked if payroll run exists OR if attendance is locked
      setIsLocked(!!(payrollRun || lockedAttendance));
      
      // Set pay date if payroll run exists
      if (payrollRun?.pay_date) {
        setPayDate(new Date(payrollRun.pay_date));
      } else {
        setPayDate(null);
      }
      
      // Build employee rows
      const employeeMap = new Map<string, EmployeeRow>();
      
      // Initialize all employees
      (staffData || []).forEach(staff => {
        // Determine employment type: if salary exists and hourly_rate is null/0, they're salaried
        // Otherwise, if hourly_rate exists, they're hourly
        const hasSalary = staff.salary && staff.salary > 0;
        const hasHourlyRate = staff.hourly_rate && staff.hourly_rate > 0;
        const employmentType = hasSalary && !hasHourlyRate ? 'salaried' : (hasHourlyRate ? 'hourly' : null);
        
        employeeMap.set(staff.id, {
          staffId: staff.id,
          staffName: staff.full_name,
          positionTitle: staff.position_title,
          hourlyRate: staff.hourly_rate || null,
          employmentType: employmentType,
          salary: staff.salary || null,
          weeklyHours: staff.contracted_hours_per_week || null,
          days: {}
        });
      });
      
      // Create a map of scheduled shifts by employee and date
      const scheduledMap = new Map<string, { start: string; end: string; breakMinutes: number; netHours: number }>();
      scheduledShifts.forEach(shift => {
        if (shift.profile_id && shift.shift_date) {
          // Extract time from shift times (they might be in different formats)
          const extractTimeFromShift = (time: string | null) => {
            if (!time) return '';
            // If it's already in HH:MM format, return as is
            if (time.match(/^\d{2}:\d{2}$/)) return time;
            // If it's a timestamp, extract time
            if (time.includes('T')) {
              return time.split('T')[1].substring(0, 5);
            }
            // If it's just time without seconds, pad if needed
            if (time.match(/^\d{1,2}:\d{2}$/)) {
              const [h, m] = time.split(':');
              return `${h.padStart(2, '0')}:${m}`;
            }
            return time.substring(0, 5);
          };
          
          const key = `${shift.profile_id}_${shift.shift_date}`;
          scheduledMap.set(key, {
            start: extractTimeFromShift(shift.start_time) || '',
            end: extractTimeFromShift(shift.end_time) || '',
            breakMinutes: shift.break_minutes || 0,
            netHours: shift.net_hours || null
          });
        }
      });
      
      // Fetch sign-off status from attendance_signoffs table
      // This is the source of truth for signoff state
      const { data: signOffData, error: signOffError } = await supabase
        .from('attendance_signoffs')
        .select('staff_id, shift_date, signed_off, signed_off_at')
        .eq('site_id', selectedSiteId)
        .gte('shift_date', startStr)
        .lte('shift_date', endStr);
      
      if (signOffError) {
        console.error('Error fetching signoff data:', signOffError);
        // Don't throw - continue without signoff data
      } else {
        console.log(`[SIGNOFF] Loaded ${signOffData?.length || 0} signoff records for week ${startStr} to ${endStr}`);
      }
      
      // Create a map of sign-off status by staff_id and date
      const signOffMap = new Map<string, boolean>();
      (signOffData || []).forEach(signOff => {
        if (signOff.staff_id && signOff.shift_date) {
          const key = `${signOff.staff_id}_${signOff.shift_date}`;
          // Explicitly check for true - don't rely on truthy values
          const isSignedOff = signOff.signed_off === true;
          signOffMap.set(key, isSignedOff);
          if (isSignedOff) {
            console.log(`[SIGNOFF] Found signed off: ${key}`);
          }
        }
      });
      
      console.log(`[SIGNOFF] Map contains ${signOffMap.size} entries, ${Array.from(signOffMap.values()).filter(v => v === true).length} are signed off`);
      
      // Populate with attendance data and scheduled shifts
      (attendanceData || []).forEach((record: any) => {
        const employee = employeeMap.get(record.staff_id);
        if (employee) {
          // Extract time from timestamps
          const extractTime = (timestamp: string | null) => {
            if (!timestamp) return null;
            if (timestamp.includes('T')) {
              return timestamp.split('T')[1].substring(0, 5); // HH:MM
            }
            return timestamp.substring(0, 5);
          };
          
          // Get scheduled times from rota
          const scheduledKey = `${record.staff_id}_${record.work_date}`;
          const scheduled = scheduledMap.get(scheduledKey);
          
          // Get sign-off status from signOffMap (source of truth) or fall back to record.signed_off
          const signOffKey = `${record.staff_id}_${record.work_date}`;
          // Always prefer signOffMap as it's from attendance_signoffs table
          const signedOff = signOffMap.has(signOffKey) 
            ? (signOffMap.get(signOffKey) === true) 
            : (record.signed_off === true);
          
          // Check if this is a trial shift and if it should be paid
          const scheduledShiftId = scheduledShifts.find(s => 
            s.profile_id === record.staff_id && 
            s.shift_date === record.work_date
          )?.id || null;
          
          const trialInfo = scheduledShiftId ? trialShiftMap.get(scheduledShiftId) : null;
          
          employee.days[record.work_date] = {
            scheduledStart: scheduled?.start || extractTime(record.scheduled_start) || null,
            scheduledEnd: scheduled?.end || extractTime(record.scheduled_end) || null,
            scheduledBreakMinutes: scheduled?.breakMinutes || null,
            scheduledNetHours: scheduled?.netHours || (record.scheduled_hours || null),
            scheduledShiftId: scheduledShiftId,
            clockIn: extractTime(record.actual_clock_in) || null,
            clockOut: extractTime(record.actual_clock_out) || null,
            actualHours: record.actual_hours || null, // Use total_hours from attendance (already has breaks subtracted)
            attendanceId: record.attendance_id || null,
            signedOff: signedOff || false,
            isTrialShift: trialInfo?.isTrialShift || false,
            shouldPayTrial: trialInfo?.shouldPayTrial || false,
            trialPaymentRate: trialInfo?.trialPaymentRate || null
          };
        }
      });
      
      // Also populate scheduled shifts for employees who don't have attendance records yet
      scheduledShifts.forEach(shift => {
        if (shift.profile_id && shift.shift_date) {
          const employee = employeeMap.get(shift.profile_id);
          if (employee && !employee.days[shift.shift_date]) {
            // Check if there's a sign-off for this shift (from attendance_signoffs table)
            const signOffKey = `${shift.profile_id}_${shift.shift_date}`;
            const signedOff = signOffMap.has(signOffKey) ? (signOffMap.get(signOffKey) === true) : false;
            
            // Extract time from shift times (they might be in different formats)
            const extractTimeFromShift = (time: string | null) => {
              if (!time) return null;
              // If it's already in HH:MM format, return as is
              if (time.match(/^\d{2}:\d{2}$/)) return time;
              // If it's a timestamp, extract time
              if (time.includes('T')) {
                return time.split('T')[1].substring(0, 5);
              }
              // If it's just time without seconds, pad if needed
              if (time.match(/^\d{1,2}:\d{2}$/)) {
                const [h, m] = time.split(':');
                return `${h.padStart(2, '0')}:${m}`;
              }
              return time.substring(0, 5);
            };
            
            employee.days[shift.shift_date] = {
              scheduledStart: extractTimeFromShift(shift.start_time) || null,
              scheduledEnd: extractTimeFromShift(shift.end_time) || null,
              scheduledBreakMinutes: shift.break_minutes || null,
              scheduledNetHours: shift.net_hours || null,
              clockIn: null,
              clockOut: null,
              attendanceId: null,
              signedOff: signedOff || false
            };
          } else if (employee && employee.days[shift.shift_date]) {
            // Update scheduled times if they exist but are empty
            const extractTimeFromShift = (time: string | null) => {
              if (!time) return null;
              if (time.match(/^\d{2}:\d{2}$/)) return time;
              if (time.includes('T')) {
                return time.split('T')[1].substring(0, 5);
              }
              if (time.match(/^\d{1,2}:\d{2}$/)) {
                const [h, m] = time.split(':');
                return `${h.padStart(2, '0')}:${m}`;
              }
              return time.substring(0, 5);
            };
            
            if (!employee.days[shift.shift_date].scheduledStart) {
              employee.days[shift.shift_date].scheduledStart = extractTimeFromShift(shift.start_time) || null;
            }
            if (!employee.days[shift.shift_date].scheduledEnd) {
              employee.days[shift.shift_date].scheduledEnd = extractTimeFromShift(shift.end_time) || null;
            }
            // Also update sign-off status if it exists in signOffMap (source of truth)
            const signOffKey = `${shift.profile_id}_${shift.shift_date}`;
            if (signOffMap.has(signOffKey)) {
              employee.days[shift.shift_date].signedOff = signOffMap.get(signOffKey) === true;
            }
          }
        }
      });
      
      // Initialize missing days (calculate dates here to avoid dependency on weekDates)
      employeeMap.forEach(employee => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        for (let i = 0; i < 7; i++) {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          if (!employee.days[dateStr]) {
            // Check if there's a sign-off for this day even if no work
            const signOffKey = `${employee.staffId}_${dateStr}`;
            const signedOff = signOffMap.has(signOffKey) ? signOffMap.get(signOffKey) : false;
            
            employee.days[dateStr] = {
              scheduledStart: null,
              scheduledEnd: null,
              scheduledBreakMinutes: null,
              scheduledNetHours: null,
              scheduledShiftId: null,
              clockIn: null,
              clockOut: null,
              actualHours: null,
              attendanceId: null,
              signedOff: signedOff || false,
              isTrialShift: false,
              shouldPayTrial: false,
              trialPaymentRate: null
            };
          } else {
            // Ensure signoff status is loaded even if day already exists (from attendance_signoffs table)
            const signOffKey = `${employee.staffId}_${dateStr}`;
            if (signOffMap.has(signOffKey)) {
              employee.days[dateStr].signedOff = signOffMap.get(signOffKey) === true;
            }
          }
        }
      });
      
      setEmployees(Array.from(employeeMap.values()));
      
      // Update last loaded ref after successful load
      lastLoadedRef.current = { siteId: selectedSiteId, weekStart: weekStartStr, companyId };
      
    } catch (err: any) {
      console.error('Error loading attendance:', err);
      setError(err.message);
      // Clear lastLoadedRef on error so we can retry
      lastLoadedRef.current = null;
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [selectedSiteId, weekStartStr, companyId]);

  useEffect(() => {
    // Don't run if dependencies aren't ready
    if (!selectedSiteId || !companyId) {
      return;
    }
    // Don't run if already loading
    if (isLoadingRef.current) {
      return;
    }
    
    // Check if we've already loaded this exact combination
    const currentState = { siteId: selectedSiteId, weekStart: weekStartStr, companyId };
    const lastLoaded = lastLoadedRef.current;
    if (lastLoaded && 
        lastLoaded.siteId === currentState.siteId && 
        lastLoaded.weekStart === currentState.weekStart && 
        lastLoaded.companyId === currentState.companyId) {
      return; // Already loaded
    }
    
    // Load the data
    loadWeekData();
     
  }, [selectedSiteId, weekStartStr, companyId]);

  // Format time for display
  function formatTime(time: string | null): string {
    if (!time) return '';
    if (time.includes('T')) {
      return new Date(time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    return time.substring(0, 5);
  }

  // Update time field (local state only, no auto-save)
  function updateTime(staffId: string, date: string, field: 'scheduledStart' | 'scheduledEnd' | 'clockIn' | 'clockOut', value: string) {
    // Keep value as-is while typing - don't normalize to null yet
    // This prevents the input from resetting while user is typing
    const normalizedValue = value === '' ? null : value;
    
    // Use functional update with batching to prevent multiple re-renders
    setEmployees(prev => {
      // Check if the value actually changed to avoid unnecessary updates
      const currentEmp = prev.find(e => e.staffId === staffId);
      if (currentEmp?.days[date]?.[field] === normalizedValue) {
        return prev; // No change, return same reference
      }
      
      const updated = prev.map(emp => {
        if (emp.staffId === staffId && emp.days[date]) {
          return {
            ...emp,
            days: {
              ...emp.days,
              [date]: {
                ...emp.days[date],
                [field]: normalizedValue
              }
            }
          };
        }
        return emp;
      });
      
      // Update ref immediately with the new state
      employeesRef.current = updated;
      
      return updated;
    });
  }

  // Save time changes (called on blur - saves immediately)
  async function saveTimeChanges(staffId: string, date: string) {
    // Get current state from ref to ensure we have latest values
    const employee = employeesRef.current.find(e => e.staffId === staffId);
    if (!employee || !employee.days[date]) return;
    
    const dayData = employee.days[date];
    
    // Perform save
    await performSave(staffId, date, dayData);
  }
  
  // Actual save function
  async function performSave(staffId: string, date: string, dayData: { scheduledStart: string | null; scheduledEnd: string | null; clockIn: string | null; clockOut: string | null; attendanceId: string | null }) {
    
    try {
      // Save scheduled times to rota_shifts if they exist
      if (dayData.scheduledStart || dayData.scheduledEnd) {
        // Find the rota for this site and week
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const startStr = weekStartStr;
        
        const { data: rotaData } = await supabase
          .from('rotas')
          .select('id')
          .eq('site_id', selectedSiteId)
          .eq('week_starting', startStr)
          .maybeSingle();
        
        if (rotaData) {
          // Check if shift already exists
          const { data: existingShift } = await supabase
            .from('rota_shifts')
            .select('id')
            .eq('rota_id', rotaData.id)
            .eq('profile_id', staffId)
            .eq('shift_date', date)
            .maybeSingle();
          
          if (existingShift) {
            // Update existing shift
            await supabase
              .from('rota_shifts')
              .update({
                start_time: dayData.scheduledStart || null,
                end_time: dayData.scheduledEnd || null
              })
              .eq('id', existingShift.id);
          } else if (dayData.scheduledStart && dayData.scheduledEnd) {
            // Calculate net hours
            const [startH, startM] = dayData.scheduledStart.split(':').map(Number);
            const [endH, endM] = dayData.scheduledEnd.split(':').map(Number);
            const startMins = startH * 60 + startM;
            let endMins = endH * 60 + endM;
            if (endMins <= startMins) endMins += 24 * 60; // Handle overnight shifts
            const breakMinutes = 0; // Default to no break
            const netHours = (endMins - startMins - breakMinutes) / 60;
            
            // Get employee hourly rate for cost calculation
            const employee = employeesRef.current.find(e => e.staffId === staffId);
            const hourlyRate = employee ? 0 : 0; // We don't have hourly_rate in EmployeeRow, default to 0
            const estimatedCost = Math.round(netHours * hourlyRate);
            
            // Create new shift with all required fields
            // Note: rota_shifts doesn't have site_id column - it gets site_id through rota_id
            // Note: net_hours is a generated column - don't include it in insert
            const { error: shiftError } = await supabase
              .from('rota_shifts')
              .insert({
                rota_id: rotaData.id,
                profile_id: staffId,
                shift_date: date,
                start_time: dayData.scheduledStart,
                end_time: dayData.scheduledEnd,
                break_minutes: breakMinutes,
                estimated_cost: estimatedCost,
                company_id: companyId,
                color: '#EC4899', // Default color
                status: 'scheduled'
              });
            
            if (shiftError) {
              console.error('Error creating rota shift:', shiftError);
              // Don't throw - scheduled times are optional, but log the error
            }
          }
        }
      }
      
      // If we have clock in/out times, create or update attendance record
      if (dayData.clockIn && dayData.clockOut) {
        // Use calculateHoursBetween helper to properly handle overnight shifts (e.g., 18:00 to 00:00)
        const totalHours = calculateHoursBetween(dayData.clockIn, dayData.clockOut, 0);
        
        // If calculation failed, skip saving
        if (totalHours === null || totalHours < 0) {
          console.warn('Invalid hours calculation, skipping save:', { clockIn: dayData.clockIn, clockOut: dayData.clockOut });
          return;
        }
        
        // Create proper ISO timestamps for database
        // Handle overnight shifts where clock out is before clock in (e.g., 18:00 to 00:00)
        const [inH, inM] = dayData.clockIn.split(':').map(Number);
        const [outH, outM] = dayData.clockOut.split(':').map(Number);
        const inMins = inH * 60 + inM;
        const outMins = outH * 60 + outM;
        
        // Create clock in time (always on the date provided)
        const clockInTime = `${date}T${dayData.clockIn}:00`;
        
        // Determine clock out time - if clock out is before or equal to clock in, it's the next day
        let clockOutTime: string;
        if (outMins <= inMins) {
          // Overnight shift: clock out is on the next day
          // Parse date string and add one day
          const dateParts = date.split('-').map(Number);
          const clockOutDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2] + 1));
          const clockOutDateStr = clockOutDate.toISOString().split('T')[0];
          clockOutTime = `${clockOutDateStr}T${dayData.clockOut}:00`;
        } else {
          // Same-day shift: clock out is on the same date
          clockOutTime = `${date}T${dayData.clockOut}:00`;
        }
        
        // Validate that clock out is after clock in (satisfies database constraint)
        const clockInDate = new Date(clockInTime);
        const clockOutDate = new Date(clockOutTime);
        if (clockOutDate <= clockInDate) {
          console.error('Invalid time range: clock out must be after clock in', {
            clockInTime,
            clockOutTime,
            clockInDate: clockInDate.toISOString(),
            clockOutDate: clockOutDate.toISOString()
          });
          throw new Error('Clock out time must be after clock in time');
        }
        
        if (dayData.attendanceId) {
          // Update existing
          const { error } = await supabase
            .from('staff_attendance')
            .update({
              clock_in_time: clockInTime,
              clock_out_time: clockOutTime,
              total_hours: totalHours,
              manually_adjusted: true
            })
            .eq('id', dayData.attendanceId);
          
          if (error) throw error;
        } else {
          // Create new
          const { data: newRecord, error } = await supabase
            .from('staff_attendance')
            .insert({
              user_id: staffId,
              company_id: companyId,
              site_id: selectedSiteId,
              clock_in_time: clockInTime,
              clock_out_time: clockOutTime,
              total_hours: totalHours,
              shift_status: 'off_shift',
              manually_adjusted: true
            })
            .select('id')
            .single();
          
          if (error) throw error;
          
          if (newRecord) {
            // Update local state with new attendance ID (don't reload)
            setEmployees(prev => prev.map(emp => {
              if (emp.staffId === staffId) {
                return {
                  ...emp,
                  days: {
                    ...emp.days,
                    [date]: {
                      ...emp.days[date],
                      attendanceId: newRecord.id
                    }
                  }
                };
              }
              return emp;
            }));
          }
        }
      }
      
      // Don't reload - we've already updated local state
      // This prevents input fields from resetting while user is typing
      
    } catch (err: any) {
      console.error('Error saving time:', err);
      setError(err.message);
      // Don't reload on error - it would reset all the inputs
      // Just show the error and let user retry
    }
  }

  // Sign off individual employee for a day
  async function handleEmployeeSignOff(staffId: string, date: string, signedOff: boolean) {
    const employee = employees.find(e => e.staffId === staffId);
    if (!employee || !employee.days[date]) return;
    
    const dayData = employee.days[date];
    
    if (!companyId || !userId) return;
    
    // Calculate hours using direct time parsing to avoid timezone issues
    let hours = 0;
    if (dayData.clockIn && dayData.clockOut) {
      try {
        const [startHours, startMinutes] = dayData.clockIn.split(':').map(Number);
        const [endHours, endMinutes] = dayData.clockOut.split(':').map(Number);
        if (!isNaN(startHours) && !isNaN(startMinutes) && !isNaN(endHours) && !isNaN(endMinutes)) {
          let startTotalMinutes = startHours * 60 + startMinutes;
          let endTotalMinutes = endHours * 60 + endMinutes;
          if (endTotalMinutes < startTotalMinutes) {
            endTotalMinutes += 24 * 60; // Overnight shift
          }
          hours = (endTotalMinutes - startTotalMinutes) / 60;
        }
      } catch (err) {
        console.warn('Error calculating hours for sign-off:', err);
      }
    } else if (dayData.scheduledStart && dayData.scheduledEnd) {
      try {
        const [startHours, startMinutes] = dayData.scheduledStart.split(':').map(Number);
        const [endHours, endMinutes] = dayData.scheduledEnd.split(':').map(Number);
        if (!isNaN(startHours) && !isNaN(startMinutes) && !isNaN(endHours) && !isNaN(endMinutes)) {
          let startTotalMinutes = startHours * 60 + startMinutes;
          let endTotalMinutes = endHours * 60 + endMinutes;
          if (endTotalMinutes < startTotalMinutes) {
            endTotalMinutes += 24 * 60; // Overnight shift
          }
          const grossHours = (endTotalMinutes - startTotalMinutes) / 60;
          const breakHours = (dayData.scheduledBreakMinutes || 0) / 60;
          hours = grossHours - breakHours;
        }
      } catch (err) {
        console.warn('Error calculating hours for sign-off:', err);
      }
    }
    
    try {
      // Create/update signoff
      await supabase
        .from('attendance_signoffs')
        .upsert({
          company_id: companyId,
          site_id: selectedSiteId,
          staff_id: staffId,
          shift_date: date,
          scheduled_hours: dayData.scheduledStart && dayData.scheduledEnd ? hours : null,
          actual_hours: dayData.clockIn && dayData.clockOut ? hours : null,
          approved_hours: signedOff ? hours : 0,
          signed_off: signedOff,
          signed_off_by: signedOff ? userId : null,
          signed_off_at: signedOff ? new Date().toISOString() : null
        }, {
          onConflict: 'company_id,site_id,staff_id,shift_date'
        });
      
      // Update attendance record if exists
      if (dayData.attendanceId) {
        await supabase
          .from('staff_attendance')
          .update({
            signed_off: signedOff,
            signed_off_by: signedOff ? userId : null,
            signed_off_at: signedOff ? new Date().toISOString() : null
          })
          .eq('id', dayData.attendanceId);
      }
      
      // Update local state only - don't reload to prevent resetting time inputs
      setEmployees(prev => prev.map(emp => {
        if (emp.staffId === staffId && emp.days[date]) {
          return {
            ...emp,
            days: {
              ...emp.days,
              [date]: {
                ...emp.days[date],
                signedOff: signedOff
              }
            }
          };
        }
        return emp;
      }));
      
      // Also update the ref
      employeesRef.current = employeesRef.current.map(emp => {
        if (emp.staffId === staffId && emp.days[date]) {
          return {
            ...emp,
            days: {
              ...emp.days,
              [date]: {
                ...emp.days[date],
                signedOff: signedOff
              }
            }
          };
        }
        return emp;
      });
    } catch (err: any) {
      console.error('Error signing off employee:', err);
      setError(err.message);
    }
  }

  // Day-level sign off - signs off all employees for a specific day
  // This is the primary sign-off mechanism - users check hours and sign off the entire day
  async function handleDaySignOff(date: string, signedOff: boolean) {
    if (!companyId || !userId || !canApprove || isLocked) return;
    
    // Always use the latest employees state from ref
    const currentEmployees = employeesRef.current.length > 0 ? employeesRef.current : employees;
    
    // Get all employees with data for this day (including those with no work scheduled)
    const employeesForDay = currentEmployees.filter(emp => {
      return emp && emp.days && emp.days[date] !== undefined && emp.days[date] !== null;
    });
    
    // Allow signing off even if no employees have work - this is a day-level action
    // Get employees with actual work
    const employeesWithWork = employeesForDay.filter(emp => {
      const dayData = emp.days[date];
      return dayData && (dayData.clockIn || dayData.scheduledStart);
    });
    
    // If no employees have work, we can still sign off the day by updating all employees
    // This allows managers to mark days as "reviewed" even if no one worked
    const employeesToSignOff = employeesWithWork.length > 0 ? employeesWithWork : employeesForDay;
    
    if (employeesToSignOff.length === 0) {
      // No employees at all for this day - can't sign off
      return;
    }
    
    try {
      // Sign off each employee for this day - including those without work
      const signOffPromises = employeesToSignOff.map(async (employee) => {
        const dayData = employee.days[date];
        
        // Calculate hours using direct time parsing to avoid timezone issues
        let hours = 0;
        if (dayData.clockIn && dayData.clockOut) {
          try {
            const [startHours, startMinutes] = dayData.clockIn.split(':').map(Number);
            const [endHours, endMinutes] = dayData.clockOut.split(':').map(Number);
            if (!isNaN(startHours) && !isNaN(startMinutes) && !isNaN(endHours) && !isNaN(endMinutes)) {
              let startTotalMinutes = startHours * 60 + startMinutes;
              let endTotalMinutes = endHours * 60 + endMinutes;
              if (endTotalMinutes < startTotalMinutes) {
                endTotalMinutes += 24 * 60; // Overnight shift
              }
              hours = (endTotalMinutes - startTotalMinutes) / 60;
            }
          } catch (err) {
            console.warn('Error calculating hours for day sign-off:', err);
          }
        } else if (dayData.scheduledStart && dayData.scheduledEnd) {
          try {
            const [startHours, startMinutes] = dayData.scheduledStart.split(':').map(Number);
            const [endHours, endMinutes] = dayData.scheduledEnd.split(':').map(Number);
            if (!isNaN(startHours) && !isNaN(startMinutes) && !isNaN(endHours) && !isNaN(endMinutes)) {
              let startTotalMinutes = startHours * 60 + startMinutes;
              let endTotalMinutes = endHours * 60 + endMinutes;
              if (endTotalMinutes < startTotalMinutes) {
                endTotalMinutes += 24 * 60; // Overnight shift
              }
              const grossHours = (endTotalMinutes - startTotalMinutes) / 60;
              const breakHours = (dayData.scheduledBreakMinutes || 0) / 60;
              hours = grossHours - breakHours;
            }
          } catch (err) {
            console.warn('Error calculating hours for day sign-off:', err);
          }
        }
        
        // Always create/update signoff record - even if no hours worked
        // This ensures the signoff state is persisted for all employees
        const { error: signoffError } = await supabase
          .from('attendance_signoffs')
          .upsert({
            company_id: companyId,
            site_id: selectedSiteId,
            staff_id: employee.staffId,
            shift_date: date,
            scheduled_hours: dayData.scheduledStart && dayData.scheduledEnd ? hours : null,
            actual_hours: dayData.clockIn && dayData.clockOut ? hours : null,
            approved_hours: signedOff ? hours : 0,
            signed_off: signedOff,
            signed_off_by: signedOff ? userId : null,
            signed_off_at: signedOff ? new Date().toISOString() : null
          }, {
            onConflict: 'company_id,site_id,staff_id,shift_date'
          });
        
        if (signoffError) {
          console.error(`Error saving signoff for ${employee.name} on ${date}:`, signoffError);
          throw signoffError;
        } else {
          console.log(`Successfully saved signoff for ${employee.name} on ${date}: ${signedOff}`);
        }
        
        // Update attendance record if exists
        if (dayData.attendanceId) {
          const { error: attendanceError } = await supabase
            .from('staff_attendance')
            .update({
              signed_off: signedOff,
              signed_off_by: signedOff ? userId : null,
              signed_off_at: signedOff ? new Date().toISOString() : null
            })
            .eq('id', dayData.attendanceId);
          
          if (attendanceError) {
            console.error(`Error updating attendance record for ${employee.name} on ${date}:`, attendanceError);
            // Don't throw - attendance update is secondary
          }
        }
      });
      
      await Promise.all(signOffPromises);
      
      // Update local state for all employees - ONLY for the specific date
      setEmployees(prev => {
        const updated = prev.map(emp => {
          // Check if employee has data for this day
          if (emp && emp.days && emp.days[date] !== undefined && emp.days[date] !== null) {
            const currentDayData = emp.days[date];
            // Update sign-off status for all employees for this day (regardless of work)
            const updatedDay = {
              ...currentDayData,
              signedOff: signedOff === true // Explicitly set to boolean
            };
            console.log(`[SIGNOFF] Updating local state for ${emp.staffName} on ${date}: signedOff = ${updatedDay.signedOff}`);
            return {
              ...emp,
              days: {
                ...emp.days,
                [date]: updatedDay
              }
            };
          }
          return emp;
        });
        
        // Update the ref immediately with the new state
        employeesRef.current = updated;
        
        return updated;
      });
      
      // Show success message
      toast.success(signedOff ? 'Day signed off successfully' : 'Day sign-off removed');
      
      // Verify the state was saved to database after a short delay
      setTimeout(async () => {
        const { data: verifyData } = await supabase
          .from('attendance_signoffs')
          .select('staff_id, shift_date, signed_off')
          .eq('site_id', selectedSiteId)
          .eq('shift_date', date);
        
        console.log(`[SIGNOFF] Verification: Found ${verifyData?.length || 0} signoff records for ${date}`);
        verifyData?.forEach(record => {
          console.log(`[SIGNOFF]   - Staff ${record.staff_id}: signed_off = ${record.signed_off}`);
        });
      }, 500);
    } catch (err: any) {
      console.error('Error signing off day:', err);
      setError(err.message);
      toast.error('Failed to save sign-off status. Please try again.');
    }
  }

  // Lock week and automatically create payroll run
  async function handleLockWeek() {
    if (!companyId || !userId || !selectedSiteId || !allSignedOff || isLocked || locking) {
      return;
    }

    setLocking(true);
    setError(null);

    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      // Lock all attendance records for this week
      const { error: lockError } = await supabase
        .from('staff_attendance')
        .update({ 
          payroll_locked: true,
          signed_off: true,
          signed_off_by: userId,
          signed_off_at: new Date().toISOString()
        })
        .eq('site_id', selectedSiteId)
        .eq('company_id', companyId)
        .gte('clock_in_time', weekStartStr)
        .lte('clock_in_time', weekEndStr + 'T23:59:59');

      if (lockError) throw lockError;

      // Create payroll run from signoff
      const { data: payrollRunId, error: payrollError } = await supabase.rpc(
        'create_payroll_run_from_signoff',
        {
          p_company_id: companyId,
          p_site_id: selectedSiteId,
          p_week_start_date: weekStartStr,
          p_week_end_date: weekEndStr,
          p_created_by: userId
        }
      );

      if (payrollError) {
        console.error('Error creating payroll run:', payrollError);
        console.error('Error details:', {
          message: payrollError.message,
          details: payrollError.details,
          hint: payrollError.hint,
          code: payrollError.code,
          fullError: JSON.stringify(payrollError, null, 2)
        });
        // Still mark as locked even if payroll creation fails
        const errorMsg = payrollError.message || payrollError.details || payrollError.hint || JSON.stringify(payrollError) || 'Unknown error';
        toast.error(`Week locked but payroll run creation failed: ${errorMsg}`);
      } else if (payrollRunId) {
        toast.success('Week locked and payroll run created successfully');
      } else {
        console.warn('Payroll run creation returned no error but also no ID');
        toast.warning('Week locked but payroll run may not have been created. Please check.');
      }

      setIsLocked(true);
      
      // Get the pay date from the created payroll run
      if (payrollRunId) {
        const { data: createdRun } = await supabase
          .from('payroll_runs')
          .select('pay_date')
          .eq('id', payrollRunId)
          .single();
        
        if (createdRun?.pay_date) {
          setPayDate(new Date(createdRun.pay_date));
        }
      }
      
      // Don't reload - just update the locked status in state
      // The signoff states are already saved and should persist
      // We'll preserve all current signoff states
    } catch (err: any) {
      console.error('Error locking week:', err);
      setError(err.message);
      toast.error('Failed to lock week: ' + (err.message || 'Unknown error'));
    } finally {
      setLocking(false);
    }
  }

  // Unlock week (only if pay date hasn't passed)
  async function handleUnlockWeek() {
    if (!companyId || !userId || !selectedSiteId || !isLocked) {
      return;
    }

    // Check if pay date has passed (compare dates only, not times)
    if (payDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const payDateOnly = new Date(payDate);
      payDateOnly.setHours(0, 0, 0, 0);
      
      if (payDateOnly < today) {
        toast.error('Cannot unlock week - pay date has already passed');
        return;
      }
    }

    setUnlocking(true);
    setError(null);

    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      // Unlock all attendance records for this week
      const { error: unlockError } = await supabase
        .from('staff_attendance')
        .update({ 
          payroll_locked: false
        })
        .eq('site_id', selectedSiteId)
        .eq('company_id', companyId)
        .gte('clock_in_time', weekStartStr)
        .lte('clock_in_time', weekEndStr + 'T23:59:59');

      if (unlockError) throw unlockError;

      // Delete the payroll run if it exists (since we're unlocking)
      const { data: payrollRun } = await supabase
        .from('payroll_runs')
        .select('id')
        .eq('company_id', companyId)
        .eq('period_start_date', weekStartStr)
        .eq('period_end_date', weekEndStr)
        .maybeSingle();

      if (payrollRun?.id) {
        const { error: deleteError } = await supabase
          .from('payroll_runs')
          .delete()
          .eq('id', payrollRun.id);

        if (deleteError) {
          console.warn('Error deleting payroll run:', deleteError);
          // Don't throw - unlocking attendance is more important
        }
      }

      setIsLocked(false);
      setPayDate(null);
      
      toast.success('Week unlocked successfully');
      
      // Reload data to reflect unlocked state
      await loadWeekData();
    } catch (err: any) {
      console.error('Error unlocking week:', err);
      setError(err.message);
      toast.error('Failed to unlock week: ' + (err.message || 'Unknown error'));
    } finally {
      setUnlocking(false);
    }
  }

  // Check if all employees are signed off for a specific day
  // This function checks ONLY the specific date passed to it
  // Use useMemo to pre-calculate status for all days in the week
  const daySignOffStatus = useMemo(() => {
    const statusMap: Record<string, boolean> = {};
    
    // Always use the latest employees state from ref
    const currentEmployees = employeesRef.current.length > 0 ? employeesRef.current : employees;
    
    weekDates.forEach(({ date }) => {
      // Filter to only employees that have data for THIS specific date
      const employeesForDay = currentEmployees.filter(emp => {
        return emp.days && emp.days[date] !== undefined && emp.days[date] !== null;
      });
      
      if (employeesForDay.length === 0) {
        statusMap[date] = false;
        return;
      }
      
      // Check if ALL employees for THIS specific date are signed off
      // Only consider employees who have actual work (clock in/out or scheduled times)
      const employeesWithWork = employeesForDay.filter(emp => {
        const dayData = emp.days[date];
        return dayData && (dayData.clockIn || dayData.scheduledStart);
      });
      
      // If no employees have work, the day is not signed off (default to false)
      if (employeesWithWork.length === 0) {
        statusMap[date] = false;
        return;
      }
      
      // Check if ALL employees with work are signed off
      statusMap[date] = employeesWithWork.every(emp => {
        const dayData = emp.days[date];
        return dayData && dayData.signedOff === true;
      });
    });
    
    return statusMap;
  }, [employees, weekDates]);
  
  // Function to check if a specific day is fully signed off
  // Always reads from employeesRef to get the latest state
  function isDayFullySignedOff(date: string): boolean {
    // Always use the latest employees state from ref
    const currentEmployees = employeesRef.current.length > 0 ? employeesRef.current : employees;
    
    // Filter to only employees that have data for THIS specific date
    const employeesForDay = currentEmployees.filter(emp => {
      return emp.days && emp.days[date] !== undefined && emp.days[date] !== null;
    });
    
    if (employeesForDay.length === 0) return false;
    
    // Only consider employees who have actual work (clock in/out or scheduled times)
    const employeesWithWork = employeesForDay.filter(emp => {
      const dayData = emp.days[date];
      return dayData && (dayData.clockIn || dayData.scheduledStart);
    });
    
    // If no employees have work, the day is not signed off
    if (employeesWithWork.length === 0) return false;
    
    // Check if ALL employees with work are signed off
    return employeesWithWork.every(emp => {
      const dayData = emp.days[date];
      return dayData && dayData.signedOff === true;
    });
  }

  // Check if all rows are signed off
  const allSignedOff = useMemo(() => {
    if (employees.length === 0) return false;
    return employees.every(emp => 
      weekDates.every(({ date }) => {
        const day = emp.days[date];
        // Only check days that have actual or scheduled times
        if (!day || (!day.clockIn && !day.scheduledStart)) return true; // Skip empty days
        return day.signedOff;
      })
    );
  }, [employees, weekDates]);

  const canApprove = profile?.app_role && ['admin', 'owner', 'manager'].includes(profile.app_role.toLowerCase());

  function goToPrevWeek() {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() - 7);
    setWeekStart(newStart);
  }
  
  function goToNextWeek() {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + 7);
    setWeekStart(newStart);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0D13] p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Timesheets</h1>
            <p className="text-gray-500 dark:text-white/60 text-sm mt-1">
              Review and approve staff hours before payroll
            </p>
          </div>
          
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            disabled={sites.length === 0 || loading}
            className="bg-white dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px] text-gray-900 dark:text-white"
          >
            {sites.length === 0 ? (
              <option value="">No sites available</option>
            ) : (
              sites.map(site => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))
            )}
          </select>
        </div>
        
        {/* Week Navigation */}
        <div className="flex items-center justify-between bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4 mb-6 shadow-sm dark:shadow-none">
          <button
            onClick={goToPrevWeek}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded-lg transition-colors text-gray-600 dark:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-gray-900 dark:text-white">
              {weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' - '}
              {new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>

            {isLocked && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                  <Lock className="w-3 h-3" />
                  Submitted to Payroll
                </span>
                {payDate && (
                  <span className="text-xs text-gray-500 dark:text-white/60">
                    Pay Date: {payDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-white/[0.05] rounded-lg p-1">
              <button
                onClick={() => setViewMode('daily')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'daily'
                    ? 'bg-white dark:bg-blue-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                <LayoutList className="w-4 h-4" />
                Daily
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'weekly'
                    ? 'bg-white dark:bg-blue-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                By Employee
              </button>
            </div>

            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded-lg transition-colors text-gray-600 dark:text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-500 dark:text-white/60 mt-3">Loading attendance data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Weekly Employee View */}
        {!loading && employees.length > 0 && viewMode === 'weekly' && (
          <WeeklyEmployeeView
            employees={employees}
            weekDates={weekDates}
            isLocked={isLocked}
          />
        )}

        {/* Days stacked vertically (Daily View) */}
        {!loading && employees.length > 0 && viewMode === 'daily' && (
          <div className="space-y-6">
            {weekDates.map(({ date, dayName }) => (
              <div key={date} className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden shadow-sm dark:shadow-none">
                {/* Day Header */}
                <div className="bg-gray-50 dark:bg-white/[0.05] px-4 py-3 border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {dayName} - {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                  </h3>
                  
                  {/* Day Sign Off Button - Simple day-level sign-off */}
                  {canApprove && (() => {
                    // Get all employees that have data for this day
                    const employeesForDay = employees.filter(emp => {
                      return emp && emp.days && emp.days[date] !== undefined && emp.days[date] !== null;
                    });
                    
                    // If no employees for this day, button is not applicable
                    if (employeesForDay.length === 0) return null;
                    
                    // Check if ALL employees for this day are signed off (regardless of whether they have work)
                    const daySignedOff = employeesForDay.every(emp => {
                      const dayData = emp.days[date];
                      return dayData && dayData.signedOff === true;
                    });
                    
                    return (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isLocked) {
                            handleDaySignOff(date, !daySignedOff);
                          }
                        }}
                        disabled={!canApprove || isLocked}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all font-medium
                          ${daySignedOff
                            ? 'bg-green-100 dark:bg-green-500/20 border-green-500 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30'
                            : 'bg-transparent border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:shadow-[0_0_12px_rgba(37,99,235,0.4)] dark:hover:shadow-[0_0_12px_rgba(96,165,250,0.5)]'
                          }
                          ${(!canApprove || isLocked) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                        title={daySignedOff ? 'Unsign off this day' : 'Sign off all employees for this day'}
                      >
                        {daySignedOff ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Day Signed Off</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Sign Off Day</span>
                          </>
                        )}
                      </button>
                    );
                  })()}
                  {isLocked && isDayFullySignedOff(date) && (
                    <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 dark:bg-green-500/20 border border-green-500 text-green-600 dark:text-green-400">
                      <Check className="w-4 h-4" />
                      <span>Day Signed Off</span>
                    </span>
                  )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/[0.05]">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-white/60">Employee</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-white/60">Scheduled Start</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-white/60">Scheduled End</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-white/60">Clock In</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-white/60">Clock Out</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-white/60">Rota'd Hrs</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-white/60">Actual Hrs</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-white/60">Rota'd Cost</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-white/60">Actual Cost</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-white/60 w-20">Sign Off</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-white/[0.06]">
                      {employees.map(employee => {
                        const dayData = employee.days[date];
                        if (!dayData) return null;
                        
                        // Calculate hours for THIS DAY ONLY (not the whole week)
                        let dayRotaHours = 0;
                        if (dayData.scheduledStart && dayData.scheduledEnd) {
                          // First calculate gross hours (without breaks) to check if shift is > 6 hours
                          const grossHours = calculateHoursBetween(
                            dayData.scheduledStart,
                            dayData.scheduledEnd,
                            0 // No breaks for gross calculation
                          );
                          
                          // Determine break minutes: 30 min for shifts > 6 hours, otherwise use scheduled break or 0
                          let breakMinutes = dayData.scheduledBreakMinutes || 0;
                          if (grossHours !== null && grossHours > 6) {
                            breakMinutes = 30; // 30-minute break for shifts longer than 6 hours
                          }
                          
                          // Now calculate net hours with the appropriate break
                          const hours = calculateHoursBetween(
                            dayData.scheduledStart,
                            dayData.scheduledEnd,
                            breakMinutes
                          );
                          if (hours !== null && hours > 0) {
                            dayRotaHours = hours;
                          }
                        }
                        
                        let dayActualHours = 0;
                        // Prefer calculating from clock in/out times to apply 30-minute break rule
                        if (dayData.clockIn && dayData.clockOut) {
                          // First calculate gross hours (without breaks) to check if shift is > 6 hours
                          const grossHours = calculateHoursBetween(
                            dayData.clockIn,
                            dayData.clockOut,
                            0 // No breaks for gross calculation
                          );
                          
                          // Determine break minutes: 30 min for shifts > 6 hours, otherwise 0
                          let breakMinutes = 0;
                          if (grossHours !== null && grossHours > 6) {
                            breakMinutes = 30; // 30-minute break for shifts longer than 6 hours
                          }
                          
                          // Now calculate net hours with the appropriate break
                          const hours = calculateHoursBetween(dayData.clockIn, dayData.clockOut, breakMinutes);
                          if (hours !== null && hours > 0) {
                            dayActualHours = hours;
                          }
                        } else if (dayData.actualHours !== null && dayData.actualHours !== undefined) {
                          // Fallback to stored actualHours if clock times aren't available
                          dayActualHours = dayData.actualHours || 0;
                        }
                        
                        // Calculate costs for THIS DAY ONLY
                        // Check if this is a trial shift that should be paid
                        const isTrialShift = dayData.isTrialShift && dayData.shouldPayTrial;
                        const trialPaymentRate = dayData.trialPaymentRate;
                        
                        const isSalaried = employee.employmentType === 'salaried';
                        let hourlyRate = employee.hourlyRate || 0;
                        
                        // Check if hourly_rate might be stored in pence (e.g., 1500 = £15/hour)
                        if (hourlyRate > 100 && hourlyRate < 10000) {
                          hourlyRate = hourlyRate / 100; // Convert pence to pounds
                        }
                        
                        // If hourly rate is still suspiciously high (> 200), skip cost calculation
                        if (hourlyRate > 200) {
                          hourlyRate = 0;
                        }
                        
                        // For trial shifts that should be paid, use trial payment rate if available
                        // Otherwise fall back to regular rate
                        let effectiveHourlyRate = hourlyRate;
                        if (isTrialShift && trialPaymentRate && trialPaymentRate > 0) {
                          // Use trial payment rate (may need conversion from pence)
                          effectiveHourlyRate = trialPaymentRate > 100 && trialPaymentRate < 10000 
                            ? trialPaymentRate / 100 
                            : trialPaymentRate;
                          // Validate trial rate
                          if (effectiveHourlyRate > 200) {
                            effectiveHourlyRate = hourlyRate; // Fall back to regular rate
                          }
                        }
                        
                        // For salaried employees: calculate hourly rate from annual salary and weekly hours
                        // Formula: hourly_rate = (annual_salary / 52) / weekly_hours = annual_salary / (weekly_hours * 52)
                        // Then cost = hours_worked * hourly_rate
                        let salariedHourlyRate = 0;
                        if (isSalaried && employee.salary && employee.weeklyHours && employee.weeklyHours > 0) {
                          // salary is annual, so divide by 52 weeks, then by weekly hours to get hourly rate
                          salariedHourlyRate = employee.salary / (employee.weeklyHours * 52);
                        }
                        
                        // Calculate rota'd cost for this day
                        let dayRotaCost = 0;
                        if (dayRotaHours > 0) {
                          if (isTrialShift && effectiveHourlyRate > 0 && effectiveHourlyRate <= 1000) {
                            // Use trial payment rate for trial shifts
                            dayRotaCost = dayRotaHours * effectiveHourlyRate;
                          } else if (isSalaried && salariedHourlyRate > 0) {
                            dayRotaCost = dayRotaHours * salariedHourlyRate;
                          } else if (!isSalaried && hourlyRate > 0 && hourlyRate <= 1000) {
                            dayRotaCost = dayRotaHours * hourlyRate;
                          }
                        }
                        
                        // Calculate actual cost for this day
                        let dayActualCost = 0;
                        if (dayActualHours > 0) {
                          if (isTrialShift && effectiveHourlyRate > 0 && effectiveHourlyRate <= 1000) {
                            // Use trial payment rate for trial shifts
                            dayActualCost = dayActualHours * effectiveHourlyRate;
                          } else if (isSalaried && salariedHourlyRate > 0) {
                            dayActualCost = dayActualHours * salariedHourlyRate;
                          } else if (!isSalaried && hourlyRate > 0 && hourlyRate <= 1000) {
                            dayActualCost = dayActualHours * hourlyRate;
                          }
                        }
                        
                        // Also calculate week totals for reference (but show day hours in column)
                        const totalRotaHours = weekDates.reduce((sum, weekDateObj) => {
                          const weekDate = weekDateObj.date;
                          const weekDayData = employee.days[weekDate];
                          if (!weekDayData) return sum;
                          
                          if (weekDayData.scheduledStart && weekDayData.scheduledEnd) {
                            // First calculate gross hours to check if shift is > 6 hours
                            const grossHours = calculateHoursBetween(
                              weekDayData.scheduledStart,
                              weekDayData.scheduledEnd,
                              0 // No breaks for gross calculation
                            );
                            
                            // Determine break minutes: 30 min for shifts > 6 hours, otherwise use scheduled break or 0
                            let breakMinutes = weekDayData.scheduledBreakMinutes || 0;
                            if (grossHours !== null && grossHours > 6) {
                              breakMinutes = 30; // 30-minute break for shifts longer than 6 hours
                            }
                            
                            // Now calculate net hours with the appropriate break
                            const hours = calculateHoursBetween(
                              weekDayData.scheduledStart,
                              weekDayData.scheduledEnd,
                              breakMinutes
                            );
                            if (hours !== null && hours > 0) {
                              return sum + hours;
                            }
                          }
                          return sum;
                        }, 0);
                        
                        const totalActualHours = weekDates.reduce((sum, weekDateObj) => {
                          const weekDate = weekDateObj.date;
                          const weekDayData = employee.days[weekDate];
                          if (!weekDayData) return sum;
                          
                          // Prefer calculating from clock in/out times to apply 30-minute break rule
                          if (weekDayData.clockIn && weekDayData.clockOut) {
                            // First calculate gross hours (without breaks) to check if shift is > 6 hours
                            const grossHours = calculateHoursBetween(
                              weekDayData.clockIn,
                              weekDayData.clockOut,
                              0 // No breaks for gross calculation
                            );
                            
                            // Determine break minutes: 30 min for shifts > 6 hours, otherwise 0
                            let breakMinutes = 0;
                            if (grossHours !== null && grossHours > 6) {
                              breakMinutes = 30; // 30-minute break for shifts longer than 6 hours
                            }
                            
                            // Now calculate net hours with the appropriate break
                            const hours = calculateHoursBetween(weekDayData.clockIn, weekDayData.clockOut, breakMinutes);
                            if (hours !== null && hours > 0) {
                              return sum + hours;
                            }
                          } else if (weekDayData.actualHours !== null && weekDayData.actualHours !== undefined) {
                            // Fallback to stored actualHours if clock times aren't available
                            const hours = weekDayData.actualHours || 0;
                            if (hours > 0 && !isNaN(hours) && isFinite(hours)) {
                              return sum + hours;
                            }
                          }
                          return sum;
                        }, 0);
                        
                        // Debug logging for first employee on first day
                        if (date === weekDates[0]?.date && employees.indexOf(employee) === 0) {
                          console.log(`Totals for ${employee.staffName}:`, {
                            totalRotaHours,
                            totalActualHours,
                            weekDates: weekDates.length,
                            hasScheduledNetHours: weekDates.some(d => employee.days[d.date]?.scheduledNetHours !== null),
                            hasActualHours: weekDates.some(d => employee.days[d.date]?.actualHours !== null),
                            hasScheduledTimes: weekDates.some(d => employee.days[d.date]?.scheduledStart && employee.days[d.date]?.scheduledEnd),
                            hasClockTimes: weekDates.some(d => employee.days[d.date]?.clockIn && employee.days[d.date]?.clockOut),
                            sampleDayData: weekDates.map(d => ({
                              date: d.date,
                              hasData: !!employee.days[d.date],
                              scheduledNetHours: employee.days[d.date]?.scheduledNetHours,
                              actualHours: employee.days[d.date]?.actualHours,
                              scheduledStart: employee.days[d.date]?.scheduledStart,
                              scheduledEnd: employee.days[d.date]?.scheduledEnd,
                              clockIn: employee.days[d.date]?.clockIn,
                              clockOut: employee.days[d.date]?.clockOut
                            }))
                          });
                        }
                        
                        return (
                          <tr key={employee.staffId} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                            {/* Employee Name */}
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{employee.staffName}</p>
                                {employee.positionTitle && (
                                  <p className="text-xs text-gray-500 dark:text-white/50">{employee.positionTitle}</p>
                                )}
                              </div>
                            </td>
                            
                            {/* Scheduled Start */}
                            <td className="px-4 py-3">
                              <TimePicker
                                key={`${employee.staffId}-${date}-scheduledStart`}
                                value={dayData.scheduledStart ?? ''}
                                onChange={(value) => updateTime(employee.staffId, date, 'scheduledStart', value)}
                                onBlur={() => saveTimeChanges(employee.staffId, date)}
                                disabled={isLocked}
                                className="w-24"
                              />
                            </td>
                            
                            {/* Scheduled End */}
                            <td className="px-4 py-3">
                              <TimePicker
                                key={`${employee.staffId}-${date}-scheduledEnd`}
                                value={dayData.scheduledEnd ?? ''}
                                onChange={(value) => updateTime(employee.staffId, date, 'scheduledEnd', value)}
                                onBlur={() => saveTimeChanges(employee.staffId, date)}
                                disabled={isLocked}
                                className="w-24"
                              />
                            </td>
                            
                            {/* Clock In */}
                            <td className="px-4 py-3">
                              <TimePicker
                                key={`${employee.staffId}-${date}-clockIn`}
                                value={dayData.clockIn ?? ''}
                                onChange={(value) => updateTime(employee.staffId, date, 'clockIn', value)}
                                onBlur={() => saveTimeChanges(employee.staffId, date)}
                                disabled={isLocked}
                                className="w-24"
                              />
                            </td>
                            
                            {/* Clock Out */}
                            <td className="px-4 py-3">
                              <TimePicker
                                key={`${employee.staffId}-${date}-clockOut`}
                                value={dayData.clockOut ?? ''}
                                onChange={(value) => updateTime(employee.staffId, date, 'clockOut', value)}
                                onBlur={() => saveTimeChanges(employee.staffId, date)}
                                disabled={isLocked}
                                className="w-24"
                              />
                            </td>
                            
                            {/* Day Rota'd Hours (for this specific day) */}
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {dayRotaHours > 0 ? dayRotaHours.toFixed(2) : '—'}
                              </span>
                            </td>

                            {/* Day Actual Hours (for this specific day) */}
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {dayActualHours > 0 ? dayActualHours.toFixed(2) : '—'}
                              </span>
                            </td>

                            {/* Day Rota'd Cost (for this specific day) */}
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {dayRotaCost > 0 ? `£${dayRotaCost.toFixed(2)}` : '—'}
                              </span>
                            </td>

                            {/* Day Actual Cost (for this specific day) */}
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {dayActualCost > 0 ? `£${dayActualCost.toFixed(2)}` : '—'}
                              </span>
                            </td>
                            
                            {/* Sign Off Checkbox - Last Column (Far Right) */}
                            <td className="px-4 py-3 text-center">
                              {canApprove ? (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!isLocked) {
                                      handleEmployeeSignOff(employee.staffId, date, !dayData.signedOff);
                                    }
                                  }}
                                  disabled={!canApprove || isLocked}
                                  className={`
                                    w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mx-auto
                                    ${dayData.signedOff
                                      ? 'bg-green-500 border-green-500'
                                      : 'border-gray-400 dark:border-zinc-600 hover:border-blue-600 dark:hover:border-blue-400'
                                    }
                                    ${(!canApprove || isLocked) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                  `}
                                  title={isLocked ? 'Week is locked - unlock to edit' : (dayData.signedOff ? 'Unsign off' : 'Sign off')}
                                >
                                  {dayData.signedOff && <Check className="w-3 h-3 text-white" />}
                                </button>
                              ) : dayData.signedOff ? (
                                <Check className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto" />
                              ) : (
                                <span className="text-gray-400 dark:text-white/40">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Day Summary */}
                {(() => {
                  // Calculate totals for this day
                  let rotaHours = 0;
                  let actualHours = 0;
                  let rotaCost = 0;
                  let actualCost = 0;
                  
                  employees.forEach(employee => {
                    const dayData = employee.days[date];
                    if (!dayData) return;
                    
                    const isSalaried = employee.employmentType === 'salaried';
                    // Get hourly rate - validate it's reasonable (typically £5-£100/hour)
                    let hourlyRate = employee.hourlyRate || 0;
                    
                    // Check if hourly_rate might be stored in pence (e.g., 1500 = £15/hour)
                    // If rate is > 100 but < 10000, it might be in pence
                    if (hourlyRate > 100 && hourlyRate < 10000) {
                      hourlyRate = hourlyRate / 100; // Convert pence to pounds
                      console.log(`Converted hourly rate from pence for ${employee.staffName}: £${hourlyRate}/hour`);
                    }
                    
                    // If hourly rate is still suspiciously high (> 200), skip cost calculation
                    if (hourlyRate > 200) {
                      console.warn(`Suspicious hourly rate for ${employee.staffName}: £${hourlyRate}/hour. Skipping cost calculation.`);
                      hourlyRate = 0;
                    }
                    
                    // For salaried employees: calculate hourly rate from annual salary and weekly hours
                    // Formula: hourly_rate = (annual_salary / 52) / weekly_hours = annual_salary / (weekly_hours * 52)
                    // Then cost = hours_worked * hourly_rate
                    let salariedHourlyRate = 0;
                    if (isSalaried && employee.salary && employee.weeklyHours && employee.weeklyHours > 0) {
                      // salary is annual, so divide by 52 weeks, then by weekly hours to get hourly rate
                      salariedHourlyRate = employee.salary / (employee.weeklyHours * 52);
                    }
                    
                    // Check if this is a trial shift that should be paid
                    const isTrialShift = dayData.isTrialShift && dayData.shouldPayTrial;
                    const trialPaymentRate = dayData.trialPaymentRate;
                    
                    // Calculate scheduled hours (rota'd hours)
                    // Always calculate from times - don't trust scheduledNetHours from database (it may be incorrect)
                    if (dayData.scheduledStart && dayData.scheduledEnd) {
                      // First calculate gross hours (without breaks) to check if shift is > 6 hours
                      const grossHours = calculateHoursBetween(
                        dayData.scheduledStart,
                        dayData.scheduledEnd,
                        0 // No breaks for gross calculation
                      );
                      
                      // Determine break minutes: 30 min for shifts > 6 hours, otherwise use scheduled break or 0
                      let breakMinutes = dayData.scheduledBreakMinutes || 0;
                      if (grossHours !== null && grossHours > 6) {
                        breakMinutes = 30; // 30-minute break for shifts longer than 6 hours
                      }
                      
                      // Now calculate net hours with the appropriate break
                      const hours = calculateHoursBetween(
                        dayData.scheduledStart,
                        dayData.scheduledEnd,
                        breakMinutes
                      );
                      if (hours !== null && hours > 0) {
                        rotaHours += hours;
                        
                        // For trial shifts that should be paid, use trial payment rate if available
                        let effectiveHourlyRate = hourlyRate;
                        if (isTrialShift && trialPaymentRate && trialPaymentRate > 0) {
                          effectiveHourlyRate = trialPaymentRate > 100 && trialPaymentRate < 10000 
                            ? trialPaymentRate / 100 
                            : trialPaymentRate;
                          if (effectiveHourlyRate > 200) {
                            effectiveHourlyRate = hourlyRate; // Fall back to regular rate
                          }
                        }
                        
                        // Calculate cost using appropriate rate
                        if (isTrialShift && effectiveHourlyRate > 0 && effectiveHourlyRate <= 1000) {
                          rotaCost += hours * effectiveHourlyRate;
                        } else if (isSalaried && salariedHourlyRate > 0) {
                          rotaCost += hours * salariedHourlyRate;
                        } else if (!isSalaried && hourlyRate > 0 && hourlyRate <= 1000) {
                          rotaCost += hours * hourlyRate;
                        }
                      }
                    }
                    
                    // Calculate actual hours (clock in/out hours)
                    // Prefer calculating from clock in/out times to apply 30-minute break rule
                    if (dayData.clockIn && dayData.clockOut) {
                      // First calculate gross hours (without breaks) to check if shift is > 6 hours
                      const grossHours = calculateHoursBetween(
                        dayData.clockIn,
                        dayData.clockOut,
                        0 // No breaks for gross calculation
                      );
                      
                      // Determine break minutes: 30 min for shifts > 6 hours, otherwise 0
                      let breakMinutes = 0;
                      if (grossHours !== null && grossHours > 6) {
                        breakMinutes = 30; // 30-minute break for shifts longer than 6 hours
                      }
                      
                      // Now calculate net hours with the appropriate break
                      const hours = calculateHoursBetween(dayData.clockIn, dayData.clockOut, breakMinutes);
                      if (hours !== null && hours > 0) {
                        actualHours += hours;
                        
                        // For trial shifts that should be paid, use trial payment rate if available
                        let effectiveHourlyRate = hourlyRate;
                        if (isTrialShift && trialPaymentRate && trialPaymentRate > 0) {
                          effectiveHourlyRate = trialPaymentRate > 100 && trialPaymentRate < 10000 
                            ? trialPaymentRate / 100 
                            : trialPaymentRate;
                          if (effectiveHourlyRate > 200) {
                            effectiveHourlyRate = hourlyRate; // Fall back to regular rate
                          }
                        }
                        
                        // Calculate cost using appropriate rate
                        if (isTrialShift && effectiveHourlyRate > 0 && effectiveHourlyRate <= 1000) {
                          actualCost += hours * effectiveHourlyRate;
                        } else if (isSalaried && salariedHourlyRate > 0) {
                          actualCost += hours * salariedHourlyRate;
                        } else if (!isSalaried && hourlyRate > 0 && hourlyRate <= 1000) {
                          actualCost += hours * hourlyRate;
                        }
                      }
                    } else if (dayData.actualHours !== null && dayData.actualHours !== undefined) {
                      // Fallback to stored actualHours if clock times aren't available
                      const hours = dayData.actualHours;
                      if (hours > 0 && hours <= 48 && !isNaN(hours) && isFinite(hours)) {
                        actualHours += hours;
                        
                        // For trial shifts that should be paid, use trial payment rate if available
                        let effectiveHourlyRate = hourlyRate;
                        if (isTrialShift && trialPaymentRate && trialPaymentRate > 0) {
                          effectiveHourlyRate = trialPaymentRate > 100 && trialPaymentRate < 10000 
                            ? trialPaymentRate / 100 
                            : trialPaymentRate;
                          if (effectiveHourlyRate > 200) {
                            effectiveHourlyRate = hourlyRate; // Fall back to regular rate
                          }
                        }
                        
                        // Calculate cost using appropriate rate
                        if (isTrialShift && effectiveHourlyRate > 0 && effectiveHourlyRate <= 1000) {
                          actualCost += hours * effectiveHourlyRate;
                        } else if (isSalaried && salariedHourlyRate > 0) {
                          actualCost += hours * salariedHourlyRate;
                        } else if (!isSalaried && hourlyRate > 0 && hourlyRate <= 1000) {
                          actualCost += hours * hourlyRate;
                        }
                      }
                    }
                  });
                  
                  // Debug: Log summary for this day
                  if (date === '2024-12-22') {
                    console.log(`Day Summary for ${date}:`, {
                      rotaHours: rotaHours.toFixed(2),
                      actualHours: actualHours.toFixed(2),
                      rotaCost: rotaCost.toFixed(2),
                      actualCost: actualCost.toFixed(2),
                      employeeCount: employees.filter(e => e.days[date]).length
                    });
                  }
                  
                  return (
                    <div className="bg-gray-50 dark:bg-white/[0.05] border-t border-gray-200 dark:border-white/[0.06] px-4 py-3">
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-white/60 text-xs mb-1">Rota'd Hours</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{rotaHours.toFixed(2)}h</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-white/60 text-xs mb-1">Actual Hours</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{actualHours.toFixed(2)}h</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-white/60 text-xs mb-1">Rota'd Cost</p>
                          <p className="font-semibold text-gray-900 dark:text-white">£{rotaCost.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-white/60 text-xs mb-1">Actual Cost</p>
                          <p className="font-semibold text-gray-900 dark:text-white">£{actualCost.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
            
            {/* Final Sign-Off Button - Always show */}
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6 flex items-center justify-between shadow-sm dark:shadow-none">
              <div>
                <p className="text-sm text-gray-500 dark:text-white/60">
                  {isLocked 
                    ? 'This week has been locked and submitted to payroll.'
                    : allSignedOff 
                      ? 'All hours have been signed off and are ready for payroll.'
                      : 'Please sign off all entries before submitting to payroll.'
                  }
                </p>
              </div>
              {canApprove && !isLocked && (
                <button
                  onClick={handleLockWeek}
                  disabled={!allSignedOff || locking}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ease-in-out
                    ${allSignedOff && !locking
                      ? 'bg-transparent border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:shadow-[0_0_12px_rgba(37,99,235,0.4)] dark:hover:shadow-[0_0_12px_rgba(96,165,250,0.5)] cursor-pointer'
                      : 'bg-transparent border border-gray-400 dark:border-zinc-600 text-gray-400 dark:text-zinc-500 cursor-not-allowed opacity-50'
                    }
                  `}
                >
                  {locking ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400" />
                      Locking...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Lock Week & Send to Payroll
                    </>
                  )}
                </button>
              )}
              
              {/* Unlock Week Button - Always show when locked */}
              {canApprove && isLocked && (() => {
                // Check if pay date has passed
                let canUnlock = true;
                if (payDate) {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const payDateOnly = new Date(payDate);
                  payDateOnly.setHours(0, 0, 0, 0);
                  canUnlock = payDateOnly >= today;
                }
                
                return (
                  <button
                    onClick={handleUnlockWeek}
                    disabled={unlocking || !canUnlock}
                    className={`
                      bg-transparent border border-amber-500/50 text-amber-600 dark:text-amber-400
                      hover:shadow-[0_0_12px_rgba(245,158,11,0.5)]
                      transition-all duration-200 px-4 py-2 rounded-lg
                      flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    title={!canUnlock ? 'Cannot unlock - pay date has passed' : 'Unlock this week to make edits before pay date'}
                  >
                    {unlocking ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-400" />
                        Unlocking...
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        Unlock Week
                      </>
                    )}
                  </button>
                );
              })()}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
