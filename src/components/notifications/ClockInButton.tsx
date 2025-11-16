"use client";

import { useState } from 'react'
import { Clock, MapPin } from 'lucide-react'
import { useAttendance } from '@/hooks/useAttendance'
import { useAppContext } from '@/context/AppContext'
import { formatDistanceToNow } from 'date-fns'

export function ClockInButton() {
  const { isClockedIn, currentAttendance, loading, clockIn, clockOut } = useAttendance()
  const { siteId } = useAppContext()
  const [requestingLocation, setRequestingLocation] = useState(false)

  const handleClockIn = async () => {
    if (!siteId) {
      alert('Please select a site first')
      return
    }

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

  const handleClockOut = async () => {
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
    const clockInTime = new Date(currentAttendance.clock_in_at)
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
          onClick={handleClockOut}
          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded transition-colors"
        >
          Clock Out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleClockIn}
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
  )
}

