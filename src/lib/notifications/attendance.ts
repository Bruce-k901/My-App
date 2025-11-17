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

    // Check if already clocked in (any active clock-in, not just today's)
    const { data: existing } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('user_id', user.id)
      .is('clock_out_at', null)
      .order('clock_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Already clocked in. Please clock out first.' }
    }

    // Create attendance log
    const insertData = {
      user_id: user.id,
      company_id: profile.company_id,
      site_id: siteId,
      location: location || null,
      notes: notes || null
    }
    
    console.log('🕐 Clocking in with data:', insertData)
    
    const { data: attendanceLog, error } = await supabase
      .from('attendance_logs')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Error clocking in:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Clock-in successful:', attendanceLog)
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

    // Find active clock-in (any active clock-in, not just today's)
    // This allows clocking out even if clocked in yesterday
    console.log('🕐 Looking for active clock-in for user:', user.id)
    
    const { data: activeLog, error: findError } = await supabase
      .from('attendance_logs')
      .select('id, clock_in_at, site_id')
      .eq('user_id', user.id)
      .is('clock_out_at', null)
      .order('clock_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log('🔍 Active clock-in query result:', { activeLog, error: findError })

    if (findError) {
      console.error('❌ Error finding active clock-in:', findError)
      return { success: false, error: `Database error: ${findError.message}` }
    }

    if (!activeLog) {
      // Debug: Check if there are ANY attendance logs for this user
      const { data: allLogs } = await supabase
        .from('attendance_logs')
        .select('id, clock_in_at, clock_out_at, site_id')
        .eq('user_id', user.id)
        .order('clock_in_at', { ascending: false })
        .limit(5)
      
      console.log('📋 All attendance logs for user:', allLogs)
      return { success: false, error: 'No active clock-in found. Please clock in first.' }
    }
    
    console.log('✅ Found active clock-in:', activeLog)

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

    // Check for any active clock-in (not just today's)
    let query = supabase
      .from('attendance_logs')
      .select('id')
      .eq('user_id', user.id)
      .is('clock_out_at', null)
      .order('clock_in_at', { ascending: false })
      .limit(1)

    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    const { data, error } = await query.maybeSingle()

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
 * Get current attendance log
 */
export async function getCurrentAttendance(): Promise<AttendanceLog | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get any active clock-in (not just today's)
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user.id)
      .is('clock_out_at', null)
      .order('clock_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error getting current attendance:', error)
      return null
    }

    if (!data) return null

    return data as AttendanceLog
  } catch (error) {
    console.error('Exception getting current attendance:', error)
    return null
  }
}

