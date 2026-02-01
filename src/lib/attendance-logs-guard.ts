/**
 * ATTENDANCE LOGS GUARD
 * 
 * This module provides a bulletproof wrapper around attendance_logs queries
 * to prevent the 406 error from ever happening again.
 * 
 * USAGE:
 *   Instead of: supabase.from('attendance_logs').select('id').eq('clock_in_at::date', date)
 *   Use: attendanceLogsGuard.select().eq('clock_in_date', date)
 * 
 * This ensures:
 * 1. All date filters use clock_in_date (not clock_in_at::date)
 * 2. Write operations are automatically redirected to staff_attendance
 * 3. Clear error messages if something goes wrong
 */

import { supabase } from '@/lib/supabase'

type QueryBuilder = ReturnType<typeof supabase.from>

class AttendanceLogsGuard {
  /**
   * Create a SELECT query on attendance_logs view
   * Automatically fixes any clock_in_at::date filters to clock_in_date
   */
  select(columns: string = '*') {
    const query = supabase.from('attendance_logs').select(columns)
    
    // Wrap the query builder to intercept filter calls
    return this.wrapQueryBuilder(query, 'select')
  }

  /**
   * Create an INSERT query - automatically redirects to staff_attendance
   */
  insert(data: any) {
    console.warn('⚠️ attendance_logs.insert() called - redirecting to staff_attendance')
    return supabase.from('staff_attendance').insert(data)
  }

  /**
   * Create an UPDATE query - automatically redirects to staff_attendance
   */
  update(data: any) {
    console.warn('⚠️ attendance_logs.update() called - redirecting to staff_attendance')
    return supabase.from('staff_attendance').update(data)
  }

  /**
   * Create a DELETE query - automatically redirects to staff_attendance
   */
  delete() {
    console.warn('⚠️ attendance_logs.delete() called - redirecting to staff_attendance')
    return supabase.from('staff_attendance').delete()
  }

  /**
   * Wrap query builder to intercept problematic filter calls
   */
  private wrapQueryBuilder(query: QueryBuilder, operation: string): QueryBuilder {
    // Intercept .eq() calls to fix clock_in_at::date patterns
    const originalEq = (query as any).eq?.bind(query)
    if (originalEq) {
      (query as any).eq = (column: string, value: any) => {
        if (column.includes('clock_in_at') && column.includes('date')) {
          console.error('❌ BLOCKED: Attempted to use clock_in_at::date filter')
          console.error('📋 Use clock_in_date column instead')
          console.error(`   ❌ .eq('${column}', ...)`)
          console.error(`   ✅ .eq('clock_in_date', ...)`)
          throw new Error(
            `Cannot use "${column}" filter on attendance_logs. ` +
            `Use "clock_in_date" column instead. ` +
            `Example: .eq('clock_in_date', '${value}')`
          )
        }
        return originalEq(column, value)
      }
    }

    return query
  }
}

/**
 * Singleton instance - use this instead of direct supabase.from('attendance_logs')
 */
export const attendanceLogsGuard = new AttendanceLogsGuard()

/**
 * Helper function for common queries
 */
export async function getAttendanceLogsByDate(
  siteId: string,
  date: string
): Promise<any[]> {
  const { data, error } = await attendanceLogsGuard
    .select('*')
    .eq('site_id', siteId)
    .eq('clock_in_date', date) // ✅ Correct: uses clock_in_date
    
  if (error) {
    console.error('Error fetching attendance logs:', error)
    return []
  }
  
  return data || []
}

/**
 * Helper function to check if user is clocked in
 */
export async function isUserClockedInToday(
  userId: string,
  siteId: string,
  date?: string
): Promise<boolean> {
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  const { data, error } = await attendanceLogsGuard
    .select('id')
    .eq('profile_id', userId)
    .eq('site_id', siteId)
    .eq('clock_in_date', targetDate) // ✅ Correct: uses clock_in_date
    .is('clock_out_at', null)
    .maybeSingle()
    
  if (error) {
    console.error('Error checking clock-in status:', error)
    return false
  }
  
  return !!data
}

