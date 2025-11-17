"use client";

import { useState, useEffect } from 'react'
import { Clock, MapPin } from 'lucide-react'
import { useAttendance } from '@/hooks/useAttendance'
import { useAppContext } from '@/context/AppContext'
import { formatDistanceToNow } from 'date-fns'

export function ClockInButton() {
  const { isClockedIn, currentAttendance, loading, clockIn, clockOut } = useAttendance()
  const { siteId } = useAppContext()
  const [requestingLocation, setRequestingLocation] = useState(false)
  const [showClockInConfirm, setShowClockInConfirm] = useState(false)
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false)

  // Debug: Log state changes
  useEffect(() => {
    console.log('🕐 ClockInButton state changed:', { showClockInConfirm, showClockOutConfirm, isClockedIn })
  }, [showClockInConfirm, showClockOutConfirm, isClockedIn])

  const handleClockInClick = () => {
    if (!siteId) {
      alert('Please select a site first')
      return
    }
    console.log('🕐 Clock In clicked, showing confirmation dialog', { showClockInConfirm })
    setShowClockInConfirm(true)
    console.log('🕐 State updated, showClockInConfirm should be true:', true)
  }

  const handleClockInConfirm = async () => {
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
      console.warn('Location not available:', error)
      // Continue without location
    } finally {
      setRequestingLocation(false)
    }

    const result = await clockIn(location)
    if (!result.success) {
      alert(result.error || 'Failed to clock in')
    }
  }

  const handleClockOutClick = () => {
    setShowClockOutConfirm(true)
  }

  const handleClockOutConfirm = async () => {
    const result = await clockOut()
    if (!result.success) {
      alert(result.error || 'Failed to clock out')
    }
  }

  if (loading) {
    return (
      <div className="px-3 py-2 text-white/60 text-sm">
        Loading...
      </div>
    )
  }

  if (isClockedIn && currentAttendance) {
    // Handle both old (clock_in_at) and new (clock_in_time) field names
    const clockInTimeValue = currentAttendance.clock_in_time || currentAttendance.clock_in_at
    if (!clockInTimeValue) {
      return (
        <div className="px-3 py-2 text-white/60 text-sm">
          Clocked in (time unavailable)
        </div>
      )
    }
    
    const clockInTime = new Date(clockInTimeValue)
    // Validate the date before using formatDistanceToNow
    if (isNaN(clockInTime.getTime())) {
      console.error('Invalid clock in time:', clockInTimeValue)
      return (
        <div className="px-3 py-2 text-white/60 text-sm">
          Clocked in (invalid time)
        </div>
      )
    }
    
    const duration = formatDistanceToNow(clockInTime, { addSuffix: false })

    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-green-400" />
          <div className="text-sm">
            <div className="text-green-400 font-medium">Clocked In</div>
            <div className="text-white/60 text-xs">Since {duration} ago</div>
          </div>
        </div>
        <button
          onClick={handleClockOutClick}
          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded transition-colors"
        >
          Clock Out
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={handleClockInClick}
        disabled={requestingLocation || !siteId}
        className="flex items-center gap-2 px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/50 text-pink-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {requestingLocation ? (
          <>
            <MapPin className="w-4 h-4 animate-pulse" />
            <span className="text-sm">Getting location...</span>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4" />
            <span className="text-sm">Clock In</span>
          </>
        )}
      </button>

      {/* Clock In Confirmation */}
      {showClockInConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center" onClick={() => setShowClockInConfirm(false)}>
          <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-700 shadow-lg max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Clock In</h2>
            <p className="text-neutral-300 mb-6">Are you ready to clock in? Your location will be recorded if available.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  console.log('🕐 Clock In dialog cancelled')
                  setShowClockInConfirm(false)
                }}
                className="px-4 py-2 border border-neutral-600 text-neutral-300 hover:bg-neutral-800 rounded"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  console.log('🕐 Clock In confirmed')
                  setShowClockInConfirm(false)
                  await handleClockInConfirm()
                  setTimeout(() => {
                    console.log('🔄 Dispatching refresh-tasks event')
                    window.dispatchEvent(new CustomEvent('refresh-tasks'))
                  }, 500)
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
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center" onClick={() => setShowClockOutConfirm(false)}>
          <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-700 shadow-lg max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Clock Out</h2>
            <p className="text-neutral-300 mb-6">Are you sure you want to clock out?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  console.log('🕐 Clock Out dialog cancelled')
                  setShowClockOutConfirm(false)
                }}
                className="px-4 py-2 border border-neutral-600 text-neutral-300 hover:bg-neutral-800 rounded"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  console.log('🕐 Clock Out confirmed')
                  setShowClockOutConfirm(false)
                  await handleClockOutConfirm()
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('refresh-tasks'))
                  }, 500)
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

