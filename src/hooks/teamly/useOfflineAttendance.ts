/**
 * Offline Attendance Hook
 * Handles clock in/out with offline queueing
 */

'use client';

import { useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { queueWrite } from '@/lib/offline/db';
import { toast } from 'sonner';

export function useOfflineAttendance() {
  const { isOnline } = useOnlineStatus();
  const [isProcessing, setIsProcessing] = useState(false);

  async function clockIn(siteId: string): Promise<{
    success: boolean;
    queued?: boolean;
    error?: string;
  }> {
    setIsProcessing(true);

    try {
      const payload = {
        siteId,
        clockInTime: new Date().toISOString()
      };

      if (isOnline) {
        try {
          const response = await fetch('/api/attendance/clock-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
          });

          if (response.ok) {
            const result = await response.json();
            toast.success('Clocked in successfully');
            setIsProcessing(false);
            return { success: true };
          }

          // Server error - queue
          if (response.status >= 500) {
            throw new Error('Server error');
          }

          // Client error
          const error = await response.json();
          toast.error(error.message || 'Failed to clock in');
          setIsProcessing(false);
          return { success: false, error: error.message };

        } catch (networkError) {
          console.warn('[Clock In] Network error, queueing:', networkError);
          // Fall through to queue
        }
      }

      // Queue for sync
      await queueWrite('clock_in', '/api/attendance/clock-in', payload, 'teamly');

      toast.info('Clock-in saved - will sync when online', {
        description: 'Your time will be recorded when connection restores'
      });

      setIsProcessing(false);
      return { success: true, queued: true };

    } catch (error: any) {
      console.error('[Clock In] Error:', error);
      toast.error('Failed to save clock-in');
      setIsProcessing(false);
      return { success: false, error: error.message };
    }
  }

  async function clockOut(shiftNotes?: string): Promise<{
    success: boolean;
    queued?: boolean;
    error?: string;
  }> {
    setIsProcessing(true);

    try {
      const payload = {
        clockOutTime: new Date().toISOString(),
        shiftNotes: shiftNotes || ''
      };

      if (isOnline) {
        try {
          const response = await fetch('/api/attendance/clock-out', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
          });

          if (response.ok) {
            const result = await response.json();
            toast.success('Clocked out successfully');
            setIsProcessing(false);
            return { success: true };
          }

          // Server error - queue
          if (response.status >= 500) {
            throw new Error('Server error');
          }

          // Client error
          const error = await response.json();
          toast.error(error.message || 'Failed to clock out');
          setIsProcessing(false);
          return { success: false, error: error.message };

        } catch (networkError) {
          console.warn('[Clock Out] Network error, queueing:', networkError);
          // Fall through to queue
        }
      }

      // Queue for sync
      await queueWrite('clock_out', '/api/attendance/clock-out', payload, 'teamly');

      toast.info('Clock-out saved - will sync when online', {
        description: 'Your time will be recorded when connection restores'
      });

      setIsProcessing(false);
      return { success: true, queued: true };

    } catch (error: any) {
      console.error('[Clock Out] Error:', error);
      toast.error('Failed to save clock-out');
      setIsProcessing(false);
      return { success: false, error: error.message };
    }
  }

  return {
    clockIn,
    clockOut,
    isProcessing
  };
}
