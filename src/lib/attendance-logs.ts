/**
 * Attendance Logs Helper
 * 
 * NOTE: The attendance_logs table may have been dropped in favor of staff_attendance.
 * These functions use attendance_logs IF it exists with clock_in_date column.
 * 
 * IMPORTANT: PostgREST doesn't support PostgreSQL casting operators (::date) in URL filters.
 * Use clock_in_date column instead of clock_in_at::date
 * 
 * If attendance_logs table doesn't exist, use staff_attendance table instead via:
 * @/lib/notifications/attendance
 */

import { supabase } from '@/lib/supabase'

export interface AttendanceLog {
  id: string
  user_id: string
  company_id: string
  site_id: string | null
  clock_in_at: string
  clock_out_at: string | null
  clock_in_date?: string // Date column (YYYY-MM-DD format) - may not exist
  location: { lat: number; lng: number; accuracy: number } | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Check if a user is clocked in today at a specific site
 * Uses staff_attendance table (new system) or attendance_logs with clock_in_date (legacy)
 */
export async function isUserClockedInToday(
  userId: string,
  siteId: string,
  date?: string
): Promise<boolean> {
  try {
    // First try staff_attendance (new system)
    const targetDate = date || new Date().toISOString().split('T')[0]
    
    const { data: staffData, error: staffError } = await supabase
      .from('staff_attendance')
      .select('id')
      .eq('user_id', userId)
      .eq('site_id', siteId)
      .eq('shift_status', 'on_shift')
      .is('clock_out_time', null)
      .maybeSingle()

    if (!staffError && staffData) {
      return true // Found in staff_attendance
    }

    // Return result from staff_attendance (new system)
    return !!staffData
  } catch (error) {
    console.error('Exception checking clock-in status:', error)
    return false
  }
}

/**
 * Get attendance log for a user on a specific date at a site
 * Uses staff_attendance table (new system) or attendance_logs with clock_in_date (legacy)
 */
export async function getAttendanceLogForDate(
  userId: string,
  siteId: string,
  date?: string
): Promise<AttendanceLog | null> {
  try {
    // First try staff_attendance (new system)
    const targetDate = date || new Date().toISOString().split('T')[0]
    
    const { data: staffData, error: staffError } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('site_id', siteId)
      .maybeSingle()

    if (!staffError && staffData) {
      // Map staff_attendance to AttendanceLog format
      return {
        id: staffData.id,
        user_id: staffData.user_id,
        company_id: staffData.company_id,
        site_id: staffData.site_id,
        clock_in_at: staffData.clock_in_time,
        clock_out_at: staffData.clock_out_time || null,
        clock_in_date: staffData.clock_in_time ? new Date(staffData.clock_in_time).toISOString().split('T')[0] : undefined,
        location: null,
        notes: staffData.shift_notes || null,
        created_at: staffData.created_at,
        updated_at: staffData.updated_at,
      } as AttendanceLog
    }

    // Return result from staff_attendance (new system)
    return null
  } catch (error) {
    console.error('Exception fetching attendance log:', error)
    return null
  }
}

/**
 * Get active attendance logs for a site today
 * Uses staff_attendance table (new system) or attendance_logs with clock_in_date (legacy)
 */
export async function getActiveAttendanceLogsForSite(
  siteId: string,
  date?: string
): Promise<AttendanceLog[]> {
  try {
    // First try staff_attendance (new system)
    const targetDate = date || new Date().toISOString().split('T')[0]
    
    const { data: staffData, error: staffError } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('site_id', siteId)
      .eq('shift_status', 'on_shift')
      .is('clock_out_time', null)
      .order('clock_in_time', { ascending: false })

    if (!staffError && staffData && staffData.length > 0) {
      // Map staff_attendance to AttendanceLog format
      return staffData.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        company_id: item.company_id,
        site_id: item.site_id,
        clock_in_at: item.clock_in_time,
        clock_out_at: item.clock_out_time || null,
        clock_in_date: item.clock_in_time ? new Date(item.clock_in_time).toISOString().split('T')[0] : undefined,
        location: null,
        notes: item.shift_notes || null,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })) as AttendanceLog[]
    }

    // Return result from staff_attendance (new system)
    return []
  } catch (error) {
    console.error('Exception fetching active attendance logs:', error)
    return []
  }
}

/**
 * Alternative: Use RPC function (recommended for complex queries)
 * This avoids REST API limitations entirely
 */
export async function isUserClockedInTodayRPC(
  userId: string,
  siteId: string,
  date?: string
): Promise<boolean> {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0]

    const { data, error } = await supabase.rpc('is_user_clocked_in_today', {
      p_user_id: userId,
      p_site_id: siteId,
      p_date: targetDate
    })

    if (error) {
      console.error('Error calling RPC function:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('Exception calling RPC function:', error)
    return false
  }
}

