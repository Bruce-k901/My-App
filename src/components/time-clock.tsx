'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, Play, Square, Coffee, MapPin, Loader2 } from 'lucide-react';
import type { ClockStatus } from '@/types/teamly';

interface TimeClockProps {
  profileId: string;
  siteId?: string | null;
  onStatusChange?: () => void;
}

export function TimeClock({ profileId, siteId, onStatusChange }: TimeClockProps) {
  const [status, setStatus] = useState<ClockStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [profileId]);

  useEffect(() => {
    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Location not available')
      );
    }
  }, []);

  const fetchStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_clock_status', { p_profile_id: profileId });
      if (error) {
        console.error('Error fetching clock status:', error);
        setStatus(null);
      } else {
        const newStatus = data?.[0] || null;
        console.log('🕐 Clock status updated:', newStatus);
        setStatus(newStatus);
      }
    } catch (error) {
      console.error('Exception fetching clock status:', error);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    setAction('in');
    try {
      const { data, error } = await supabase.rpc('clock_in', {
        p_profile_id: profileId,
        p_site_id: siteId,
        p_location: location,
      });
      if (error) {
        console.error('Error clocking in:', error);
        alert(error.message || 'Failed to clock in');
        return;
      }
      await fetchStatus();
      onStatusChange?.();
    } catch (error: any) {
      console.error('Exception clocking in:', error);
      alert(error.message || 'Failed to clock in');
    } finally {
      setAction(null);
    }
  };

  const handleClockOut = async () => {
    setAction('out');
    try {
      const { data, error } = await supabase.rpc('clock_out', {
        p_profile_id: profileId,
        p_location: location,
      });
      if (error) {
        console.error('Error clocking out:', error);
        alert(error.message || 'Failed to clock out');
        return;
      }
      await fetchStatus();
      onStatusChange?.();
    } catch (error: any) {
      console.error('Exception clocking out:', error);
      alert(error.message || 'Failed to clock out');
    } finally {
      setAction(null);
    }
  };

  const handleStartBreak = async () => {
    setAction('break_start');
    try {
      const { data, error } = await supabase.rpc('start_break', { p_profile_id: profileId });
      if (error) {
        console.error('Error starting break:', error);
        alert(error.message || 'Failed to start break');
        return;
      }
      // data is a boolean - true means break was started successfully
      if (data === false) {
        alert('Failed to start break - no active shift found or break already started');
        return;
      }
      await fetchStatus();
      onStatusChange?.();
    } catch (error: any) {
      console.error('Exception starting break:', error);
      alert(error.message || 'Failed to start break');
    } finally {
      setAction(null);
    }
  };

  const handleEndBreak = async () => {
    setAction('break_end');
    try {
      const { data, error } = await supabase.rpc('end_break', { p_profile_id: profileId });
      if (error) {
        console.error('Error ending break:', error);
        alert(error.message || 'Failed to end break');
        return;
      }
      // data is a boolean - true means break was ended successfully
      if (data === false) {
        alert('Failed to end break - no active break found');
        return;
      }
      await fetchStatus();
      onStatusChange?.();
    } catch (error: any) {
      console.error('Exception ending break:', error);
      alert(error.message || 'Failed to end break');
    } finally {
      setAction(null);
    }
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getElapsedTime = () => {
    if (!status?.clock_in_time) return '0h 0m';
    const start = new Date(status.clock_in_time);
    const elapsed = (currentTime.getTime() - start.getTime()) / 1000 / 3600;
    return formatDuration(elapsed);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-6 animate-pulse shadow-sm dark:shadow-none">
        <div className="h-24" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-6 shadow-sm dark:shadow-none">
      {/* Current Time */}
      <div className="text-center mb-6">
        <p className="text-4xl font-bold text-gray-900 dark:text-white font-mono">
          {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-gray-500 dark:text-white/60 text-sm">
          {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Status Display */}
      {status?.is_clocked_in && (
        <div className="bg-gray-100 dark:bg-white/[0.05] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 dark:text-white/60 text-sm">Time worked</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{getElapsedTime()}</span>
          </div>

          {status.break_minutes > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-white/60">Break taken</span>
              <span className="text-gray-700 dark:text-white/80">{status.break_minutes} min</span>
            </div>
          )}

          {status.is_on_break && (
            <div className="mt-2 px-3 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded text-center text-sm border border-amber-200 dark:border-amber-500/30">
              On break
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {!status?.is_clocked_in ? (
          <button
            onClick={handleClockIn}
            disabled={action === 'in'}
            className="w-full flex items-center justify-center gap-3 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-lg font-medium"
          >
            {action === 'in' ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Play className="w-6 h-6" />
            )}
            Clock In
          </button>
        ) : (
          <>
            {!status.is_on_break ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('☕ Start Break button clicked, status:', status);
                  handleStartBreak();
                }}
                disabled={action === 'break_start'}
                className="w-full flex items-center justify-center gap-3 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                style={{ pointerEvents: action === 'break_start' ? 'none' : 'auto' }}
              >
                {action === 'break_start' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Coffee className="w-5 h-5" />
                )}
                Start Break
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🛑 End Break button clicked, status:', status);
                  handleEndBreak();
                }}
                disabled={action === 'break_end'}
                className="w-full flex items-center justify-center gap-3 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                style={{ pointerEvents: action === 'break_end' ? 'none' : 'auto' }}
              >
                {action === 'break_end' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                End Break
              </button>
            )}
            
            <button
              onClick={handleClockOut}
              disabled={action === 'out' || status.is_on_break}
              className="w-full flex items-center justify-center gap-3 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-lg font-medium"
            >
              {action === 'out' ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Square className="w-6 h-6" />
              )}
              Clock Out
            </button>
          </>
        )}
      </div>

      {/* Location indicator */}
      {location && (
        <div className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-white/50">
          <MapPin className="w-3 h-3" />
          Location tracked
        </div>
      )}
    </div>
  );
}

