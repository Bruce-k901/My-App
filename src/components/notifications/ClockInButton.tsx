"use client";

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Clock, MapPin } from '@/components/ui/icons'
import { useAttendance } from '@/hooks/useAttendance'
import { useAppContext } from '@/context/AppContext'
import { formatDistanceToNow } from 'date-fns'

export function ClockInButton() {
  // ALL HOOKS MUST BE CALLED AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const { isClockedIn, currentAttendance, loading, clockIn, clockOut } = useAttendance()
  const { siteId } = useAppContext()
  const [requestingLocation, setRequestingLocation] = useState(false)
  const [showClockInConfirm, setShowClockInConfirm] = useState(false)
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false)

  // Memoize duration calculation - MUST be before any conditional returns
  const duration = useMemo(() => {
    if (!isClockedIn || !currentAttendance) return null
    
    // Handle both old (clock_in_at) and new (clock_in_time) field names
    const clockInTimeValue = currentAttendance.clock_in_time || currentAttendance.clock_in_at
    if (!clockInTimeValue) return null
    
    try {
      const clockInTime = new Date(clockInTimeValue)
      
      // Validate the date before using formatDistanceToNow
      if (isNaN(clockInTime.getTime())) {
        return null
      }
      
      return formatDistanceToNow(clockInTime, { addSuffix: false })
    } catch (error) {
      return null
    }
  }, [isClockedIn, currentAttendance?.clock_in_time, currentAttendance?.clock_in_at])

  const handleClockInClick = useCallback(() => {
    if (!siteId || siteId === 'all') {
      alert('Please select a specific site first')
      return
    }
    setShowClockInConfirm(true)
  }, [siteId])

  const handleClockInConfirm = useCallback(async () => {
    setRequestingLocation(true)
    let location: { lat: number; lng: number; accuracy: number } | undefined

    // Try to get location
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        })
      })

      location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy || 0
      }
    } catch (error) {
      // Continue without location
    } finally {
      setRequestingLocation(false)
    }

    const result = await clockIn(location)
    if (!result.success) {
      alert(result.error || 'Failed to clock in')
    }
  }, [clockIn])

  const handleClockOutClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowClockOutConfirm(true)
  }, [])

  const handleClockOutConfirm = useCallback(async () => {
    const result = await clockOut()
    if (!result.success) {
      alert(result.error || 'Failed to clock out')
    } else {
      // Refresh status after successful clock out
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refresh-tasks'))
      }, 500)
    }
  }, [clockOut])

  const handleCloseClockOutConfirm = useCallback(() => {
    setShowClockOutConfirm(false)
  }, [])

  const handleCloseClockInConfirm = useCallback(() => {
    setShowClockInConfirm(false)
  }, [])

  // NOW we can do conditional returns - all hooks have been called
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/[0.06] border border-theme h-9 md:h-10">
        <Clock className="w-4 h-4 text-theme-tertiary animate-pulse" />
        <span className="text-theme-tertiary text-xs md:text-sm hidden sm:inline">Loading...</span>
      </div>
    )
  }

  if (isClockedIn && currentAttendance) {
    // Handle both old (clock_in_at) and new (clock_in_time) field names
    const clockInTimeValue = currentAttendance.clock_in_time || currentAttendance.clock_in_at
    if (!clockInTimeValue) {
      return (
        <div className="px-3 py-2 text-theme-tertiary text-sm">
          Clocked in (time unavailable)
        </div>
      )
    }
    
    if (!duration) {
      return (
        <div className="px-3 py-2 text-theme-tertiary text-sm">
          Clocked in (invalid time)
        </div>
      )
    }

    return (
      <>
        <div className="flex items-center gap-2 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 bg-green-50 dark:bg-green-500/20 border border-green-300 dark:border-green-500/50 rounded-lg h-9 md:h-10">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
            <div className="text-xs md:text-sm">
              <span className="text-green-700 dark:text-green-400 font-medium hidden sm:inline">Clocked In</span>
              <span className="text-green-700 dark:text-green-400 font-medium sm:hidden">In</span>
              <span className="text-green-600/70 dark:text-theme-tertiary text-xs ml-1 hidden md:inline">({duration})</span>
            </div>
          </div>
          <button
            onClick={handleClockOutClick}
            type="button"
            className="px-2 md:px-3 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30 text-red-600 dark:text-red-400 text-xs md:text-sm rounded transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="hidden sm:inline">Clock Out</span>
            <span className="sm:hidden">Out</span>
          </button>
        </div>

        {/* Clock Out Confirmation - Must be outside the early return */}
        {showClockOutConfirm && (
          <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center" style={{ minHeight: '100vh' }} onClick={handleCloseClockOutConfirm}>
            <div className="bg-theme-surface p-6 rounded-lg border border-theme shadow-lg max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-theme-primary mb-4">Clock Out</h2>
              <p className="text-gray-600 dark:text-neutral-300 mb-6">Are you sure you want to clock out?</p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseClockOutConfirm}
                  className="px-4 py-2 border border-gray-300 dark:border-neutral-600 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    console.log('Clock Out confirmed')
                    setShowClockOutConfirm(false)
                    await handleClockOutConfirm()
                  }}
                  className="px-4 py-2 bg-magenta-500 hover:bg-magenta-600 text-white rounded"
                >
                  Clock Out
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <button
        onClick={handleClockInClick}
        disabled={requestingLocation || !siteId || siteId === 'all'}
        className="flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-[#D37E91]/10 hover:bg-[#D37E91]/10 dark:bg-[#D37E91]/25 dark:hover:bg-[#D37E91]/35 border border-[#D37E91] dark:border-[#D37E91]/50 text-[#D37E91] dark:text-[#D37E91] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-9 md:h-10"
      >
        {requestingLocation ? (
          <>
            <MapPin className="w-4 h-4 animate-pulse" />
            <span className="text-xs md:text-sm hidden sm:inline">Getting location...</span>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4" />
            <span className="text-xs md:text-sm whitespace-nowrap">Clock In</span>
          </>
        )}
      </button>

      {/* Clock In Confirmation */}
      {showClockInConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center" style={{ minHeight: '100vh' }} onClick={handleCloseClockInConfirm}>
          <div className="bg-theme-surface p-6 rounded-lg border border-theme shadow-lg max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-theme-primary mb-4">Clock In</h2>
            <p className="text-gray-600 dark:text-neutral-300 mb-6">Are you ready to clock in? Your location will be recorded if available.</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseClockInConfirm}
                className="px-4 py-2 border border-gray-300 dark:border-neutral-600 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  console.log('Clock In confirmed')
                  setShowClockInConfirm(false)
                  await handleClockInConfirm()
                }}
                className="px-4 py-2 bg-magenta-500 hover:bg-magenta-600 text-white rounded"
              >
                Clock In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clock Out Confirmation */}
      {showClockOutConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center" style={{ minHeight: '100vh' }} onClick={handleCloseClockOutConfirm}>
          <div className="bg-theme-surface p-6 rounded-lg border border-theme shadow-lg max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-theme-primary mb-4">Clock Out</h2>
            <p className="text-theme-tertiary mb-6">Are you sure you want to clock out?</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseClockOutConfirm}
                className="px-4 py-2 border border-gray-300 dark:border-neutral-600 text-theme-tertiary hover:bg-gray-100 dark:hover:bg-neutral-800 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  console.log('Clock Out confirmed')
                  setShowClockOutConfirm(false)
                  await handleClockOutConfirm()
                }}
                className="px-4 py-2 bg-magenta-500 hover:bg-magenta-600 text-white rounded"
              >
                Clock Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

