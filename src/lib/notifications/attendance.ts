/**
 * Attendance / Clock-in Service
 * Handles clock-in and clock-out functionality
 */

import { supabase } from '@/lib/supabase'
import { useAppContext } from '@/context/AppContext'

export interface AttendanceLog {
  id: string
  user_id: string
  company_id: string
  site_id: string | null
  clock_in_at: string
  clock_out_at: string | null
  location: { lat: number; lng: number; accuracy: number } | null
  notes: string | null
}

/**
 * Clock in for the current user
 */
export async function clockIn(
  siteId: string,
  location?: { lat: number; lng: number; accuracy: number },
  notes?: string
): Promise<{ success: boolean; error?: string; attendanceLog?: AttendanceLog }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get user profile to get company_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Failed to fetch user profile' }
    }

    // Check if already clocked in
    const { data: existing } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('user_id', user.id)
      .is('clock_out_at', null)
      .eq('clock_in_at::date', new Date().toISOString().split('T')[0])
      .single()

    if (existing) {
      return { success: false, error: 'Already clocked in' }
    }

    // Create attendance log
    const { data: attendanceLog, error } = await supabase
      .from('attendance_logs')
      .insert({
        user_id: user.id,
        company_id: profile.company_id,
        site_id: siteId,
        location: location || null,
        notes: notes || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error clocking in:', error)
      return { success: false, error: error.message }
    }

    return { success: true, attendanceLog: attendanceLog as AttendanceLog }
  } catch (error: any) {
    console.error('Error in clockIn:', error)
    return { success: false, error: error.message || 'Failed to clock in' }
  }
}

/**
 * Clock out for the current user
 */
export async function clockOut(notes?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Find active clock-in
    const { data: activeLog, error: findError } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('user_id', user.id)
      .is('clock_out_at', null)
      .eq('clock_in_at::date', new Date().toISOString().split('T')[0])
      .single()

    if (findError || !activeLog) {
      return { success: false, error: 'No active clock-in found' }
    }

    // Update clock-out time
    const { error: updateError } = await supabase
      .from('attendance_logs')
      .update({
        clock_out_at: new Date().toISOString(),
        notes: notes || null
      })
      .eq('id', activeLog.id)

    if (updateError) {
      console.error('Error clocking out:', updateError)
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in clockOut:', error)
    return { success: false, error: error.message || 'Failed to clock out' }
  }
}

/**
 * Check if current user is clocked in
 */
export async function isClockedIn(siteId?: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    let query = supabase
      .from('attendance_logs')
      .select('id')
      .eq('user_id', user.id)
      .is('clock_out_at', null)
      .eq('clock_in_at::date', new Date().toISOString().split('T')[0])

    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    const { data, error } = await query.single()

    return !error && !!data
  } catch (error) {
    return false
  }
}

/**
 * Get current attendance log
 */
export async function getCurrentAttendance(): Promise<AttendanceLog | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user.id)
      .is('clock_out_at', null)
      .eq('clock_in_at::date', new Date().toISOString().split('T')[0])
      .single()

    if (error || !data) return null

    return data as AttendanceLog
  } catch (error) {
    return null
  }
}

