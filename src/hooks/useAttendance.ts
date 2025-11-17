/**
 * React Hook for Attendance/Clock-in Management
 */

import { useState, useEffect, useCallback } from 'react'
import { useAppContext } from '@/context/AppContext'
import * as attendanceService from '@/lib/notifications/attendance'
import type { AttendanceLog } from '@/lib/notifications/attendance'

export function useAttendance() {
  const { user, siteId } = useAppContext()
  const [isClockedIn, setIsClockedIn] = useState<boolean>(false)
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceLog | null>(null)
  const [loading, setLoading] = useState(true)

  // Check clock-in status on mount and when site changes
  useEffect(() => {
    if (!user || !siteId) {
      setLoading(false)
      return
    }

    const checkStatus = async () => {
      try {
        const clockedIn = await attendanceService.isClockedIn(siteId)
        setIsClockedIn(clockedIn)

        if (clockedIn) {
          const attendance = await attendanceService.getCurrentAttendance()
          setCurrentAttendance(attendance)
        } else {
          setCurrentAttendance(null)
        }
      } catch (error) {
        console.error('Error checking attendance status:', error)
      } finally {
        setLoading(false)
      }
    }

    checkStatus()

    // Check every minute to keep status updated
    const interval = setInterval(checkStatus, 60000)
    return () => clearInterval(interval)
  }, [user, siteId])

  const clockIn = useCallback(async (
    location?: { lat: number; lng: number; accuracy: number },
    notes?: string
  ) => {
    if (!siteId) {
      throw new Error('No site selected')
    }

    setLoading(true)
    try {
      const result = await attendanceService.clockIn(siteId, location, notes)
      if (result.success && result.attendanceLog) {
        setIsClockedIn(true)
        setCurrentAttendance(result.attendanceLog)
        // Refresh status to ensure consistency
        const clockedIn = await attendanceService.isClockedIn(siteId)
        setIsClockedIn(clockedIn)
        if (clockedIn) {
          const attendance = await attendanceService.getCurrentAttendance()
          setCurrentAttendance(attendance)
        }
        return { success: true }
      } else {
        throw new Error(result.error || 'Failed to clock in')
      }
    } catch (error: any) {
      console.error('Error clocking in:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }, [siteId])

  const clockOut = useCallback(async (notes?: string) => {
    setLoading(true)
    try {
      const result = await attendanceService.clockOut(notes)
      if (result.success) {
        setIsClockedIn(false)
        setCurrentAttendance(null)
        // Refresh status to ensure consistency
        const clockedIn = await attendanceService.isClockedIn(siteId)
        setIsClockedIn(clockedIn)
        if (!clockedIn) {
          setCurrentAttendance(null)
        }
        return { success: true }
      } else {
        throw new Error(result.error || 'Failed to clock out')
      }
    } catch (error: any) {
      console.error('Error clocking out:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }, [siteId])

  return {
    isClockedIn,
    currentAttendance,
    loading,
    clockIn,
    clockOut
  }
}

