/**
 * Attendance Logs Helper
 * Provides functions to query attendance_logs table using REST API-compatible methods
 * 
 * IMPORTANT: PostgREST doesn't support PostgreSQL casting operators (::date) in URL filters.
 * Use clock_in_date column instead of clock_in_at::date
 */

import { supabase } from '@/lib/supabase'

export interface AttendanceLog {
  id: string
  user_id: string
  company_id: string
  site_id: string | null
  clock_in_at: string
  clock_out_at: string | null
  clock_in_date: string // Date column (YYYY-MM-DD format)
  location: { lat: number; lng: number; accuracy: number } | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Check if a user is clocked in today at a specific site
 * Uses clock_in_date column instead of clock_in_at::date (REST API compatible)
 */
export async function isUserClockedInToday(
  userId: string,
  siteId: string,
  date?: string
): Promise<boolean> {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0] // YYYY-MM-DD format

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('site_id', siteId)
      .eq('clock_in_date', targetDate) // Use clock_in_date, not clock_in_at::date
      .is('clock_out_at', null)
      .maybeSingle()

    if (error) {
      console.error('Error checking clock-in status:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Exception checking clock-in status:', error)
    return false
  }
}

/**
 * Get attendance log for a user on a specific date at a site
 * Uses clock_in_date column instead of clock_in_at::date (REST API compatible)
 */
export async function getAttendanceLogForDate(
  userId: string,
  siteId: string,
  date?: string
): Promise<AttendanceLog | null> {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0] // YYYY-MM-DD format

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('site_id', siteId)
      .eq('clock_in_date', targetDate) // Use clock_in_date, not clock_in_at::date
      .maybeSingle()

    if (error) {
      console.error('Error fetching attendance log:', error)
      return null
    }

    return data as AttendanceLog | null
  } catch (error) {
    console.error('Exception fetching attendance log:', error)
    return null
  }
}

/**
 * Get active attendance logs for a site today
 * Uses clock_in_date column instead of clock_in_at::date (REST API compatible)
 */
export async function getActiveAttendanceLogsForSite(
  siteId: string,
  date?: string
): Promise<AttendanceLog[]> {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0] // YYYY-MM-DD format

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('site_id', siteId)
      .eq('clock_in_date', targetDate) // Use clock_in_date, not clock_in_at::date
      .is('clock_out_at', null)
      .order('clock_in_at', { ascending: false })

    if (error) {
      console.error('Error fetching active attendance logs:', error)
      return []
    }

    return (data || []) as AttendanceLog[]
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

